import { Injectable } from '@nestjs/common';
import type { AnnouncementScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { EventLogService } from '../events/event-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  scope: AnnouncementScope;
  value?: string;
}

/**
 * Объявления деканата (расширение сверх ТЗ).
 * Публикация рассылает уведомление каждому адресату — канал IN_APP + PUSH
 * (тот же путь, что и уведомления по заявкам, ТЗ §10).
 */
@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
  ) {}

  private audienceWhere(scope: AnnouncementScope, value?: string | null): Prisma.UserWhereInput {
    const base: Prisma.UserWhereInput = { role: 'STUDENT', isActive: true };
    if (scope === 'COURSE') return { ...base, course: Number(value) };
    if (scope === 'GROUP') return { ...base, groupName: value ?? '__none__' };
    return base;
  }

  async list() {
    const rows = await this.prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { author: { select: { fullName: true } } },
    });
    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      audience: { scope: a.scope, value: a.value },
      createdAt: a.createdAt,
      authorName: a.author.fullName,
      recipients: a.recipients,
    }));
  }

  async create(actor: AuthUser, input: CreateAnnouncementInput) {
    const where = this.audienceWhere(input.scope, input.value);
    const recipients = await this.prisma.user.findMany({ where, select: { id: true } });

    const announcement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          authorId: actor.id,
          title: input.title,
          body: input.body,
          scope: input.scope,
          value: input.scope === 'ALL' ? null : (input.value ?? null),
          recipients: recipients.length,
        },
      });
      for (const r of recipients) {
        await this.notifications.createInApp(tx, {
          userId: r.id,
          title: input.title,
          body: input.body,
        });
      }
      await this.events.write(tx, {
        action: 'announcement.published',
        actorId: actor.id,
        payload: { id: created.id, scope: input.scope, value: input.value ?? null, recipients: recipients.length },
      });
      return created;
    });

    return { ...announcement, recipients: recipients.length };
  }
}
