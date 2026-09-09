import { Global, Module } from '@nestjs/common';
import { PushChannel } from './channels/push.channel.js';
import { DevicesController } from './devices.controller.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Global()
@Module({
  controllers: [NotificationsController, DevicesController],
  providers: [NotificationsService, PushChannel],
  exports: [NotificationsService, PushChannel],
})
export class NotificationsModule {}
