import { Module } from '@nestjs/common';
import { CellsController } from './cells.controller.js';
import { CellsService } from './cells.service.js';
import { CELL_LOCK_DRIVER } from './locks/cell-lock.driver.js';
import { ManualLockDriver } from './locks/manual-lock.driver.js';

@Module({
  controllers: [CellsController],
  providers: [
    CellsService,
    // ТЗ 7.2: замена реализации замка не затрагивает cells.service.ts.
    { provide: CELL_LOCK_DRIVER, useClass: ManualLockDriver },
  ],
  exports: [CellsService],
})
export class CellsModule {}
