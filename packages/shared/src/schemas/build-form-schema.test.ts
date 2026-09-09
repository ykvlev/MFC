import { describe, expect, it } from 'vitest';
import { buildFormSchema } from './build-form-schema.js';
import type { FieldsSchema } from '../types/field-schema.js';

const schema: FieldsSchema = [
  { key: 'purpose', label: 'Куда', type: 'SELECT', required: true, options: ['Военкомат', 'Банк'] },
  { key: 'copies', label: 'Экземпляры', type: 'NUMBER', required: true, min: 1, max: 5 },
  { key: 'period', label: 'Период', type: 'DATE_RANGE', required: true },
  { key: 'comment', label: 'Комментарий', type: 'TEXTAREA', required: false, maxLength: 1000 },
];

describe('buildFormSchema', () => {
  const z = buildFormSchema(schema);

  it('принимает валидные данные и отбрасывает лишние ключи', () => {
    const r = z.parse({
      purpose: 'Банк',
      copies: 2,
      period: { from: '2026-03-01', to: '2026-03-05' },
      extra: 'ignored',
    });
    expect(r).not.toHaveProperty('extra');
    expect(r.copies).toBe(2);
  });

  it('отклоняет значение вне диапазона NUMBER', () => {
    expect(() => z.parse({ purpose: 'Банк', copies: 9, period: { from: '2026-03-01', to: '2026-03-05' } })).toThrow();
  });

  it('отклоняет неизвестный вариант SELECT', () => {
    expect(() => z.parse({ purpose: 'Соцзащита', copies: 1, period: { from: '2026-03-01', to: '2026-03-05' } })).toThrow();
  });

  it('отклоняет перевёрнутый диапазон дат', () => {
    expect(() => z.parse({ purpose: 'Банк', copies: 1, period: { from: '2026-03-10', to: '2026-03-01' } })).toThrow();
  });

  it('не требует необязательное поле', () => {
    expect(() => z.parse({ purpose: 'Банк', copies: 1, period: { from: '2026-03-01', to: '2026-03-05' } })).not.toThrow();
  });
});
