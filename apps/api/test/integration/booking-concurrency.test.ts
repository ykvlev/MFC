import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

/** ТЗ 15.2 + 17: 50 параллельных запросов на период с квотой 10 → ровно 10 CONFIRMED. */
describe('Конкурентная запись в профилакторий', () => {
  let ctx: TestCtx;
  const QUOTA = 10;
  const N = 50;

  beforeAll(async () => {
    ctx = await createApp();
    await resetDb();

    const type = await prisma.applicationType.create({
      data: {
        code: 'sanatorium',
        name: 'Профилакторий',
        usesBooking: true,
        accessRule: { all: [{ field: 'is_budget', op: 'eq', value: true }], denyMessage: 'только бюджет' },
        fieldsSchema: [],
      },
    });
    await prisma.routeStep.createMany({
      data: [
        { typeId: type.id, orderNum: 1, name: 'Проверка права', approverDepartment: 'Профком', isAuto: true, slaDays: null },
        { typeId: type.id, orderNum: 2, name: 'Профком', approverDepartment: 'Профком', slaDays: 3 },
      ],
    });
    await prisma.bookingPeriod.create({
      data: { name: 'Заезд', startDate: new Date('2099-01-01'), endDate: new Date('2099-01-14'), quota: QUOTA },
    });

    for (let i = 0; i < N; i++) {
      await mkUser({ email: `s${i}@student.local`, role: 'STUDENT', isBudget: true, course: 3 });
    }
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  it(`${N} параллельных → ровно ${QUOTA} CONFIRMED, остальные WAITLIST с уникальными позициями`, async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'sanatorium' } });
    const period = await prisma.bookingPeriod.findFirstOrThrow();

    const attempts = await Promise.all(
      Array.from({ length: N }, async (_, i) => {
        const token = await login(ctx.base, `s${i}@student.local`);
        const c = client(ctx.base, token);
        const created = await c('/applications', {
          method: 'POST',
          body: JSON.stringify({ typeId: type.id, data: {} }),
        });
        expect(created.status).toBe(201);
        const app = (await created.json()) as { id: string };
        const submitted = await c(`/applications/${app.id}/submit`, { method: 'POST' });
        expect(submitted.status).toBe(201);
        return c('/bookings', {
          method: 'POST',
          body: JSON.stringify({ applicationId: app.id, periodId: period.id }),
        });
      }),
    );

    const okCount = attempts.filter((r) => r.ok).length;
    expect(okCount).toBe(N);

    const confirmed = await prisma.booking.count({ where: { periodId: period.id, status: 'CONFIRMED' } });
    const waitlist = await prisma.booking.findMany({
      where: { periodId: period.id, status: 'WAITLIST' },
      orderBy: { queuePosition: 'asc' },
    });

    expect(confirmed).toBe(QUOTA);
    expect(waitlist.length).toBe(N - QUOTA);
    expect(waitlist.map((b) => b.queuePosition)).toEqual(
      Array.from({ length: N - QUOTA }, (_, i) => i + 1),
    );
  });

  it('внебюджетник получает 403 с denyMessage', async () => {
    await mkUser({ email: 'paid@student.local', role: 'STUDENT', isBudget: false, course: 2 });
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'sanatorium' } });
    const token = await login(ctx.base, 'paid@student.local');
    const res = await client(ctx.base, token)('/applications', {
      method: 'POST',
      body: JSON.stringify({ typeId: type.id, data: {} }),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('ACCESS_DENIED');
    expect(body.error.message).toContain('бюджет');
  });
});
