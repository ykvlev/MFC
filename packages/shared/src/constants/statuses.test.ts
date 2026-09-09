import { describe, expect, it } from 'vitest';
import { ALLOWED_TRANSITIONS, isTransitionAllowed } from './statuses.js';
import { TERMINAL_STATUSES } from '../types/application.js';

describe('ALLOWED_TRANSITIONS', () => {
  it('из терминальных статусов переходов нет (ТЗ 6.2 п.1)', () => {
    for (const s of TERMINAL_STATUSES) {
      expect(Object.keys(ALLOWED_TRANSITIONS[s])).toHaveLength(0);
    }
  });

  it('разрешает submit: DRAFT -> SUBMITTED', () => {
    expect(isTransitionAllowed('DRAFT', 'submit', 'SUBMITTED')).toBe(true);
  });

  it('запрещает произвольный переход', () => {
    expect(isTransitionAllowed('DRAFT', 'submit', 'ISSUED')).toBe(false);
    expect(isTransitionAllowed('ISSUED', 'cancel', 'CANCELLED')).toBe(false);
  });

  it('resubmit возможен только из NEEDS_FIX', () => {
    expect(isTransitionAllowed('NEEDS_FIX', 'resubmit', 'IN_REVIEW')).toBe(true);
    expect(isTransitionAllowed('IN_REVIEW', 'resubmit', 'IN_REVIEW')).toBe(false);
  });
});
