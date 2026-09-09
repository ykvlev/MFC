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
import { NotificationsService } from '../notifications/notifications.service.js';
import { buildSlots, withAvailability } from './slot-grid.js';

export interface CreateWindowInput {
  title: string;
  location?: string;
  date: string;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  capacity: number;
}

/**
 * Модуль слотов — запись на приём (расширение сверх ТЗ, задел из §1.2).
 * Сотрудник/преподаватель публикует приёмное окно, оно разбивается на слоты,
 * студент бронирует один слот. Квота на слот защищена блокировкой строки окна.
 */
@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventLogService,
    private readonly notifications: NotificationsService,
  ) {}

  async listWindows(user: AuthUser, scope: 'mine' | 'available') {
    const where: Prisma.SlotWindowWhereInput =
      scope === 'mine' ? { ownerId: user.id } : { isOpen: true, date: { gte: startOfToday() } };

    const windows = await this.prisma.slotWindow.findMany({
      where,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        owner: { select: { fullName: true, department: true } },
        bookings: { where: { status: 'BOOKED' }, select: { id: true } },
      },
    });

    return windows.map((w) => ({
      id: w.id,
      title: w.title,
      location: w.location,
      date: w.date,
      startTime: w.startTime,
      endTime: w.endTime,
      slotMinutes: w.slotMinutes,
      capacity: w.capacity,
      isOpen: w.isOpen,
      booked: w.bookings.length,
      ownerName: w.owner.fullName,
      ownerDepartment: w.owner.department,
    }));
  }

  async createWindow(user: AuthUser, input: CreateWindowInput) {
    const slots = buildSlots(input.startTime, input.endTime, input.slotMinutes);
    if (slots.length === 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Некорректный интервал: проверьте время начала, окончания и длину слота',
      });
    }
    const window = await this.prisma.slotWindow.create({
      data: {
        ownerId: user.id,
        title: input.title,
        location: input.location ?? null,
        date: new Date(input.date),
        startTime: input.startTime,
        endTime: input.endTime,
        slotMinutes: input.slotMinutes,
        capacity: input.capacity,
      },
    });
    await this.events.log({
      action: 'slot_window.created',
      actorId: user.id,
      payload: { id: window.id, slots: slots.length },
    });
    return window;
  }

  async slotsOf(windowId: string) {
    const window = await this.prisma.slotWindow.findUnique({ where: { id: windowId } });
    if (!window) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Приёмное окно не найдено' });

    const counts = await this.prisma.slotBooking.groupBy({
      by: ['slotStart'],
      where: { windowId, status: 'BOOKED' },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.slotStart, c._count]));
    const slots = buildSlots(window.startTime, window.endTime, window.slotMinutes);
    return { window, slots: withAvailability(slots, window.capacity, map) };
  }

  /** Бронирование слота: блокировка строки окна защищает вместимость слота. */
  async book(user: AuthUser, windowId: string, slotStart: string, comment?: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        Array<{ id: string; capacity: number; is_open: boolean; start_time: string; end_time: string; slot_minutes: number; title: string; owner_id: string }>
      >`
        SELECT id, capacity, is_open, start_time, end_time, slot_minutes, title, owner_id
        FROM slot_windows WHERE id = ${windowId}::uuid FOR UPDATE
      `;
      if (locked.length === 0) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Приёмное окно не найдено' });
      const w = locked[0];
      if (!w.is_open) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Запись на это окно закрыта' });
      }

      const valid = buildSlots(w.start_time, w.end_time, w.slot_minutes);
      if (!valid.includes(slotStart)) {
        throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Такого слота нет в этом окне' });
      }

      const mine = await tx.slotBooking.findFirst({
        where: { windowId, userId: user.id, status: 'BOOKED' },
      });
      if (mine) {
        throw new ConflictException({ code: 'DUPLICATE_BOOKING', message: 'Вы уже записаны на это окно' });
      }

      const taken = await tx.slotBooking.count({ where: { windowId, slotStart, status: 'BOOKED' } });
      if (taken >= w.capacity) {
        throw new ConflictException({ code: 'QUOTA_EXCEEDED', message: 'Этот слот уже занят' });
      }

      const booking = await tx.slotBooking.create({
        data: { windowId, userId: user.id, slotStart, comment: comment ?? null },
      });
      await this.events.write(tx, {
        action: 'slot_booking.created',
        actorId: user.id,
        payload: { windowId, slotStart },
      });
      await this.notifications.createInApp(tx, {
        userId: w.owner_id,
        title: `Запись на приём: ${w.title}`,
        body: `${user.fullName} — ${slotStart}`,
      });
      return booking;
    });
  }

  async cancel(user: AuthUser, bookingId: string) {
    const booking = await this.prisma.slotBooking.findUnique({
      where: { id: bookingId },
      include: { window: true },
    });
    if (!booking) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Запись не найдена' });
    if (booking.userId !== user.id && booking.window.ownerId !== user.id && user.role !== 'ADMIN') {
      throw new ForbiddenException({ code: 'ACCESS_DENIED', message: 'Нет доступа к записи' });
    }
    const updated = await this.prisma.slotBooking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await this.events.log({ action: 'slot_booking.cancelled', actorId: user.id, payload: { bookingId } });
    return updated;
  }

  myBookings(user: AuthUser) {
    return this.prisma.slotBooking.findMany({
      where: { userId: user.id, status: 'BOOKED' },
      include: { window: { include: { owner: { select: { fullName: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
