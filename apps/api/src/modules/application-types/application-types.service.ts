import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AccessRule, FieldsSchema } from '@edinoe-okno/shared';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventLogService } from '../events/event-log.service.js';
import { evaluateAccessRule, type EvaluableUser } from './access-rule.evaluator.js';
import type { CreateTypeDto, ReplaceRouteDto, UpdateTypeDto } from './dto/application-types.dto.js';

@Injectable()
export class ApplicationTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
  ) {}

  /** ТЗ 11.2: список доступных пользователю типов с флагом available + denyMessage. */
  async listForUser(user: EvaluableUser) {
    const types = await this.prisma.applicationType.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { routeSteps: { orderBy: { orderNum: 'asc' } } },
    });
    return types.map((t) => {
      const decision =
        user.role === 'STUDENT'
          ? evaluateAccessRule((t.accessRule as AccessRule | null) ?? null, user)
          : { allowed: true as const };
      return {
        ...t,
        available: decision.allowed,
        denyMessage: decision.allowed ? null : decision.denyMessage,
      };
    });
  }

  async getById(id: string) {
    const type = await this.prisma.applicationType.findUnique({
      where: { id },
      include: { routeSteps: { orderBy: { orderNum: 'asc' } } },
    });
    if (!type) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Тип заявки не найден' });
    return type;
  }

  async create(dto: CreateTypeDto, actorId: string) {
    const exists = await this.prisma.applicationType.findUnique({ where: { code: dto.code } });
    if (exists) throw new ConflictException({ code: 'VALIDATION_ERROR', message: 'Код типа уже занят' });

    const type = await this.prisma.applicationType.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        fieldsSchema: dto.fieldsSchema as unknown as Prisma.InputJsonValue,
        accessRule: (dto.accessRule ?? undefined) as unknown as Prisma.InputJsonValue,
        requiresSignature: dto.requiresSignature ?? false,
        usesCell: dto.usesCell ?? false,
        usesBooking: dto.usesBooking ?? false,
        documentTemplate: dto.documentTemplate,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.events.log({ action: 'type.created', actorId, payload: { code: dto.code } });
    return type;
  }

  async update(id: string, dto: UpdateTypeDto, actorId: string) {
    await this.getById(id);
    const type = await this.prisma.applicationType.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        icon: dto.icon,
        fieldsSchema: dto.fieldsSchema
          ? (dto.fieldsSchema as unknown as Prisma.InputJsonValue)
          : undefined,
        accessRule:
          dto.accessRule === undefined
            ? undefined
            : ((dto.accessRule ?? null) as unknown as Prisma.InputJsonValue),
        requiresSignature: dto.requiresSignature,
        usesCell: dto.usesCell,
        usesBooking: dto.usesBooking,
        documentTemplate: dto.documentTemplate,
        sortOrder: dto.sortOrder,
      },
    });
    await this.events.log({ action: 'type.updated', actorId, payload: { id } });
    return type;
  }

  async softDelete(id: string) {
    await this.getById(id);
    return this.prisma.applicationType.update({ where: { id }, data: { isActive: false } });
  }

  /** ТЗ 11.2: заменить маршрут целиком. Не затрагивает уже поданные заявки (копии в stages). */
  async replaceRoute(id: string, dto: ReplaceRouteDto, actorId: string) {
    await this.getById(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.routeStep.deleteMany({ where: { typeId: id } });
      await tx.routeStep.createMany({
        data: dto.steps.map((s, i) => ({
          typeId: id,
          orderNum: i + 1,
          name: s.name,
          approverDepartment: s.approverDepartment,
          isAuto: s.isAuto ?? false,
          isOptional: s.isOptional ?? false,
          slaDays: s.slaDays ?? null,
          parallelGroup: s.parallelGroup ?? null,
        })),
      });
      await this.events.write(tx, { action: 'route.updated', actorId, payload: { typeId: id, steps: dto.steps.length } });
    });
    return this.getById(id);
  }

  /** Используется движком (этап 3) и эндпоинтом создания заявки. */
  fieldsSchemaOf(fieldsJson: unknown): FieldsSchema {
    return fieldsJson as FieldsSchema;
  }
}
