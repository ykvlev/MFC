import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Артём/Documents/MFC/apps/api/package.json');
const puppeteer = require('puppeteer');

const FONT_DIR = 'C:/Users/Артём/Documents/MFC/design/fonts';
const b64 = (f) => readFileSync(join(FONT_DIR, f)).toString('base64');
const face = (family, file, weight, fmt) =>
  `@font-face{font-family:'${family}';src:url(data:font/${fmt};base64,${b64(file)}) format('${fmt === 'otf' ? 'opentype' : 'truetype'}');font-weight:${weight};font-style:normal;}`;

const fonts = [
  face('Actay Wide', 'ActayWide-Bold.otf', 700, 'otf'),
  face('Stolzl', 'Stolzl-Regular.otf', 400, 'otf'),
  face('Stolzl', 'Stolzl-Medium.otf', 500, 'otf'),
  face('Stolzl Light', 'Stolzl-Light.otf', 300, 'otf'),
  face('Onest', 'Onest-Regular.ttf', 400, 'ttf'),
  face('Onest', 'Onest-Medium.ttf', 500, 'ttf'),
].join('\n');

const css = readFileSync('style.css', 'utf-8');
const date = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const body = ['body1.html', 'body2.html', 'body3.html']
  .map((f) => readFileSync(f, 'utf-8'))
  .join('\n')
  .replace('__DATE__', date);

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>${fonts}\n${css}</style></head><body>${body}</body></html>`;

writeFileSync('out.html', html);

const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.evaluateHandle('document.fonts.ready');
await page.pdf({
  path: 'C:/Users/Артём/Documents/MFC/docs/Единое окно — технологический стек.pdf',
  format: 'A4',
  printBackground: true,
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
});
await browser.close();
console.log('PDF готов');
