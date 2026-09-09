import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

/** Обходной лист: параллельные этапы закрываются независимо, финальный — после всех. */
describe('Обходной лист (параллельные этапы)', () => {
  let ctx: TestCtx;
  const DEPTS = ['Библиотека', 'Бухгалтерия', 'Профком'];

  beforeAll(async () => {
    ctx = await createApp();
    await resetDb();
    await mkUser({ email: 'grad@student.local', role: 'STUDENT', groupName: 'ИС-21', course: 4 });
    for (const d of DEPTS) {
      await mkUser({ email: `${DEPTS.indexOf(d)}@u.local`, role: 'STAFF', department: d });
    }
    await mkUser({ email: 'dek@u.local', role: 'STAFF', department: 'Деканат' });

    const type = await prisma.applicationType.create({
      data: {
        code: 'bypass',
        name: 'Обходной лист',
        fieldsSchema: [
          { key: 'reason', label: 'Основание', type: 'SELECT', required: true, options: ['Выпуск', 'Отчисление'] },
        ],
      },
    });
    await prisma.routeStep.createMany({
      data: [
        ...DEPTS.map((d, i) => ({
          typeId: type.id,
          orderNum: i + 1,
          name: d,
          approverDepartment: d,
          slaDays: 2,
          parallelGroup: 1,
        })),
        {
          typeId: type.id,
          orderNum: DEPTS.length + 1,
          name: 'Деканат — закрытие',
          approverDepartment: 'Деканат',
          slaDays: 2,
        },
      ],
    });
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  it('все параллельные этапы активны сразу, финальный ждёт', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'bypass' } });
    const st = client(ctx.base, await login(ctx.base, 'grad@student.local'));
    const app = (await (
      await st('/applications', { method: 'POST', body: JSON.stringify({ typeId: type.id, data: { reason: 'Выпуск' } }) })
    ).json()) as { id: string };
    await st(`/applications/${app.id}/submit`, { method: 'POST' });

    const stages = await prisma.applicationStage.findMany({
      where: { applicationId: app.id },
      orderBy: { orderNum: 'asc' },
    });
    expect(stages.filter((s) => s.status === 'ACTIVE')).toHaveLength(DEPTS.length);
    expect(stages[DEPTS.length].status).toBe('PENDING');

    // Каждый отдел закрывает свой этап; заявка остаётся IN_REVIEW, пока не закрыты все.
    for (let i = 0; i < DEPTS.length; i++) {
      const staff = client(ctx.base, await login(ctx.base, `${i}@u.local`));
      const stage = stages.find((s) => s.approverDepartment === DEPTS[i])!;
      const res = await staff(`/applications/${app.id}/stages/${stage.id}/approve`, { method: 'POST', body: '{}' });
      expect(res.status).toBe(201);

      const current = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
      expect(current.status).toBe('IN_REVIEW');

      const finalStage = await prisma.applicationStage.findFirstOrThrow({
        where: { applicationId: app.id, orderNum: DEPTS.length + 1 },
      });
      // Финальный этап активируется только после закрытия всей параллельной группы.
      expect(finalStage.status).toBe(i === DEPTS.length - 1 ? 'ACTIVE' : 'PENDING');
    }

    // Деканат закрывает обходной — заявка завершена.
    const dek = client(ctx.base, await login(ctx.base, 'dek@u.local'));
    const finalStage = await prisma.applicationStage.findFirstOrThrow({
      where: { applicationId: app.id, orderNum: DEPTS.length + 1 },
    });
    await dek(`/applications/${app.id}/stages/${finalStage.id}/approve`, { method: 'POST', body: '{}' });

    const done = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(done.status).toBe('ISSUED');
  });

  it('отдел не может закрыть чужой параллельный этап', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'bypass' } });
    const st = client(ctx.base, await login(ctx.base, 'grad@student.local'));
    const app = (await (
      await st('/applications', { method: 'POST', body: JSON.stringify({ typeId: type.id, data: { reason: 'Отчисление' } }) })
    ).json()) as { id: string };
    await st(`/applications/${app.id}/submit`, { method: 'POST' });

    const libStage = await prisma.applicationStage.findFirstOrThrow({
      where: { applicationId: app.id, approverDepartment: 'Библиотека' },
    });
    const buh = client(ctx.base, await login(ctx.base, '1@u.local')); // Бухгалтерия
    const res = await buh(`/applications/${app.id}/stages/${libStage.id}/approve`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(403);
  });
});
