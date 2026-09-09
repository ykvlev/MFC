import { Module } from '@nestjs/common';
import { ApplicationTypesController } from './application-types.controller.js';
import { ApplicationTypesService } from './application-types.service.js';

@Module({
  controllers: [ApplicationTypesController],
  providers: [ApplicationTypesService],
  exports: [ApplicationTypesService],
})
export class ApplicationTypesModule {}
