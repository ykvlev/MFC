import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EventLogService } from '../events/event-log.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

type Tx = Prisma.TransactionClient;

export interface PromotionResult {
  promotedBookingId: string | null;
  promotedUserId: string | null;
}

/**
 * Лист ожидания (ТЗ 8.1 п.4).
 * После отмены CONFIRMED-брони: первый из WAITLIST по queue_position -> CONFIRMED,
 * queue_position всех остальных уменьшается на 1.
 */
@Injectable()
export class WaitlistService {
  constructor(
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async promoteNext(tx: Tx, periodId: string, periodName: string): Promise<PromotionResult> {
    const waitlist = await tx.booking.findMany({
      where: { periodId, status: 'WAITLIST' },
      orderBy: { queuePosition: 'asc' },
    });
    if (waitlist.length === 0) return { promotedBookingId: null, promotedUserId: null };

    const [first, ...rest] = waitlist;
    await tx.booking.update({
      where: { id: first.id },
      data: { status: 'CONFIRMED', queuePosition: null },
    });
    for (const b of rest) {
      await tx.booking.update({
        where: { id: b.id },
        data: { queuePosition: (b.queuePosition ?? 1) - 1 },
      });
    }

    await this.events.write(tx, {
      action: 'booking.promoted',
      applicationId: first.applicationId,
      payload: { periodId, from: first.queuePosition, to: 'CONFIRMED' },
    });
    await this.notifications.createInApp(tx, {
      userId: first.userId,
      applicationId: first.applicationId,
      title: `Освободилось место в заезде «${periodName}»`,
      body: 'Ваша бронь подтверждена',
    });

    return { promotedBookingId: first.id, promotedUserId: first.userId };
  }

  /** Позиция для новой WAITLIST-брони. */
  async nextQueuePosition(tx: Tx, periodId: string): Promise<number> {
    const agg = await tx.booking.aggregate({
      where: { periodId, status: 'WAITLIST' },
      _max: { queuePosition: true },
    });
    return (agg._max.queuePosition ?? 0) + 1;
  }
}
