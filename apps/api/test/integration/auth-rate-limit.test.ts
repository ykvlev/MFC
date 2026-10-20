import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

describe('Ограничение попыток входа', () => {
  let ctx: TestCtx;
  beforeAll(async () => {
    ctx = await createApp(undefined, true);
    await resetDb();
    await mkUser({ email: 'limit@student.local', role: 'STUDENT' });
  });
  afterAll(async () => { await ctx?.close(); await prisma.$disconnect(); });
  it('профиль доступен после пяти запросов, шестая попытка входа ограничивается', async () => {
    const token = await login(ctx.base, 'limit@student.local');
    const c = client(ctx.base, token);
    for (let i = 0; i < 8; i++) expect((await c('/auth/me')).status).toBe(200);
    for (let i = 0; i < 5; i++) {
      const response = await c('/auth/login', {
        method: 'POST', body: JSON.stringify({ email: 'limit@student.local', password: 'incorrect12345' }),
      });
      expect(response.status).toBe(i === 4 ? 429 : 401);
    }
    expect((await c('/auth/me')).status).toBe(200);
  });
});
