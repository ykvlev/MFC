import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { EventLogService } from '../events/event-log.service.js';
import { WaitlistService } from './waitlist.service.js';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
    private readonly waitlist: WaitlistService,
  ) {}

  list(user: AuthUser, scope: 'my' | 'all') {
    const where: Prisma.BookingWhereInput = scope === 'my' || user.role !== 'ADMIN' ? { userId: user.id } : {};
    return this.prisma.booking.findMany({
      where,
      include: { period: true, application: { select: { number: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** ТЗ 8.1: блокировка строки периода обязательна. */
  async create(user: AuthUser, applicationId: string, periodId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { type: true, booking: true },
    });
    if (!application) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Заявка не найдена' });
    if (application.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Нет доступа к заявке' });
    }
    if (!application.type.usesBooking) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Тип заявки не требует брони' });
    }
    if (application.booking && application.booking.status !== 'CANCELLED') {
      throw new ConflictException({ code: 'DUPLICATE_BOOKING', message: 'Бронь по заявке уже существует' });
    }

    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ id: string; quota: number; name: string; start_date: Date; end_date: Date; is_open: boolean }>>`
        SELECT id, quota, name, start_date, end_date, is_open
        FROM booking_periods WHERE id = ${periodId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Период не найден' });
      const period = locked[0];
      if (!period.is_open || new Date(period.start_date) <= new Date()) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Период закрыт для записи' });
      }

      // ТЗ 8.1 п.5: нет пересекающихся активных броней у пользователя.
      const overlap = await tx.booking.findFirst({
        where: {
          userId: user.id,
          status: { not: 'CANCELLED' },
          period: { startDate: { lte: period.end_date }, endDate: { gte: period.start_date } },
        },
      });
      if (overlap) {
        throw new ConflictException({ code: 'DUPLICATE_BOOKING', message: 'У вас уже есть бронь на пересекающийся период' });
      }

      const confirmed = await tx.booking.count({ where: { periodId, status: 'CONFIRMED' } });
      const status = confirmed < period.quota ? 'CONFIRMED' : 'WAITLIST';
      const queuePosition = status === 'WAITLIST' ? await this.waitlist.nextQueuePosition(tx, periodId) : null;

      const booking = await tx.booking.create({
        data: { applicationId, periodId, userId: user.id, status, queuePosition },
      });
      await this.events.write(tx, {
        action: 'booking.created',
        applicationId,
        actorId: user.id,
        payload: { periodId, status, queuePosition },
      });
      return booking;
    });
  }

  async cancel(user: AuthUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: { period: true } });
    if (!booking) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Бронь не найдена' });
    if (booking.userId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Нет доступа к брони' });
    }
    if (booking.status === 'CANCELLED') return booking;

    return this.prisma.$transaction(async (tx) => {
      const wasConfirmed = booking.status === 'CONFIRMED';
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), queuePosition: null },
      });
      await this.events.write(tx, { action: 'booking.cancelled', applicationId: booking.applicationId, actorId: user.id });

      if (wasConfirmed) {
        await this.waitlist.promoteNext(tx, booking.periodId, booking.period.name);
      } else if (booking.queuePosition != null) {
        // Убрали из очереди — сдвинуть тех, кто был за ним.
        await tx.booking.updateMany({
          where: { periodId: booking.periodId, status: 'WAITLIST', queuePosition: { gt: booking.queuePosition } },
          data: { queuePosition: { decrement: 1 } },
        });
      }
      return tx.booking.findUniqueOrThrow({ where: { id: bookingId } });
    });
  }
}
