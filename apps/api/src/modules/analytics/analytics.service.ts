import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/** ТЗ 11.8. */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const types = await this.prisma.applicationType.findMany();
    const apps = await this.prisma.application.findMany({
      select: { typeId: true, status: true, submittedAt: true, closedAt: true },
    });

    const byType = types.map((t) => {
      const own = apps.filter((a) => a.typeId === t.id);
      return {
        code: t.code,
        name: t.name,
        total: own.length,
        issued: own.filter((a) => a.status === 'ISSUED').length,
        rejected: own.filter((a) => a.status === 'REJECTED').length,
      };
    });

    const avgProcessingDays: Record<string, number> = {};
    for (const t of types) {
      const done = apps.filter((a) => a.typeId === t.id && a.submittedAt && a.closedAt);
      if (done.length) {
        const sum = done.reduce(
          (acc, a) => acc + (a.closedAt!.getTime() - a.submittedAt!.getTime()) / 86_400_000,
          0,
        );
        avgProcessingDays[t.code] = Math.round((sum / done.length) * 10) / 10;
      }
    }

    const stages = await this.prisma.applicationStage.findMany({
      select: { approverDepartment: true, status: true, dueAt: true, actedAt: true },
    });
    const deptMap = new Map<string, { totalDays: number; n: number; overdue: number }>();
    for (const s of stages) {
      const e = deptMap.get(s.approverDepartment) ?? { totalDays: 0, n: 0, overdue: 0 };
      if (s.actedAt && s.dueAt) {
        e.n++;
        e.totalDays += Math.max(0, (s.actedAt.getTime() - s.dueAt.getTime()) / 86_400_000);
        if (s.actedAt > s.dueAt) e.overdue++;
      } else if (!s.actedAt && s.dueAt && s.dueAt < new Date() && s.status === 'ACTIVE') {
        e.overdue++;
      }
      deptMap.set(s.approverDepartment, e);
    }
    const bottlenecks = [...deptMap.entries()]
      .map(([department, v]) => ({
        department,
        avgDays: v.n ? Math.round((v.totalDays / v.n) * 10) / 10 : 0,
        overdueCount: v.overdue,
      }))
      .sort((a, b) => b.overdueCount - a.overdueCount)
      .slice(0, 5);

    const statusDistribution: Record<string, number> = {};
    for (const a of apps) statusDistribution[a.status] = (statusDistribution[a.status] ?? 0) + 1;

    const cells = await this.prisma.cell.findMany({ select: { status: true, expiresAt: true } });
    const cellsUtilization = {
      total: cells.length,
      occupied: cells.filter((c) => c.status === 'OCCUPIED').length,
      expired: cells.filter((c) => c.expiresAt && c.expiresAt < new Date()).length,
    };

    const periods = await this.prisma.bookingPeriod.findMany({ include: { bookings: true } });
    const bookings = periods.map((p) => ({
      period: p.name,
      quota: p.quota,
      confirmed: p.bookings.filter((b) => b.status === 'CONFIRMED').length,
      waitlist: p.bookings.filter((b) => b.status === 'WAITLIST').length,
    }));

    return { byType, avgProcessingDays, bottlenecks, statusDistribution, cellsUtilization, bookings };
  }

  async eventLog(filter: {
    applicationId?: string;
    actorId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? 50, 100);
    const where = {
      applicationId: filter.applicationId,
      actorId: filter.actorId,
      action: filter.action,
      createdAt: {
        gte: filter.from ? new Date(filter.from) : undefined,
        lte: filter.to ? new Date(filter.to) : undefined,
      },
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.eventLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.eventLog.count({ where }),
    ]);
    return {
      items: items.map((e) => ({ ...e, id: e.id.toString() })),
      total,
      page,
      limit,
    };
  }
}
