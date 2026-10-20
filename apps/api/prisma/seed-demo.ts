/** Optional local demo data. Uses the real workflow and never resets the database. */
import 'reflect-metadata';
import { createRequire } from 'node:module';
import { NestFactory } from '@nestjs/core';

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? '');
  if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1'].includes(target.hostname)) {
    throw new Error('Demo seed is only allowed against a local development database');
  }
  const requireBuild = createRequire(__filename);
  const { AppModule } = requireBuild('../dist/app.module.js');
  const { PrismaService } = requireBuild('../dist/prisma/prisma.service.js') as typeof import('../src/prisma/prisma.service.js');
  const { ApplicationsService } = requireBuild('../dist/modules/applications/applications.service.js') as typeof import('../src/modules/applications/applications.service.js');
  const { CellsService } = requireBuild('../dist/modules/cells/cells.service.js') as typeof import('../src/modules/cells/cells.service.js');
  const context = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const db = context.get(PrismaService);
    const applications = context.get(ApplicationsService);
    const cells = context.get(CellsService);
    const student = await db.user.findUniqueOrThrow({ where: { email: 'student1@student.local' } });
    const admin = await db.user.findUniqueOrThrow({ where: { email: process.env.SEED_ADMIN_EMAIL ?? 'admin@university.local' } });
    const actor = admin;
    const type = await db.applicationType.findUniqueOrThrow({ where: { code: 'certificate' } });
    for (const status of ['DRAFT', 'IN_REVIEW', 'NEEDS_FIX', 'READY', 'ISSUED']) {
      const comment = `Демо защиты · ${status}`;
      const existing = await db.application.findFirst({ where: {
        userId: student.id, typeId: type.id, data: { path: ['comment'], equals: comment },
      } });
      if (existing) { console.log(`Сохранена: ${existing.number} (${existing.status})`); continue; }
      let app = await applications.create(student.id, { typeId: type.id,
        data: { purpose: 'По месту требования', copies: 1, comment } });
      if (status !== 'DRAFT') app = await applications.submit(app, student.id);
      if (status === 'NEEDS_FIX') {
        const detail = await applications.getDetail(app.id);
        const active = detail.stages.find(s => s.status === 'ACTIVE');
        if (!active) throw new Error('Demo route has no active stage');
        await applications.returnStage(app, active.id, actor, 'Уточните организацию, для которой нужна справка.');
      }
      if (status === 'READY' || status === 'ISSUED') {
        for (let step = 0; step < 30; step++) {
          const detail = await applications.getDetail(app.id);
          if (detail.status === 'READY') break;
          const active = detail.stages.find(s => s.status === 'ACTIVE');
          if (!active) throw new Error('Demo route cannot reach READY');
          await applications.approveStage(detail, active.id, actor, 'Согласовано для демонстрации.');
        }
        const ready = await applications.getDetail(app.id);
        if (ready.status !== 'READY' || !ready.cell) throw new Error('No free cell for demo');
        if (status === 'ISSUED') await cells.issue(ready.cell.id, admin.id);
      }
      console.log(`Создана: ${app.number} (${status})`);
    }
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 30);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 14);
    const name = `Демо-заезд ${start.toISOString().slice(0, 7)}`;
    if (!await db.bookingPeriod.findFirst({ where: { name } })) {
      await db.bookingPeriod.create({ data: { name, startDate: start, endDate: end, quota: 10 } });
    }
    console.log('Демо-данные готовы. Существующие заявки и периоды не изменены.');
  } finally { await context.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
