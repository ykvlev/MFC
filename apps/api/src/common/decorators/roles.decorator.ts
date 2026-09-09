import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@edinoe-okno/shared';

export const ROLES_KEY = 'roles';
/** ТЗ 12: ограничение эндпоинта по роли. Проверяется `RolesGuard`. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
