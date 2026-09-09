import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomInt } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { AppConfig } from '../../config/configuration.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { EventLogService } from '../events/event-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CELL_LOCK_DRIVER, type CellLockDriver } from './locks/cell-lock.driver.js';

type Tx = Prisma.TransactionClient;

export interface CellAssignResult {
  assigned: boolean;
  cellCode?: string;
  pickupCode?: string;
  expiresAt?: Date;
}

@Injectable()
export class CellsService {
  private readonly logger = new Logger(CellsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
    @Inject(CELL_LOCK_DRIVER) private readonly lock: CellLockDriver,
  ) {}

  /**
   * ТЗ 7.1: ищет свободную ячейку `SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1`.
   * Вызывается в транзакции перехода заявки в APPROVED.
   */
  async assignForApplication(
    tx: Tx,
    application: { id: string; number: string; userId: string },
  ): Promise<CellAssignResult> {
    const rows = await tx.$queryRaw<Array<{ id: string; code: string }>>`
      SELECT id, code FROM cells
      WHERE status = 'FREE'
      ORDER BY code
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `;
    if (rows.length === 0) {
      await this.notifications.notifyDepartment(tx, 'Канцелярия', {
        applicationId: application.id,
        title: `Нет свободных ячеек для заявки №${application.number}`,
        body: 'Заявка ожидает освобождения ячейки.',
      });
      await this.events.write(tx, {
        action: 'cell.assigned',
        applicationId: application.id,
        payload: { result: 'no_free_cells' },
      });
      return { assigned: false };
    }

    const cell = rows[0];
    const ttlDays = this.config.get('cellTtlDays', { infer: true });
    const pickupCode = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await tx.cell.update({
      where: { id: cell.id },
      data: {
        status: 'OCCUPIED',
        applicationId: application.id,
        pickupCode,
        occupiedAt: new Date(),
        expiresAt,
      },
    });
    await this.events.write(tx, {
      action: 'cell.assigned',
      applicationId: application.id,
      payload: { cell: cell.code },
    });
    return { assigned: true, cellCode: cell.code, pickupCode, expiresAt };
  }

  /** ТЗ 7.1 п.6: подтверждение выдачи. */
  async issue(cellId: string, actorId: string) {
    const cell = await this.prisma.cell.findUnique({ where: { id: cellId } });
    if (!cell || !cell.applicationId) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Ячейка свободна или не найдена' });
    }
    const appId = cell.applicationId;
    return this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id: appId },
        data: { status: 'ISSUED', closedAt: new Date() },
      });
      await tx.cell.update({
        where: { id: cellId },
        data: {
          status: 'FREE',
          applicationId: null,
          pickupCode: null,
          occupiedAt: null,
          expiresAt: null,
        },
      });
      await this.events.write(tx, { action: 'cell.issued', applicationId: appId, actorId, payload: { cell: cell.code } });
      const app = await tx.application.findUniqueOrThrow({ where: { id: appId } });
      await this.notifications.createInApp(tx, {
        userId: app.userId,
        applicationId: appId,
        title: `Заявка №${app.number} закрыта`,
        body: `Документ выдан. Ячейка ${cell.code} освобождена.`,
      });
      return tx.cell.findUniqueOrThrow({ where: { id: cellId } });
    });
  }

  async openLock(cellId: string, actorId: string): Promise<void> {
    const cell = await this.prisma.cell.findUniqueOrThrow({ where: { id: cellId } });
    await this.lock.open(cell.code);
    await this.events.log({ action: 'cell.assigned', actorId, payload: { cell: cell.code, op: 'open_lock' } });
  }

  list(status?: string) {
    return this.prisma.cell.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { code: 'asc' },
    });
  }
}
