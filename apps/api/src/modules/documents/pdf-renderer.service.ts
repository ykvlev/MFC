import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { type Browser } from 'puppeteer';

const TEMPLATES_DIR = join(process.cwd(), 'templates');

@Injectable()
export class PdfRendererService {
  private readonly logger = new Logger(PdfRendererService.name);
  private browser: Browser | null = null;

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.connected) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * ТЗ 9: HTML-шаблон -> PDF. Плейсхолдеры `{{key}}` и `{{data.<field>}}`.
   * `{{approvals}}` заменяется списком `<li>` до подстановки остальных.
   */
  async render(templateFile: string, values: Record<string, string>, approvals: string[]): Promise<Buffer> {
    let html = await readFile(join(TEMPLATES_DIR, templateFile), 'utf-8');

    html = html.replace('{{approvals}}', approvals.map((a) => `<li>${escapeHtml(a)}</li>`).join('\n'));
    html = html.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_m, key: string) => {
      const v = values[key];
      return v === undefined ? '' : escapeHtml(v);
    });

    const browser = await this.getBrowser();
    const page = await browser.newPage();
    try {
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true,
      });
      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.browser?.close();
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
