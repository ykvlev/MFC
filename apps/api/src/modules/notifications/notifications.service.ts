import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface NotifyInput {
  userId: string;
  applicationId?: string | null;
  title: string;
  body: string;
  link?: string | null;
}

type Tx = Prisma.TransactionClient | PrismaService;

/**
 * Этап 3: только канал IN_APP (запись в таблицу).
 * Этап 7 добавит EMAIL (BullMQ) и PUSH (APNs/FCM) — падение внешнего канала
 * не должно ломать бизнес-транзакцию (ТЗ 10).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createInApp(tx: Tx, input: NotifyInput): Promise<void> {
    await tx.notification.create({
      data: {
        userId: input.userId,
        applicationId: input.applicationId ?? null,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        channel: 'IN_APP',
      },
    });
  }

  /** Уведомить всех сотрудников подразделения (ТЗ 10: «Новая заявка на этапе»). */
  async notifyDepartment(tx: Tx, department: string, input: Omit<NotifyInput, 'userId'>): Promise<void> {
    const staff = await tx.user.findMany({
      where: { role: 'STAFF', department, isActive: true },
      select: { id: true },
    });
    for (const s of staff) {
      await this.createInApp(tx, { ...input, userId: s.id });
    }
  }

  async listForUser(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  }
}
