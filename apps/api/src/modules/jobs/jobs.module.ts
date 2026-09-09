import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ExpiredCellsJob } from './expired-cells.job.js';
import { SlaReminderJob } from './sla-reminder.job.js';

// TZ-GAP: cron через @nestjs/schedule вместо BullMQ (ТЗ 2.1) — чтобы приложение
// поднималось без Redis. Очередь email-ретраев на BullMQ добавится с email-каналом.
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ExpiredCellsJob, SlaReminderJob],
})
export class JobsModule {}
