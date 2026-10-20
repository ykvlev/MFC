import { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { client, createApp, login, mkUser, prisma, resetDb, type TestCtx } from './setup.js';

type FileMeta = { id: string; originalName: string; sizeBytes: number; mimeType: string };

describe('Вложения: черновик → multipart → подача → скачивание', () => {
  let ctx: TestCtx;
  let token: string;
  let id: string;
  let fileId: string;
  const bytes = Buffer.from('%PDF-1.4\nattachment fixture\n%%EOF');
  const objects = new Map<string, Buffer>();

  beforeAll(async () => {
    ctx = await createApp({
      async put(key, body) { objects.set(key, Buffer.from(body)); },
      async get(key) { return Readable.from(objects.get(key)!); },
      async delete(key) { objects.delete(key); },
    });
    await resetDb();
    await mkUser({ email: 'files@student.local', role: 'STUDENT' });
    const type = await prisma.applicationType.create({ data: {
      code: 'files', name: 'Заявка с вложением',
      fieldsSchema: [{ key: 'proof', label: 'Подтверждение', type: 'FILE', required: true, accept: ['pdf'] }],
      routeSteps: { create: { orderNum: 1, name: 'Проверка', approverDepartment: 'Деканат' } },
    } });
    token = await login(ctx.base, 'files@student.local');
    const response = await client(ctx.base, token)('/applications', {
      method: 'POST', body: JSON.stringify({ typeId: type.id, data: {} }),
    });
    expect(response.status).toBe(201);
    id = ((await response.json()) as { id: string }).id;
  });

  afterAll(async () => { await ctx?.close(); await prisma.$disconnect(); });

  it('отклоняет запрос без файла и неверное содержимое', async () => {
    const empty = await client(ctx.base, token)(`/applications/${id}/files`, { method: 'POST', body: '{}' });
    expect(empty.status).toBe(400);
    const form = new FormData();
    form.append('file', new Blob(['not a pdf']), 'invalid.pdf');
    const bad = await fetch(`${ctx.base}/applications/${id}/files`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form,
    });
    expect(bad.status).toBe(415);
  });

  it('принимает файл и отдаёт карточку с числовым размером без ошибки JSON', async () => {
    const form = new FormData();
    form.append('kind', 'ATTACHMENT');
    form.append('fieldKey', 'proof');
    form.append('file', new Blob([bytes]), 'proof.pdf');
    const upload = await fetch(`${ctx.base}/applications/${id}/files`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form,
    });
    expect(upload.status).toBe(201);
    const meta = (await upload.json()) as FileMeta;
    fileId = meta.id;
    const c = client(ctx.base, token);
    const list = await c(`/applications/${id}/files`);
    expect(list.status).toBe(200);
    expect(((await list.json()) as FileMeta[])[0].sizeBytes).toBe(bytes.length);
    const detail = await c(`/applications/${id}`);
    expect(detail.status).toBe(200);
    expect(((await detail.json()) as { files: FileMeta[] }).files[0].sizeBytes).toBe(bytes.length);
    const patch = await c(`/applications/${id}`, { method: 'PATCH', body: JSON.stringify({
      data: { proof: { name: meta.originalName, sizeBytes: meta.sizeBytes, mimeType: meta.mimeType } },
    }) });
    expect(patch.status).toBe(200);
    const submit = await c(`/applications/${id}/submit`, { method: 'POST' });
    expect(submit.status).toBe(201);
    expect(((await submit.json()) as { status: string }).status).toBe('IN_REVIEW');
    const downloaded = await c(`/applications/${id}/files/${fileId}`);
    expect(Buffer.from(await downloaded.arrayBuffer())).toEqual(bytes);
  });

  it('не отдаёт вложение другому студенту', async () => {
    await mkUser({ email: 'other-files@student.local', role: 'STUDENT' });
    const other = await login(ctx.base, 'other-files@student.local');
    expect((await client(ctx.base, other)(`/applications/${id}/files/${fileId}`)).status).toBe(403);
  });
});
