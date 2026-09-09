import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface AbsenceFilter {
  group?: string;
  course?: number;
  from?: string;
  to?: string;
  q?: string;
}

export interface AbsenceRow {
  number: string;
  fullName: string;
  groupName: string | null;
  course: number | null;
  periodFrom: string;
  periodTo: string;
  reason: string;
  approvedBy: string;
}

/** ТЗ 9.1: реестр освобождённых. Только чтение. */
@Injectable()
export class AbsencesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: AbsenceFilter): Promise<AbsenceRow[]> {
    const where: Prisma.ApplicationWhereInput = {
      type: { code: 'absence' },
      status: 'ISSUED',
    };
    if (filter.group) where.user = { groupName: filter.group };
    if (filter.course) where.user = { ...(where.user as object), course: filter.course };
    if (filter.q) {
      where.user = { ...(where.user as object), fullName: { contains: filter.q, mode: 'insensitive' } };
    }

    const apps = await this.prisma.application.findMany({
      where,
      include: { user: true, stages: { where: { status: 'APPROVED' }, orderBy: { orderNum: 'asc' } } },
      orderBy: { closedAt: 'desc' },
    });

    const rows: AbsenceRow[] = apps.map((a) => {
      const data = (a.data ?? {}) as Record<string, unknown>;
      const period = (data.period ?? {}) as { from?: string; to?: string };
      return {
        number: a.number,
        fullName: a.user.fullName,
        groupName: a.user.groupName,
        course: a.user.course,
        periodFrom: period.from ?? '',
        periodTo: period.to ?? '',
        reason: String(data.reason ?? ''),
        approvedBy: a.stages.map((s) => s.approverDepartment).join(', '),
      };
    });

    // Фильтр по пересечению с периодом освобождения — на уровне приложения (data — JSONB).
    if (filter.from || filter.to) {
      const from = filter.from ? new Date(filter.from) : new Date('1970-01-01');
      const to = filter.to ? new Date(filter.to) : new Date('2999-12-31');
      return rows.filter((r) => {
        if (!r.periodFrom || !r.periodTo) return false;
        const pf = new Date(r.periodFrom);
        const pt = new Date(r.periodTo);
        return pf <= to && pt >= from;
      });
    }
    return rows;
  }

  async exportCsv(filter: AbsenceFilter): Promise<string> {
    const rows = await this.list(filter);
    const header = ['Номер', 'ФИО', 'Группа', 'Курс', 'С', 'По', 'Основание', 'Согласовано'];
    const lines = [header.join(';')];
    for (const r of rows) {
      lines.push(
        [r.number, r.fullName, r.groupName ?? '', r.course ?? '', r.periodFrom, r.periodTo, r.reason, r.approvedBy]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(';'),
      );
    }
    return '﻿' + lines.join('\r\n');
  }
}
