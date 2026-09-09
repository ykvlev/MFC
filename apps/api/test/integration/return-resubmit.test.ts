import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

/** ТЗ 15.2: возврат на доработку не сбрасывает пройденные этапы. */
describe('Возврат на доработку и повторная подача', () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    ctx = await createApp();
    await resetDb();
    await mkUser({ email: 'st@student.local', role: 'STUDENT', groupName: 'ИС-21', course: 3 });
    await mkUser({ email: 'kur@u.local', role: 'STAFF', department: 'Куратор' });
    await mkUser({ email: 'prof@u.local', role: 'STAFF', department: 'Профком' });
    await mkUser({ email: 'buh@u.local', role: 'STAFF', department: 'Бухгалтерия' });

    const type = await prisma.applicationType.create({
      data: {
        code: 'financial_aid',
        name: 'Матпомощь',
        fieldsSchema: [{ key: 'reason', label: 'Причина', type: 'TEXTAREA', required: true }],
      },
    });
    await prisma.routeStep.createMany({
      data: [
        { typeId: type.id, orderNum: 1, name: 'Куратор', approverDepartment: 'Куратор', slaDays: 2 },
        { typeId: type.id, orderNum: 2, name: 'Профком', approverDepartment: 'Профком', slaDays: 5 },
        { typeId: type.id, orderNum: 3, name: 'Бухгалтерия', approverDepartment: 'Бухгалтерия', slaDays: 5 },
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  it('после возврата с этапа 2 и resubmit этап 1 не пересогласовывается', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'financial_aid' } });
    const st = client(ctx.base, await login(ctx.base, 'st@student.local'));
    const app = (await (
      await st('/applications', { method: 'POST', body: JSON.stringify({ typeId: type.id, data: { reason: 'лечение' } }) })
    ).json()) as { id: string };
    await st(`/applications/${app.id}/submit`, { method: 'POST' });

    const kur = client(ctx.base, await login(ctx.base, 'kur@u.local'));
    let stages = (await (await kur(`/applications/${app.id}`)).json() as { stages: Array<{ id: string; orderNum: number; status: string }> }).stages;
    await kur(`/applications/${app.id}/stages/${stages.find((s) => s.orderNum === 1)!.id}/approve`, { method: 'POST', body: '{}' });

    // Профком возвращает.
    const prof = client(ctx.base, await login(ctx.base, 'prof@u.local'));
    stages = (await (await prof(`/applications/${app.id}`)).json() as { stages: typeof stages }).stages;
    const stage2 = stages.find((s) => s.orderNum === 2)!;
    const ret = await prof(`/applications/${app.id}/stages/${stage2.id}/return`, {
      method: 'POST',
      body: JSON.stringify({ comment: 'Приложите чек об оплате лечения' }),
    });
    expect(ret.status).toBe(201);
    expect(((await ret.json()) as { status: string }).status).toBe('NEEDS_FIX');

    // Студент дорабатывает и подаёт повторно.
    await st(`/applications/${app.id}`, { method: 'PATCH', body: JSON.stringify({ data: { reason: 'лечение + чек' } }) });
    const re = await st(`/applications/${app.id}/resubmit`, { method: 'POST' });
    expect(((await re.json()) as { status: string }).status).toBe('IN_REVIEW');

    const after = await prisma.applicationStage.findMany({ where: { applicationId: app.id }, orderBy: { orderNum: 'asc' } });
    expect(after[0].status).toBe('APPROVED'); // этап 1 сохранён
    expect(after[1].status).toBe('ACTIVE'); // вернувший этап снова активен
    expect(after[2].status).toBe('PENDING');
  });

  it('return без комментария (<10 симв.) отклоняется', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'financial_aid' } });
    const st = client(ctx.base, await login(ctx.base, 'st@student.local'));
    const app = (await (
      await st('/applications', { method: 'POST', body: JSON.stringify({ typeId: type.id, data: { reason: 'x' } }) })
    ).json()) as { id: string };
    await st(`/applications/${app.id}/submit`, { method: 'POST' });
    const kur = client(ctx.base, await login(ctx.base, 'kur@u.local'));
    const stages = (await (await kur(`/applications/${app.id}`)).json() as { stages: Array<{ id: string; status: string }> }).stages;
    const active = stages.find((s) => s.status === 'ACTIVE')!;
    const res = await kur(`/applications/${app.id}/stages/${active.id}/return`, {
      method: 'POST',
      body: JSON.stringify({ comment: 'мало' }),
    });
    expect(res.status).toBe(400);
  });

  it('сотрудник не может согласовать этап чужого подразделения (ТЗ 15.2)', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'financial_aid' } });
    const st = client(ctx.base, await login(ctx.base, 'st@student.local'));
    const app = (await (
      await st('/applications', { method: 'POST', body: JSON.stringify({ typeId: type.id, data: { reason: 'y' } }) })
    ).json()) as { id: string };
    await st(`/applications/${app.id}/submit`, { method: 'POST' });

    // Активен этап «Куратор», пробует Бухгалтерия.
    const buh = client(ctx.base, await login(ctx.base, 'buh@u.local'));
    const detail = await buh(`/applications/${app.id}`);
    // Бухгалтерия есть в маршруте → заявку видит, но согласовать активный этап Куратора не может.
    const stages = (await detail.json() as { stages: Array<{ id: string; status: string }> }).stages;
    const active = stages.find((s) => s.status === 'ACTIVE')!;
    const res = await buh(`/applications/${app.id}/stages/${active.id}/approve`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(403);
  });
});
