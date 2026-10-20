// Local seeded API + Vite. Creates its own type/application; archives the type afterwards.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');
const api = process.env.API_URL ?? 'http://localhost:3000/api/v1';
const desktop = process.env.DESKTOP_URL ?? 'http://localhost:1420';

async function request(path, token, method = 'GET', body) {
  const response = await fetch(api + path, {
    method, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  assert(response.ok, `${method} ${path}: ${response.status} ${data.error?.message ?? ''}`);
  return data;
}

(async () => {
  assert(process.env.SEED_ADMIN_PASSWORD, 'Load the local environment first');
  for (const url of [api, desktop]) assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Local services only');
  const code = `e2e_${Date.now()}`;
  let adminToken, typeId, applicationId, studentToken;
  const browser = await puppeteer.launch({ headless: 'shell' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100 });
    const clickText = async text => {
      const button = await page.waitForSelector(`::-p-text(${text})`);
      await button.click();
    };
    const replace = async (selector, value) => {
      await page.click(selector, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.type(selector, value);
    };
    await page.goto(desktop, { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=email]');
    await page.type('input[type=email]', process.env.SEED_ADMIN_EMAIL ?? 'admin@university.local');
    await page.type('input[type=password]', process.env.SEED_ADMIN_PASSWORD);
    const loginResponse = page.waitForResponse(r => r.url().endsWith('/auth/login') && r.request().method() === 'POST');
    await page.click('button[type=submit]');
    adminToken = (await (await loginResponse).json()).accessToken;
    await page.waitForSelector('nav a[href="/admin/types"]');
    await page.click('nav a[href="/admin/types"]');
    await clickText('+ Создать тип');
    await page.waitForSelector('input[placeholder^="latin_snake_case"]');
    await page.type('input[placeholder^="latin_snake_case"]', code);
    const name = await page.$('main label:nth-child(2) input');
    assert(name, 'Type name input missing');
    await name.type('Проверка нового типа для защиты');
    await clickText('+ Добавить поле');
    await replace('input[placeholder="key (латиница, snake_case)"]', 'purpose');
    await replace('input[placeholder="Подпись поля для студента"]', 'Цель обращения');
    await clickText('+ Добавить этап');
    await page.type('input[placeholder^="Название этапа"]', 'Проверка деканата');
    const createdResponse = page.waitForResponse(r => r.url().endsWith('/application-types') && r.request().method() === 'POST');
    const routeResponse = page.waitForResponse(r => r.url().includes('/route') && r.request().method() === 'PUT');
    await clickText('Сохранить');
    const created = await createdResponse;
    assert.equal(created.status(), 201);
    typeId = (await created.json()).id;
    assert.equal((await routeResponse).status(), 200);
    await page.waitForFunction(id => location.pathname.endsWith(id), {}, typeId);
    console.log('PASS: created type, custom field and route in administrator UI');

    studentToken = (await request('/auth/login', null, 'POST', {
      email: 'student1@student.local', password: 'student12345',
    })).accessToken;
    const catalog = await request('/application-types', studentToken);
    const type = catalog.find(t => t.id === typeId);
    assert(type, 'New type absent from student catalogue');
    assert.equal(type.fieldsSchema[0].key, 'purpose');
    const detail = await request(`/application-types/${typeId}`, studentToken);
    assert.equal(detail.routeSteps[0].name, 'Проверка деканата');
    const draft = await request('/applications', studentToken, 'POST', { typeId, data: { purpose: 'Проверка на защите' } });
    applicationId = draft.id;
    const submitted = await request(`/applications/${applicationId}/submit`, studentToken, 'POST');
    assert.equal(submitted.status, 'IN_REVIEW');
    assert.equal(submitted.stages[0].name, 'Проверка деканата');
    console.log('PASS: student catalogue, dynamic data, submission and configured route via API');

    await page.goto(`${desktop}/applications/${applicationId}`, { waitUntil: 'networkidle2' });
    const approvalResponse = page.waitForResponse(response =>
      response.url().includes(`/applications/${applicationId}/stages/`) &&
      response.url().endsWith('/approve') && response.request().method() === 'POST');
    await clickText('Согласовать «Проверка деканата»');
    assert.equal((await approvalResponse).status(), 201);
    const approved = await request(`/applications/${applicationId}`, studentToken);
    assert.equal(approved.status, 'ISSUED');
    console.log('PASS: approval in employee interface → ISSUED; no source changes needed for new type');
  } finally {
    if (typeId && adminToken) await request(`/application-types/${typeId}`, adminToken, 'DELETE');
    // Keep the test application and audit trail; its archived type is no longer in the catalogue.
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
