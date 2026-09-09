import { Module } from '@nestjs/common';
import { CellsModule } from '../cells/cells.module.js';
import { ApplicationNumberService } from './application-number.service.js';
import { ApplicationStateMachine } from './application-state.machine.js';
import { ApplicationsController } from './applications.controller.js';
import { ApplicationsService } from './applications.service.js';
import { RouteEngineService } from './route-engine.service.js';

@Module({
  imports: [CellsModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationNumberService,
    ApplicationStateMachine,
    RouteEngineService,
  ],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
