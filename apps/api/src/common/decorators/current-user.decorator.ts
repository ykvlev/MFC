import { type ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { UserRole } from '@edinoe-okno/shared';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  department: string | null;
  fullName: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest().user as AuthUser;
  },
);
