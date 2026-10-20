// Requires the local API, seeded admin, Vite, and Puppeteer's headless shell.
const assert = require('node:assert/strict');
const puppeteer = require('puppeteer');

(async () => {
  assert(process.env.SEED_ADMIN_PASSWORD, 'Load the local environment first');
  const browser = await puppeteer.launch({ headless: 'shell' });
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => console.error('Browser:', error.message));
    page.on('requestfailed', request => console.error('Request failed:', new URL(request.url()).pathname, request.failure()?.errorText));
    await page.setViewport({ width: 1440, height: 1000 });
    let authRequests = 0;
    page.on('request', request => { if (request.url().includes('/auth/')) authRequests++; });
    await page.goto(process.env.DESKTOP_URL ?? 'http://localhost:1420', { waitUntil: 'networkidle2' });
    await page.waitForSelector('input[type=email]', { timeout: 20000 });
    await page.type('input[type=email]', process.env.SEED_ADMIN_EMAIL ?? 'admin@university.local');
    await page.type('input[type=password]', process.env.SEED_ADMIN_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForSelector('nav a[href="/admin/types"]').catch(async error => {
      console.error((await page.evaluate(() => document.body.innerText)).slice(0, 1200));
      throw error;
    });
    console.log('Login OK');
    await page.click('nav a[href="/admin/types"]');
    await page.waitForFunction(() => document.querySelector('main')?.textContent.includes('Справка об обучении'));
    await page.reload({ waitUntil: 'networkidle2' });
    console.log('Reloaded');
    await page.waitForSelector('nav a[href="/admin/types"]');
    await page.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Выйти').click());
    await page.waitForSelector('input[type=email]');
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 });
    assert(authRequests < 25, `Unexpected authentication loop: ${authRequests} requests`);
    console.log('PASS: admin login, types catalogue, session restore, logout');
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
