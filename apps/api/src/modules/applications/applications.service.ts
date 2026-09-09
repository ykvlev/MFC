import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  buildFormSchema,
  type AccessRule,
  type ApplicationStatus,
  type FieldsSchema,
  STUDENT_CANCELLABLE,
} from '@edinoe-okno/shared';
import type { Application, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { EventLogService } from '../events/event-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CellsService } from '../cells/cells.service.js';
import { ApplicationNumberService } from './application-number.service.js';
import { ApplicationStateMachine, type TypeFlags } from './application-state.machine.js';
import { RouteEngineService } from './route-engine.service.js';
import type {
  CreateApplicationDto,
  ListQuery,
  PatchApplicationDto,
} from './dto/applications.dto.js';

const DETAIL_INCLUDE = {
  stages: { orderBy: { orderNum: 'asc' } },
  files: true,
  cell: true,
  booking: true,
  type: { include: { routeSteps: { orderBy: { orderNum: 'asc' } } } },
} satisfies Prisma.ApplicationInclude;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
    private readonly cells: CellsService,
    private readonly numbers: ApplicationNumberService,
    private readonly sm: ApplicationStateMachine,
    private readonly routes: RouteEngineService,
  ) {}

  private flagsOf(type: { requiresSignature: boolean; usesCell: boolean; usesBooking: boolean }): TypeFlags {
    return {
      requiresSignature: type.requiresSignature,
      usesCell: type.usesCell,
      usesBooking: type.usesBooking,
    };
  }

  private validateData(fieldsSchema: FieldsSchema, data: unknown): Record<string, unknown> {
    const result = buildFormSchema(fieldsSchema).safeParse(data ?? {});
    if (!result.success) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Проверьте заполнение полей заявки',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data as Record<string, unknown>;
  }

  async getDetail(id: string) {
    const app = await this.prisma.application.findUnique({ where: { id }, include: DETAIL_INCLUDE });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    return app;
  }

  async list(user: AuthUser, query: ListQuery) {
    const where: Prisma.ApplicationWhereInput = {};
    if (query.status) where.status = query.status as ApplicationStatus;
    if (query.typeId) where.typeId = query.typeId;
    if (query.q) where.number = { contains: query.q };

    if (query.scope === 'my' || user.role === 'STUDENT') {
      where.userId = user.id;
    } else if (query.scope === 'queue') {
      if (user.role === 'STAFF') {
        where.stages = { some: { status: 'ACTIVE', approverDepartment: user.department ?? '__none__' } };
      }
    } else if (query.scope === 'all' && user.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Недостаточно прав' });
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: { stages: { orderBy: { orderNum: 'asc' } }, type: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { items, total, page: query.page, limit: query.limit };
  }

  async create(userId: string, dto: CreateApplicationDto): Promise<Application> {
    const type = await this.prisma.applicationType.findUnique({ where: { id: dto.typeId } });
    if (!type || !type.isActive) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Тип заявки не найден' });
    }
    // ТЗ 4.4: проверка доступа для студента.
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.role === 'STUDENT') {
      const { evaluateAccessRule } = await import('../application-types/access-rule.evaluator.js');
      const decision = evaluateAccessRule((type.accessRule as AccessRule | null) ?? null, user);
      if (!decision.allowed) {
        throw new ForbiddenException({ code: 'ACCESS_DENIED', message: decision.denyMessage });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const number = await this.numbers.next(tx);
      const app = await tx.application.create({
        data: {
          number,
          userId,
          typeId: dto.typeId,
          status: 'DRAFT',
          data: (dto.data ?? {}) as Prisma.InputJsonValue,
        },
      });
      await this.events.write(tx, { action: 'application.created', applicationId: app.id, actorId: userId });
      return app;
    });
  }

  async patchData(app: Application, dto: PatchApplicationDto): Promise<Application> {
    if (app.status !== 'DRAFT' && app.status !== 'NEEDS_FIX') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'Данные редактируются только в черновике или на доработке' });
    }
    return this.prisma.application.update({
      where: { id: app.id },
      data: { data: dto.data as Prisma.InputJsonValue },
    });
  }

  async submit(app: Application, actorId: string, ip?: string) {
    this.sm.assert(app.status, 'submit', 'SUBMITTED');
    const type = await this.prisma.applicationType.findUniqueOrThrow({ where: { id: app.typeId } });
    const applicant = await this.prisma.user.findUniqueOrThrow({ where: { id: app.userId } });
    const cleanData = this.validateData(type.fieldsSchema as unknown as FieldsSchema, app.data);

    return this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: app.id },
        data: { data: cleanData as Prisma.InputJsonValue, submittedAt: new Date() },
      });
      await this.events.write(tx, { action: 'application.submitted', applicationId: app.id, actorId, ipAddress: ip });

      const materialized = await this.routes.materialize(tx, {
        applicationId: app.id,
        typeId: app.typeId,
        applicant,
        typeAccessRule: (type.accessRule as AccessRule | null) ?? null,
      });

      if ('rejected' in materialized) {
        await tx.application.update({
          where: { id: app.id },
          data: { status: 'REJECTED', rejectReason: materialized.reason, closedAt: new Date() },
        });
        await this.events.write(tx, { action: 'application.stage_rejected', applicationId: app.id, payload: { auto: true } });
        await this.notifications.createInApp(tx, {
          userId: app.userId,
          applicationId: app.id,
          title: `Заявка №${app.number} отклонена`,
          body: materialized.reason,
        });
        return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
      }

      const activeStageId = materialized.activeStageId;
      await tx.application.update({
        where: { id: app.id },
        data: { status: 'IN_REVIEW', currentStageId: activeStageId },
      });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: app.id,
        title: `Заявка №${app.number} принята`,
        body: 'Заявка принята и передана на согласование',
      });
      if (activeStageId) {
        const stage = await tx.applicationStage.findUniqueOrThrow({ where: { id: activeStageId } });
        await this.notifications.notifyDepartment(tx, stage.approverDepartment, {
          applicationId: app.id,
          title: `Новая заявка №${app.number} ожидает вашего согласования`,
          body: `Этап «${stage.name}»`,
        });
      }
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  async resubmit(app: Application, actorId: string) {
    this.sm.assert(app.status, 'resubmit', 'IN_REVIEW');
    return this.prisma.$transaction(async (tx) => {
      const returned = await tx.applicationStage.findFirst({
        where: { applicationId: app.id, status: 'RETURNED' },
      });
      if (returned) {
        await tx.applicationStage.update({
          where: { id: returned.id },
          data: { status: 'ACTIVE', comment: null, actedAt: null },
        });
      }
      await tx.application.update({
        where: { id: app.id },
        data: { status: 'IN_REVIEW', currentStageId: returned?.id ?? app.currentStageId, rejectReason: null },
      });
      await this.events.write(tx, { action: 'application.resubmitted', applicationId: app.id, actorId });
      if (returned) {
        await this.notifications.notifyDepartment(tx, returned.approverDepartment, {
          applicationId: app.id,
          title: `Заявка №${app.number} снова на согласовании`,
          body: `Этап «${returned.name}» после доработки`,
        });
      }
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  async cancel(app: Application, user: AuthUser, reason?: string) {
    if (user.role === 'STUDENT' && !STUDENT_CANCELLABLE.includes(app.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'Заявку уже нельзя отменить' });
    }
    this.sm.assert(app.status, 'cancel', 'CANCELLED');
    return this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: app.id },
        data: { status: 'CANCELLED', closedAt: new Date(), rejectReason: reason ?? null },
      });
      await this.events.write(tx, { action: 'application.cancelled', applicationId: app.id, actorId: user.id, payload: { reason } });
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  private async loadActiveStageFor(appId: string, stageId: string, user: AuthUser) {
    const stage = await this.prisma.applicationStage.findFirst({
      where: { id: stageId, applicationId: appId },
    });
    if (!stage) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Этап не найден' });
    if (stage.status !== 'ACTIVE') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'Этап не активен' });
    }
    if (user.role !== 'ADMIN' && stage.approverDepartment !== user.department) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Этот этап согласует другое подразделение' });
    }
    return stage;
  }

  async approveStage(app: Application, stageId: string, user: AuthUser, comment?: string) {
    const stage = await this.loadActiveStageFor(app.id, stageId, user);
    const type = await this.prisma.applicationType.findUniqueOrThrow({ where: { id: app.typeId } });
    const allStages = await this.prisma.applicationStage.findMany({ where: { applicationId: app.id } });
    const isLast = this.routes.isLastLiveStage(allStages, stage.orderNum, type.requiresSignature);
    const intent = this.sm.resolveApproval(this.flagsOf(type), isLast);

    return this.prisma.$transaction(async (tx) => {
      await tx.applicationStage.update({
        where: { id: stage.id },
        data: { status: 'APPROVED', approvedById: user.id, comment: comment ?? null, actedAt: new Date() },
      });
      await this.events.write(tx, {
        action: 'application.stage_approved',
        applicationId: app.id,
        actorId: user.id,
        payload: { stage: stage.name },
      });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: app.id,
        title: `Заявка №${app.number}: этап «${stage.name}» пройден`,
        body: 'Этап согласования пройден',
      });

      if (intent.kind === 'NEXT_STAGE') {
        const next = allStages
          .filter((s) => s.orderNum > stage.orderNum && s.status === 'PENDING')
          .sort((a, b) => a.orderNum - b.orderNum)[0];
        if (next) {
          await tx.applicationStage.update({ where: { id: next.id }, data: { status: 'ACTIVE' } });
          await tx.application.update({ where: { id: app.id }, data: { currentStageId: next.id } });
          await this.notifications.notifyDepartment(tx, next.approverDepartment, {
            applicationId: app.id,
            title: `Новая заявка №${app.number} ожидает вашего согласования`,
            body: `Этап «${next.name}»`,
          });
        }
      } else if (intent.kind === 'AWAIT_SIGNATURE') {
        await tx.application.update({ where: { id: app.id }, data: { status: 'AWAITING_SIGNATURE' } });
        await this.notifications.createInApp(tx, {
          userId: app.userId,
          applicationId: app.id,
          title: `Требуется подпись по заявке №${app.number}`,
          body: 'Распечатайте заявление, подпишите у заведующего и загрузите скан',
        });
      } else if (intent.kind === 'ASSIGN_CELL') {
        await this.finalizeWithCell(tx, app);
      } else {
        await this.close(tx, app);
      }
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  private async finalizeWithCell(
    tx: Prisma.TransactionClient,
    app: Pick<Application, 'id' | 'number' | 'userId'>,
  ): Promise<void> {
    await tx.application.update({ where: { id: app.id }, data: { status: 'APPROVED' } });
    const res = await this.cells.assignForApplication(tx, { id: app.id, number: app.number, userId: app.userId });
    if (res.assigned) {
      await tx.application.update({ where: { id: app.id }, data: { status: 'READY' } });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: app.id,
        title: `Документ по заявке №${app.number} готов`,
        body: `Ячейка ${res.cellCode}, код ${res.pickupCode}. Хранится до ${res.expiresAt?.toLocaleDateString('ru-RU')}`,
      });
    }
  }

  private async close(
    tx: Prisma.TransactionClient,
    app: Pick<Application, 'id' | 'number' | 'userId'>,
  ): Promise<void> {
    await tx.application.update({ where: { id: app.id }, data: { status: 'ISSUED', closedAt: new Date() } });
    await this.notifications.createInApp(tx, {
      userId: app.userId,
      applicationId: app.id,
      title: `Заявка №${app.number} закрыта`,
      body: 'Решение зафиксировано в системе',
    });
  }

  /** ТЗ 9 п.7: сотрудник проверил подписанный скан и подтверждает. */
  async confirmSignature(app: Application, user: AuthUser) {
    if (app.status !== 'AWAITING_SIGNATURE') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'Заявка не ожидает подпись' });
    }
    const scan = await this.prisma.file.findFirst({ where: { applicationId: app.id, kind: 'SIGNED_SCAN' } });
    if (!scan) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Подписанный скан не загружен' });
    }
    const stages = await this.prisma.applicationStage.findMany({ where: { applicationId: app.id } });
    const sigOrder = this.routes.signatureStageOrderNum(stages);
    const sigStage = stages.find((s) => s.orderNum === sigOrder);
    if (sigStage && user.role !== 'ADMIN' && sigStage.approverDepartment !== user.department) {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Подтверждает другое подразделение' });
    }
    const type = await this.prisma.applicationType.findUniqueOrThrow({ where: { id: app.typeId } });

    return this.prisma.$transaction(async (tx) => {
      if (sigStage) {
        await tx.applicationStage.update({
          where: { id: sigStage.id },
          data: { status: 'APPROVED', approvedById: user.id, actedAt: new Date(), comment: 'Скан проверен' },
        });
      }
      this.sm.assert('AWAITING_SIGNATURE', 'uploadSignedScan', 'APPROVED');
      await this.events.write(tx, {
        action: 'application.stage_approved',
        applicationId: app.id,
        actorId: user.id,
        payload: { stage: sigStage?.name ?? 'подпись' },
      });
      if (type.usesCell) {
        await this.finalizeWithCell(tx, app);
      } else {
        await this.close(tx, app);
      }
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  async returnStage(app: Application, stageId: string, user: AuthUser, comment: string) {
    const stage = await this.loadActiveStageFor(app.id, stageId, user);
    return this.prisma.$transaction(async (tx) => {
      await tx.applicationStage.update({
        where: { id: stage.id },
        data: { status: 'RETURNED', approvedById: user.id, comment, actedAt: new Date() },
      });
      await tx.application.update({ where: { id: app.id }, data: { status: 'NEEDS_FIX' } });
      await this.events.write(tx, {
        action: 'application.stage_returned',
        applicationId: app.id,
        actorId: user.id,
        payload: { stage: stage.name, comment },
      });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: app.id,
        title: `Заявка №${app.number} возвращена на доработку`,
        body: comment,
      });
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  async rejectStage(app: Application, stageId: string, user: AuthUser, comment: string) {
    const stage = await this.loadActiveStageFor(app.id, stageId, user);
    return this.prisma.$transaction(async (tx) => {
      await tx.applicationStage.update({
        where: { id: stage.id },
        data: { status: 'REJECTED', approvedById: user.id, comment, actedAt: new Date() },
      });
      await tx.application.update({
        where: { id: app.id },
        data: { status: 'REJECTED', rejectReason: comment, closedAt: new Date() },
      });
      await this.events.write(tx, {
        action: 'application.stage_rejected',
        applicationId: app.id,
        actorId: user.id,
        payload: { stage: stage.name, comment },
      });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: app.id,
        title: `Заявка №${app.number} отклонена`,
        body: comment,
      });
      return tx.application.findUniqueOrThrow({ where: { id: app.id }, include: DETAIL_INCLUDE });
    });
  }

  history(appId: string) {
    return this.events.listForApplication(appId);
  }
}
