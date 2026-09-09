import { z } from 'zod';
import { FIELD_TYPES } from '../types/field-schema.js';
import { ACCESS_RULE_FIELDS, ACCESS_RULE_OPS } from '../types/field-schema.js';

const keyRe = /^[a-z][a-z0-9_]*$/;
const dateExpr = z
  .string()
  .regex(/^(today([+-]\d+)?|\d{4}-\d{2}-\d{2})$/, 'ожидается today, today+N или ISO-дата');

const selectOption = z.union([
  z.string(),
  z.object({ value: z.string(), label: z.string() }),
]);

export const fieldSchemaItem = z
  .object({
    key: z.string().regex(keyRe, 'key: ^[a-z][a-z0-9_]*$'),
    label: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    required: z.boolean().optional(),
    hint: z.string().optional(),
    default: z.unknown().optional(),
    visibleFor: z.array(z.enum(['STUDENT', 'STAFF', 'TEACHER', 'ADMIN'])).optional(),

    minLength: z.number().int().nonnegative().optional(),
    maxLength: z.number().int().positive().optional(),
    pattern: z.string().optional(),

    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),

    minDate: dateExpr.optional(),
    maxDate: dateExpr.optional(),

    options: z.array(selectOption).optional(),
    multiple: z.boolean().optional(),

    accept: z.array(z.string()).optional(),
    maxSizeMb: z.number().positive().max(50).optional(),
  })
  .superRefine((f, ctx) => {
    if (f.type === 'SELECT' && (!f.options || f.options.length === 0)) {
      ctx.addIssue({ code: 'custom', message: 'SELECT требует непустой options' });
    }
    if (f.type === 'NUMBER' && f.min !== undefined && f.max !== undefined && f.min > f.max) {
      ctx.addIssue({ code: 'custom', message: 'min > max' });
    }
  });

export const fieldsSchema = z
  .array(fieldSchemaItem)
  .superRefine((arr, ctx) => {
    const seen = new Set<string>();
    for (const f of arr) {
      if (seen.has(f.key)) {
        ctx.addIssue({ code: 'custom', message: `дублирующийся key: ${f.key}` });
      }
      seen.add(f.key);
    }
  });

// --- access_rule ---

const condition = z.object({
  field: z.enum(ACCESS_RULE_FIELDS),
  op: z.enum(ACCESS_RULE_OPS),
  value: z.unknown(),
});

type RuleNode = z.infer<typeof condition> | { all?: RuleNode[]; any?: RuleNode[] };

const ruleNode: z.ZodType<RuleNode> = z.lazy(() =>
  z.union([
    condition,
    z.object({
      all: z.array(ruleNode).optional(),
      any: z.array(ruleNode).optional(),
    }),
  ]),
);

export const accessRuleSchema = z
  .object({
    all: z.array(ruleNode).optional(),
    any: z.array(ruleNode).optional(),
    denyMessage: z.string().optional(),
  })
  .nullable();
