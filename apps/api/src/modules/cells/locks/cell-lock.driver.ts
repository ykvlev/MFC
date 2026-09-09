export const CELL_LOCK_DRIVER = Symbol('CELL_LOCK_DRIVER');

/** ТЗ 7.2: задел под электронные замки. */
export interface CellLockDriver {
  open(cellCode: string): Promise<void>;
  getState(cellCode: string): Promise<'OPEN' | 'CLOSED' | 'UNKNOWN'>;
  isAvailable(): boolean;
}
