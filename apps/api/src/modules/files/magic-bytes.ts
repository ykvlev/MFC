/**
 * Проверка магических байт (ТЗ 13.1): расширение И сигнатура должны совпадать.
 * Поддерживаем форматы из fields_schema.accept: pdf, jpg/jpeg, png.
 */
const SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  pdf: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  png: (b) =>
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47,
  jpg: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
};

const EXT_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
};

export function normalizeExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '');
  return e === 'jpeg' ? 'jpg' : e;
}

export function detectedMime(ext: string): string {
  return EXT_MIME[ext.toLowerCase().replace(/^\./, '')] ?? 'application/octet-stream';
}

/** true, если содержимое соответствует заявленному расширению. */
export function matchesExtension(buffer: Buffer, ext: string): boolean {
  const norm = normalizeExt(ext);
  const check = SIGNATURES[norm];
  return check ? check(buffer) : false;
}

export function isSupportedExt(ext: string): boolean {
  return normalizeExt(ext) in SIGNATURES;
}
