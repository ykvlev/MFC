import { z } from 'zod';
import type { FieldSchema, FieldsSchema } from '../types/field-schema.js';

function resolveDate(expr: string | undefined): Date | undefined {
  if (!expr) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expr)) return new Date(expr + 'T00:00:00Z');
  const m = expr.match(/^today([+-]\d+)?$/);
  if (m) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    if (m[1]) d.setUTCDate(d.getUTCDate() + Number(m[1]));
    return d;
  }
  return undefined;
}

function optionValues(field: FieldSchema): string[] {
  return (field.options ?? []).map((o) => (typeof o === 'string' ? o : o.value));
}

function fieldToZod(field: FieldSchema): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA': {
      let s = z.string();
      if (field.minLength !== undefined) s = s.min(field.minLength);
      if (field.maxLength !== undefined) s = s.max(field.maxLength);
      if (field.pattern) s = s.regex(new RegExp(field.pattern));
      schema = s;
      break;
    }
    case 'NUMBER': {
      let s = z.number();
      if (field.min !== undefined) s = s.min(field.min);
      if (field.max !== undefined) s = s.max(field.max);
      schema = s;
      break;
    }
    case 'CHECKBOX':
      schema = z.boolean();
      break;
    case 'DATE': {
      let s = z.coerce.date();
      const min = resolveDate(field.minDate);
      const max = resolveDate(field.maxDate);
      if (min) s = s.min(min);
      if (max) s = s.max(max);
      schema = s;
      break;
    }
    case 'DATE_RANGE': {
      const min = resolveDate(field.minDate);
      const max = resolveDate(field.maxDate);
      let from = z.coerce.date();
      let to = z.coerce.date();
      if (min) from = from.min(min);
      if (max) to = to.max(max);
      schema = z
        .object({ from, to })
        .refine((v) => v.to >= v.from, { message: 'Дата окончания раньше начала' });
      break;
    }
    case 'SELECT': {
      const values = optionValues(field);
      const single =
        values.length > 0
          ? z.enum(values as [string, ...string[]])
          : z.string();
      schema = field.multiple ? z.array(single).min(field.required ? 1 : 0) : single;
      break;
    }
    case 'FILE': {
      // На клиенте — метаданные выбранного файла; фактическая загрузка отдельным запросом.
      const one = z.object({
        name: z.string(),
        sizeBytes: z.number().int().nonnegative(),
        mimeType: z.string().optional(),
      });
      schema = field.multiple ? z.array(one) : one;
      break;
    }
    default:
      schema = z.unknown();
  }

  return field.required ? schema : schema.optional();
}

/** ТЗ 13.1: лишние ключи отбрасываются (strip). */
export function buildFormSchema(fields: FieldsSchema): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {};
  for (const f of fields) shape[f.key] = fieldToZod(f);
  return z.object(shape);
}
