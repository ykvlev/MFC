import { describe, expect, it } from 'vitest';
import { isSupportedExt, matchesExtension, normalizeExt } from './magic-bytes.js';

const pdf = Buffer.from('%PDF-1.7\n...');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);

describe('magic-bytes', () => {
  it('normalizeExt', () => {
    expect(normalizeExt('.JPEG')).toBe('jpg');
    expect(normalizeExt('PDF')).toBe('pdf');
  });

  it('совпадение расширения и сигнатуры', () => {
    expect(matchesExtension(pdf, 'pdf')).toBe(true);
    expect(matchesExtension(png, 'png')).toBe(true);
    expect(matchesExtension(jpg, 'jpeg')).toBe(true);
  });

  it('подменённое расширение отклоняется (ТЗ 15.2)', () => {
    expect(matchesExtension(pdf, 'png')).toBe(false);
    expect(matchesExtension(jpg, 'pdf')).toBe(false);
  });

  it('isSupportedExt', () => {
    expect(isSupportedExt('docx')).toBe(false);
    expect(isSupportedExt('jpg')).toBe(true);
  });
});
