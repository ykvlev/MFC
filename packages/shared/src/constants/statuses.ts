import type { ApplicationAction, ApplicationStatus } from '../types/application.js';

/**
 * Статусная машина заявки (ТЗ раздел 6).
 * Ключ — исходный статус, значение — карта действие -> целевой статус(ы).
 * Ветвление по флагам типа (`requires_signature`, `uses_cell`) разрешается в
 * `application-state.machine.ts` на сервере; здесь перечислены все достижимые
 * из действия статусы.
 */
export const ALLOWED_TRANSITIONS: Record<
  ApplicationStatus,
  Partial<Record<ApplicationAction, ApplicationStatus[]>>
> = {
  DRAFT: {
    submit: ['SUBMITTED'],
    cancel: ['CANCELLED'],
  },
  SUBMITTED: {
    // авто, мгновенно
    approveStage: ['IN_REVIEW'],
    cancel: ['CANCELLED'],
  },
  IN_REVIEW: {
    approveStage: ['IN_REVIEW', 'AWAITING_SIGNATURE', 'APPROVED'],
    returnStage: ['NEEDS_FIX'],
    rejectStage: ['REJECTED'],
    cancel: ['CANCELLED'],
  },
  NEEDS_FIX: {
    resubmit: ['IN_REVIEW'],
    cancel: ['CANCELLED'],
  },
  AWAITING_SIGNATURE: {
    uploadSignedScan: ['APPROVED'],
    cancel: ['CANCELLED'],
  },
  APPROVED: {
    assignCell: ['READY'],
    confirmPickup: ['ISSUED'],
  },
  READY: {
    confirmPickup: ['ISSUED'],
  },
  ISSUED: {},
  REJECTED: {},
  CANCELLED: {},
};

/** Статусы, из которых студент может отменить заявку (ТЗ 6.2 п. 2). */
export const STUDENT_CANCELLABLE: ApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_FIX',
];

export const MIN_REVIEW_COMMENT_LENGTH = 10;

export function isTransitionAllowed(
  from: ApplicationStatus,
  action: ApplicationAction,
  to: ApplicationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from]?.[action]?.includes(to) ?? false;
}
