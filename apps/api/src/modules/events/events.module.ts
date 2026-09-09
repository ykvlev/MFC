import { Global, Module } from '@nestjs/common';
import { EventLogService } from './event-log.service.js';

@Global()
@Module({
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventsModule {}
