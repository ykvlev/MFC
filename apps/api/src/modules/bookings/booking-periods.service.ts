import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class BookingPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async listWithFreeSlots() {
    const periods = await this.prisma.bookingPeriod.findMany({ orderBy: { startDate: 'asc' } });
    const counts = await this.prisma.booking.groupBy({
      by: ['periodId'],
      where: { status: 'CONFIRMED' },
      _count: true,
    });
    const map = new Map(counts.map((c) => [c.periodId, c._count]));
    return periods.map((p) => ({
      ...p,
      confirmed: map.get(p.id) ?? 0,
      freeSlots: Math.max(0, p.quota - (map.get(p.id) ?? 0)),
    }));
  }

  async create(data: { name: string; startDate: string; endDate: string; quota: number; isOpen?: boolean }) {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Дата окончания должна быть позже начала' });
    }
    if (data.quota <= 0) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Квота должна быть положительной' });
    }
    return this.prisma.bookingPeriod.create({
      data: {
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        quota: data.quota,
        isOpen: data.isOpen ?? true,
      },
    });
  }

  async update(id: string, data: Prisma.BookingPeriodUpdateInput) {
    await this.prisma.bookingPeriod.findUniqueOrThrow({ where: { id } }).catch(() => {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Период не найден' });
    });
    return this.prisma.bookingPeriod.update({ where: { id }, data });
  }
}
