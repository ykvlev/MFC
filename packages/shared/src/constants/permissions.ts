import type { UserRole } from '../types/user.js';

/**
 * Матрица прав (ТЗ раздел 12). Это справочная константа для клиентов —
 * скрытие недоступных кнопок. Реальная проверка — на сервере (guards).
 */
export const PERMISSIONS = {
  'application.create': ['STUDENT', 'ADMIN'],
  'application.viewOwn': ['STUDENT', 'ADMIN'],
  'application.viewInRoute': ['STAFF', 'ADMIN'],
  'application.approveStage': ['STAFF', 'ADMIN'],
  'application.uploadFile': ['STUDENT', 'STAFF', 'ADMIN'],
  'application.cancel': ['STUDENT', 'ADMIN'],
  'cells.manage': ['STAFF', 'ADMIN'],
  'absences.registry': ['TEACHER', 'ADMIN'],
  'config.manage': ['ADMIN'],
  'eventLog.view': ['ADMIN'],
  'analytics.view': ['ADMIN'],
} as const satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}
