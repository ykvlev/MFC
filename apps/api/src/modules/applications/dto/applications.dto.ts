import { z } from 'zod';
import { MIN_REVIEW_COMMENT_LENGTH } from '@edinoe-okno/shared';

export const createApplicationSchema = z.object({
  typeId: z.string().uuid(),
  data: z.record(z.unknown()).default({}),
});
export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

export const patchApplicationSchema = z.object({
  data: z.record(z.unknown()),
});
export type PatchApplicationDto = z.infer<typeof patchApplicationSchema>;

export const cancelSchema = z.object({ reason: z.string().max(1000).optional() });
export type CancelDto = z.infer<typeof cancelSchema>;

export const approveSchema = z.object({ comment: z.string().max(1000).optional() });
export type ApproveDto = z.infer<typeof approveSchema>;

export const reviewCommentSchema = z.object({
  comment: z.string().min(MIN_REVIEW_COMMENT_LENGTH, `Комментарий обязателен, минимум ${MIN_REVIEW_COMMENT_LENGTH} символов`),
});
export type ReviewCommentDto = z.infer<typeof reviewCommentSchema>;

export const listQuerySchema = z.object({
  scope: z.enum(['my', 'queue', 'all']).default('my'),
  status: z.string().optional(),
  typeId: z.string().uuid().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
