import { Injectable, Logger } from '@nestjs/common';
import type { CellLockDriver } from './cell-lock.driver.js';

/** ТЗ 7.2: MVP-реализация. `open()` только логирует, состояние неизвестно. */
@Injectable()
export class ManualLockDriver implements CellLockDriver {
  private readonly logger = new Logger(ManualLockDriver.name);

  async open(cellCode: string): Promise<void> {
    this.logger.log(`Ручной режим: откройте ячейку ${cellCode} физически`);
  }

  async getState(): Promise<'UNKNOWN'> {
    return 'UNKNOWN';
  }

  isAvailable(): boolean {
    return false;
  }
}
