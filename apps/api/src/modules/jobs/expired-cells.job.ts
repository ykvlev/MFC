import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventLogService } from '../events/event-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/**
 * ТЗ 7.1 п.7: раз в сутки помечает просроченные ячейки и уведомляет
 * студента и администратора. Ячейку автоматически НЕ освобождает.
 */
@Injectable()
export class ExpiredCellsJob {
  private readonly logger = new Logger(ExpiredCellsJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async run(): Promise<void> {
    const expired = await this.prisma.cell.findMany({
      where: { status: 'OCCUPIED', expiresAt: { lt: new Date() } },
      include: { application: { include: { user: true } } },
    });
    if (expired.length === 0) return;
    this.logger.log(`Просрочено ячеек: ${expired.length}`);

    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });

    for (const cell of expired) {
      if (!cell.application) continue;
      await this.events.log({ action: 'cell.expired', applicationId: cell.application.id, payload: { cell: cell.code } });
      await this.notifications.createInApp(this.prisma, {
        userId: cell.application.userId,
        applicationId: cell.application.id,
        title: `Документ по заявке №${cell.application.number} не забран в срок`,
        body: `Ячейка ${cell.code}. Обратитесь в канцелярию.`,
      });
      for (const a of admins) {
        await this.notifications.createInApp(this.prisma, {
          userId: a.id,
          applicationId: cell.application.id,
          title: `Просрочена ячейка ${cell.code}`,
          body: `Заявка №${cell.application.number} не забрана в срок`,
        });
      }
    }
  }
}
