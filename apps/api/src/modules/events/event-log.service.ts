import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface LogInput {
  action: string;
  applicationId?: string | null;
  actorId?: string | null;
  payload?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/**
 * Журнал событий (ТЗ 4.2 `event_log`). Записи неизменяемы.
 * `write` принимает транзакционный клиент — переход статуса заявки и запись
 * в журнал должны быть в одной транзакции (ТЗ 6.6).
 */
@Injectable()
export class EventLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: LogInput): Promise<void> {
    await this.write(this.prisma, input);
  }

  async write(
    tx: Prisma.TransactionClient | PrismaService,
    input: LogInput,
  ): Promise<void> {
    await tx.eventLog.create({
      data: {
        action: input.action,
        applicationId: input.applicationId ?? null,
        actorId: input.actorId ?? null,
        payload: input.payload ?? {},
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  async listForApplication(applicationId: string) {
    return this.prisma.eventLog.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
