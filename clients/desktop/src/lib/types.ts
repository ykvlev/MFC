import type { ApplicationStatus, StageStatus, UserRole } from '@edinoe-okno/shared';

export type { ApplicationStatus, StageStatus, UserRole };

export interface Me {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string | null;
  groupName: string | null;
  course: number | null;
  isBudget: boolean;
}

export interface Stage {
  id: string;
  orderNum: number;
  name: string;
  approverDepartment: string;
  status: StageStatus;
  comment: string | null;
  dueAt: string | null;
  actedAt: string | null;
}

export interface ApplicationType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  usesCell: boolean;
  usesBooking: boolean;
  requiresSignature: boolean;
  fieldsSchema: unknown;
  routeSteps?: Array<{ orderNum: number; name: string; approverDepartment: string; slaDays: number | null; isAuto: boolean }>;
  available?: boolean;
  denyMessage?: string | null;
}

export interface Cell {
  id: string;
  code: string;
  status: 'FREE' | 'OCCUPIED' | 'MAINTENANCE';
  pickupCode: string | null;
  expiresAt: string | null;
  location: string | null;
}

export interface Application {
  id: string;
  number: string;
  status: ApplicationStatus;
  data: Record<string, unknown>;
  createdAt: string;
  submittedAt: string | null;
  rejectReason: string | null;
  type: ApplicationType;
  stages: Stage[];
  cell?: Cell | null;
  files?: FileMeta[];
  user?: { fullName: string; groupName: string | null; course: number | null };
}

export interface FileMeta {
  id: string;
  kind: 'ATTACHMENT' | 'GENERATED_DOCUMENT' | 'SIGNED_SCAN';
  originalName: string;
  fieldKey: string | null;
  createdAt: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  applicationId: string | null;
  createdAt: string;
}
