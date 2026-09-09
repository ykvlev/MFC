import type { ApplicationStatus, StageStatus } from './types';

/** Карта статусов из прототипа (design/prototype.dc.html, объект ST). */
export const STATUS_META: Record<ApplicationStatus, { label: string; bg: string; fg: string }> = {
  DRAFT: { label: 'черновик', bg: '#EEEEEE', fg: '#000000' },
  SUBMITTED: { label: 'принята', bg: '#E1E0FF', fg: '#0804FF' },
  IN_REVIEW: { label: 'на согласовании', bg: '#E1E0FF', fg: '#0804FF' },
  NEEDS_FIX: { label: 'на доработке', bg: '#FFE9CC', fg: '#8A4B00' },
  AWAITING_SIGNATURE: { label: 'нужна подпись', bg: '#E1E0FF', fg: '#0804FF' },
  APPROVED: { label: 'согласовано', bg: '#E1E0FF', fg: '#0804FF' },
  READY: { label: 'готово к выдаче', bg: '#0804FF', fg: '#FFFFFF' },
  ISSUED: { label: 'выдано', bg: '#000000', fg: '#FFFFFF' },
  REJECTED: { label: 'отклонено', bg: '#F23838', fg: '#FFFFFF' },
  CANCELLED: { label: 'отменено', bg: '#EEEEEE', fg: '#818C99' },
};

export const STAGE_COLOR: Record<StageStatus, { dot: string; fill: string; line: string }> = {
  APPROVED: { dot: '#0804FF', fill: '#0804FF', line: '#0804FF' },
  ACTIVE: { dot: '#0804FF', fill: '#FFFFFF', line: '#EEEEEE' },
  RETURNED: { dot: '#F23838', fill: '#F23838', line: '#EEEEEE' },
  REJECTED: { dot: '#F23838', fill: '#F23838', line: '#EEEEEE' },
  PENDING: { dot: '#CCCCCC', fill: '#FFFFFF', line: '#EEEEEE' },
  SKIPPED: { dot: '#CCCCCC', fill: '#EEEEEE', line: '#EEEEEE' },
};

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}
