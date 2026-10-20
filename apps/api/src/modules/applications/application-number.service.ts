import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

/**
 * Человекочитаемый номер `2026-000123` (ТЗ 4.2).
 * Счётчик — по году, под транзакционной advisory-блокировкой PostgreSQL.
 */
@Injectable()
export class ApplicationNumberService {
  async next(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(182736, ${year}::integer)`;
    const prefix = `${year}-`;
    const last = await tx.application.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: 'desc' },
      select: { number: true },
    });
    const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }
}
