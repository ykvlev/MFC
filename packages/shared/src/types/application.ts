export const APPLICATION_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_FIX',
  'AWAITING_SIGNATURE',
  'APPROVED',
  'READY',
  'ISSUED',
  'REJECTED',
  'CANCELLED',
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const TERMINAL_STATUSES: ApplicationStatus[] = ['ISSUED', 'REJECTED', 'CANCELLED'];

export const STAGE_STATUSES = [
  'PENDING',
  'ACTIVE',
  'APPROVED',
  'REJECTED',
  'RETURNED',
  'SKIPPED',
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const CELL_STATUSES = ['FREE', 'OCCUPIED', 'MAINTENANCE'] as const;
export type CellStatus = (typeof CELL_STATUSES)[number];

export const BOOKING_STATUSES = ['CONFIRMED', 'WAITLIST', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const FILE_KINDS = ['ATTACHMENT', 'GENERATED_DOCUMENT', 'SIGNED_SCAN'] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL', 'PUSH'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/** Действия статусной машины (не значения `event_log.action`). */
export const APPLICATION_ACTIONS = [
  'submit',
  'cancel',
  'approveStage',
  'returnStage',
  'rejectStage',
  'resubmit',
  'assignCell',
  'confirmPickup',
  'uploadSignedScan',
] as const;
export type ApplicationAction = (typeof APPLICATION_ACTIONS)[number];
