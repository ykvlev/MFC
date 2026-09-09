import { z } from 'zod';

const roleEnum = z.enum(['STUDENT', 'STAFF', 'TEACHER', 'ADMIN']);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  role: roleEnum,
  groupName: z.string().max(64).optional(),
  course: z.number().int().min(1).max(6).optional(),
  department: z.string().max(128).optional(),
  isBudget: z.boolean().optional(),
  studentCardNo: z.string().max(32).optional(),
  phone: z.string().max(32).optional(),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true }).extend({
  isActive: z.boolean().optional(),
});
export type UpdateUserDto = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
