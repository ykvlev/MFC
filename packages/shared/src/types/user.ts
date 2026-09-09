export const USER_ROLES = ['STUDENT', 'STAFF', 'TEACHER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  groupName: string | null;
  course: number | null;
  department: string | null;
  isBudget: boolean;
  studentCardNo: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
