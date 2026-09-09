import { z } from 'zod';
import { accessRuleSchema, fieldsSchema } from '@edinoe-okno/shared';

export const createTypeSchema = z.object({
  code: z.string().regex(/^[a-z][a-z0-9_]*$/, 'code: ^[a-z][a-z0-9_]*$'),
  name: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().max(64).optional(),
  fieldsSchema,
  accessRule: accessRuleSchema.optional(),
  requiresSignature: z.boolean().optional(),
  usesCell: z.boolean().optional(),
  usesBooking: z.boolean().optional(),
  documentTemplate: z.string().max(128).optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateTypeDto = z.infer<typeof createTypeSchema>;

export const updateTypeSchema = createTypeSchema.partial().omit({ code: true });
export type UpdateTypeDto = z.infer<typeof updateTypeSchema>;

export const routeStepInput = z.object({
  name: z.string().min(1),
  approverDepartment: z.string().min(1),
  isAuto: z.boolean().optional(),
  isOptional: z.boolean().optional(),
  slaDays: z.number().int().positive().nullable().optional(),
});

export const replaceRouteSchema = z.object({
  steps: z.array(routeStepInput).min(1),
});
export type ReplaceRouteDto = z.infer<typeof replaceRouteSchema>;
