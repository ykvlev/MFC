import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { EventLogService } from '../events/event-log.service.js';
import { FilesService } from '../files/files.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PdfRendererService } from './pdf-renderer.service.js';

function fmtValue(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('from' in o && 'to' in o) return `${String(o.from)} — ${String(o.to)}`;
    return JSON.stringify(v);
  }
  return String(v);
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly renderer: PdfRendererService,
    private readonly files: FilesService,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
  ) {}

  /** ТЗ 9: рендер PDF из шаблона типа и сохранение как GENERATED_DOCUMENT. */
  async generate(applicationId: string, actor: AuthUser) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { type: true, user: true, stages: { orderBy: { orderNum: 'asc' } } },
    });
    if (!app) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    if (!app.type.documentTemplate) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'У типа не задан шаблон документа' });
    }

    const data = (app.data ?? {}) as Record<string, unknown>;
    const values: Record<string, string> = {
      full_name: app.user.fullName,
      group_name: app.user.groupName ?? '',
      course: app.user.course ? String(app.user.course) : '',
      student_card_no: app.user.studentCardNo ?? '',
      application_number: app.number,
      created_at: app.createdAt.toLocaleDateString('ru-RU'),
    };
    for (const [k, v] of Object.entries(data)) values[`data.${k}`] = fmtValue(v);

    const approvals = app.stages
      .filter((s) => s.status === 'APPROVED')
      .map((s) => `${s.name} — ${s.actedAt?.toLocaleDateString('ru-RU') ?? ''}`);

    const pdf = await this.renderer.render(app.type.documentTemplate, values, approvals);
    const file = await this.files.upload(app, actor, {
      buffer: pdf,
      originalName: `Заявление_${app.number}.pdf`,
      kind: 'GENERATED_DOCUMENT',
    });

    await this.events.log({
      action: 'application.document_generated',
      applicationId: app.id,
      actorId: actor.id,
      payload: { fileId: file.id },
    });
    await this.notifications.createInApp(this.prisma, {
      userId: app.userId,
      applicationId: app.id,
      title: `Документ по заявке №${app.number} готов к печати`,
      body: 'Скачайте PDF, распечатайте и подпишите у заведующего',
    });
    return file;
  }

  async latest(applicationId: string) {
    const file = await this.prisma.file.findFirst({
      where: { applicationId, kind: 'GENERATED_DOCUMENT' },
      orderBy: { createdAt: 'desc' },
    });
    if (!file) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Документ ещё не сгенерирован' });
    const app = await this.prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    return this.files.getForDownload(app, file.id);
  }
}
