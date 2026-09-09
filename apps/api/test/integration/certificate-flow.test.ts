import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

/** ТЗ 15.2 + 17: полный цикл справки через ячейку. */
describe('Полный цикл: справка об обучении', () => {
  let ctx: TestCtx;

  beforeAll(async () => {
    ctx = await createApp();
    await resetDb();

    await mkUser({ email: 'stud@student.local', role: 'STUDENT', groupName: 'ИС-21', course: 3, isBudget: true });
    await mkUser({ email: 'dekanat@u.local', role: 'STAFF', department: 'Деканат' });
    await mkUser({ email: 'kanc@u.local', role: 'STAFF', department: 'Канцелярия' });

    const type = await prisma.applicationType.create({
      data: {
        code: 'certificate',
        name: 'Справка об обучении',
        usesCell: true,
        fieldsSchema: [
          { key: 'purpose', label: 'Куда', type: 'SELECT', required: true, options: ['Военкомат', 'Банк'] },
          { key: 'copies', label: 'Экземпляры', type: 'NUMBER', required: true, min: 1, max: 5 },
        ],
      },
    });
    await prisma.routeStep.createMany({
      data: [
        { typeId: type.id, orderNum: 1, name: 'Деканат', approverDepartment: 'Деканат', slaDays: 2 },
        { typeId: type.id, orderNum: 2, name: 'Канцелярия', approverDepartment: 'Канцелярия', slaDays: 1 },
      ],
    });
    await prisma.cell.create({ data: { code: 'A-01', status: 'FREE' } });
  });

  afterAll(async () => {
    await ctx.close();
    await prisma.$disconnect();
  });

  it('создание → подача → согласование обоих этапов → ячейка → выдача → ISSUED', async () => {
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'certificate' } });
    const studToken = await login(ctx.base, 'stud@student.local');
    const stud = client(ctx.base, studToken);

    const created = await stud('/applications', {
      method: 'POST',
      body: JSON.stringify({ typeId: type.id, data: { purpose: 'Банк', copies: 2 } }),
    });
    expect(created.status).toBe(201);
    const app = (await created.json()) as { id: string; number: string; status: string };
    expect(app.status).toBe('DRAFT');

    const submitted = await stud(`/applications/${app.id}/submit`, { method: 'POST' });
    expect(submitted.status).toBe(201);
    expect(((await submitted.json()) as { status: string }).status).toBe('IN_REVIEW');

    // Деканат согласует первый этап.
    const dekToken = await login(ctx.base, 'dekanat@u.local');
    const dek = client(ctx.base, dekToken);
    let detail = (await (await dek(`/applications/${app.id}`)).json()) as {
      stages: Array<{ id: string; status: string; approverDepartment: string }>;
    };
    const stage1 = detail.stages.find((s) => s.status === 'ACTIVE')!;
    expect(stage1.approverDepartment).toBe('Деканат');
    const a1 = await dek(`/applications/${app.id}/stages/${stage1.id}/approve`, { method: 'POST', body: '{}' });
    expect(a1.status).toBe(201);

    // Канцелярия согласует последний этап → назначается ячейка.
    const kancToken = await login(ctx.base, 'kanc@u.local');
    const kanc = client(ctx.base, kancToken);
    detail = (await (await kanc(`/applications/${app.id}`)).json()) as typeof detail;
    const stage2 = detail.stages.find((s) => s.status === 'ACTIVE')!;
    const a2 = await kanc(`/applications/${app.id}/stages/${stage2.id}/approve`, { method: 'POST', body: '{}' });
    const afterApprove = (await a2.json()) as { status: string; cell: { code: string; pickupCode: string } | null };
    expect(afterApprove.status).toBe('READY');
    expect(afterApprove.cell?.code).toBe('A-01');
    expect(afterApprove.cell?.pickupCode).toMatch(/^\d{6}$/);

    // Сотрудник подтверждает выдачу.
    const cell = await prisma.cell.findFirstOrThrow({ where: { code: 'A-01' } });
    const issued = await kanc(`/cells/${cell.id}/issue`, { method: 'POST' });
    expect(issued.status).toBe(201);

    const final = await prisma.application.findUniqueOrThrow({ where: { id: app.id } });
    expect(final.status).toBe('ISSUED');
    const freedCell = await prisma.cell.findFirstOrThrow({ where: { code: 'A-01' } });
    expect(freedCell.status).toBe('FREE');

    // Все переходы в журнале.
    const events = await prisma.eventLog.findMany({ where: { applicationId: app.id } });
    const actions = events.map((e) => e.action);
    expect(actions).toContain('application.submitted');
    expect(actions).toContain('application.stage_approved');
    expect(actions).toContain('cell.assigned');
    expect(actions).toContain('cell.issued');
  });

  it('студент A получает 403 на заявку студента Б (ТЗ 15.2)', async () => {
    await mkUser({ email: 'other@student.local', role: 'STUDENT', groupName: 'ПМ-32', course: 2 });
    const type = await prisma.applicationType.findFirstOrThrow({ where: { code: 'certificate' } });
    const aToken = await login(ctx.base, 'stud@student.local');
    const created = await client(ctx.base, aToken)('/applications', {
      method: 'POST',
      body: JSON.stringify({ typeId: type.id, data: { purpose: 'Банк', copies: 1 } }),
    });
    const app = (await created.json()) as { id: string };

    const bToken = await login(ctx.base, 'other@student.local');
    const res = await client(ctx.base, bToken)(`/applications/${app.id}`);
    expect(res.status).toBe(403);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('ACCESS_DENIED');
  });
});
