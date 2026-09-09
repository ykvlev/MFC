import { describe, expect, it, vi } from 'vitest';
import { WaitlistService } from './waitlist.service.js';

type Booking = { id: string; userId: string; applicationId: string; status: string; queuePosition: number | null; periodId: string };

function fakeTx(bookings: Booking[]) {
  return {
    booking: {
      findMany: vi.fn(async ({ where, orderBy }: any) => {
        let rows = bookings.filter((b) => b.periodId === where.periodId && b.status === where.status);
        if (orderBy?.queuePosition === 'asc') rows = [...rows].sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0));
        return rows;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const b = bookings.find((x) => x.id === where.id)!;
        Object.assign(b, data);
        return b;
      }),
      aggregate: vi.fn(async ({ where }: any) => {
        const rows = bookings.filter((b) => b.periodId === where.periodId && b.status === where.status);
        return { _max: { queuePosition: Math.max(0, ...rows.map((r) => r.queuePosition ?? 0)) } };
      }),
    },
  } as any;
}

const events = { write: vi.fn() } as any;
const notifications = { createInApp: vi.fn() } as any;

describe('WaitlistService.promoteNext', () => {
  it('первый из очереди -> CONFIRMED, остальные позиции -1', async () => {
    const bookings: Booking[] = [
      { id: 'b1', userId: 'u1', applicationId: 'a1', status: 'WAITLIST', queuePosition: 1, periodId: 'p1' },
      { id: 'b2', userId: 'u2', applicationId: 'a2', status: 'WAITLIST', queuePosition: 2, periodId: 'p1' },
      { id: 'b3', userId: 'u3', applicationId: 'a3', status: 'WAITLIST', queuePosition: 3, periodId: 'p1' },
    ];
    const svc = new WaitlistService(events, notifications);
    const res = await svc.promoteNext(fakeTx(bookings), 'p1', 'Заезд №3');

    expect(res.promotedBookingId).toBe('b1');
    expect(bookings.find((b) => b.id === 'b1')).toMatchObject({ status: 'CONFIRMED', queuePosition: null });
    expect(bookings.find((b) => b.id === 'b2')?.queuePosition).toBe(1);
    expect(bookings.find((b) => b.id === 'b3')?.queuePosition).toBe(2);
    expect(notifications.createInApp).toHaveBeenCalled();
  });

  it('пустая очередь -> ничего', async () => {
    const svc = new WaitlistService(events, notifications);
    const res = await svc.promoteNext(fakeTx([]), 'p1', 'Заезд');
    expect(res.promotedBookingId).toBeNull();
  });

  it('nextQueuePosition = max + 1', async () => {
    const bookings: Booking[] = [
      { id: 'b1', userId: 'u1', applicationId: 'a1', status: 'WAITLIST', queuePosition: 1, periodId: 'p1' },
      { id: 'b2', userId: 'u2', applicationId: 'a2', status: 'WAITLIST', queuePosition: 2, periodId: 'p1' },
    ];
    const svc = new WaitlistService(events, notifications);
    expect(await svc.nextQueuePosition(fakeTx(bookings), 'p1')).toBe(3);
  });
});
