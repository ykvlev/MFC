import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** ТЗ 10: «Просрочен SLA» — напоминание сотрудникам подразделения. */
@Injectable()
export class SlaReminderJob {
  private readonly logger = new Logger(SlaReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async run(): Promise<void> {
    const overdue = await this.prisma.applicationStage.findMany({
      where: { status: 'ACTIVE', dueAt: { lt: new Date() } },
      include: { application: { select: { id: true, number: true } } },
    });
    if (overdue.length === 0) return;
    this.logger.log(`Просрочен SLA по этапам: ${overdue.length}`);

    for (const stage of overdue) {
      await this.notifications.notifyDepartment(this.prisma, stage.approverDepartment, {
        applicationId: stage.application.id,
        title: `Заявка №${stage.application.number} ожидает решения дольше норматива`,
        body: `Этап «${stage.name}» просрочен`,
      });
    }
  }
}
