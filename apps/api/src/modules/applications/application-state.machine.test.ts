import { describe, expect, it } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { ApplicationStateMachine } from './application-state.machine.js';
import { ALLOWED_TRANSITIONS } from '@edinoe-okno/shared';
import type { ApplicationAction, ApplicationStatus } from '@edinoe-okno/shared';

const sm = new ApplicationStateMachine();

describe('ApplicationStateMachine.assert', () => {
  it('пропускает все переходы из ALLOWED_TRANSITIONS', () => {
    for (const [from, actions] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const [action, targets] of Object.entries(actions)) {
        for (const to of targets as ApplicationStatus[]) {
          expect(() =>
            sm.assert(from as ApplicationStatus, action as ApplicationAction, to),
          ).not.toThrow();
        }
      }
    }
  });

  it('бросает INVALID_TRANSITION на недопустимом', () => {
    expect(() => sm.assert('ISSUED', 'cancel', 'CANCELLED')).toThrow(ConflictException);
    expect(() => sm.assert('DRAFT', 'approveStage', 'APPROVED')).toThrow(ConflictException);
  });
});

describe('resolveApproval', () => {
  const base = { requiresSignature: false, usesCell: false, usesBooking: false };

  it('не последний этап -> следующий', () => {
    expect(sm.resolveApproval(base, false)).toEqual({ kind: 'NEXT_STAGE', status: 'IN_REVIEW' });
  });
  it('последний + подпись', () => {
    expect(sm.resolveApproval({ ...base, requiresSignature: true }, true).status).toBe('AWAITING_SIGNATURE');
  });
  it('последний + ячейка', () => {
    expect(sm.resolveApproval({ ...base, usesCell: true }, true).kind).toBe('ASSIGN_CELL');
  });
  it('последний, без флагов -> ISSUED', () => {
    expect(sm.resolveApproval(base, true)).toEqual({ kind: 'CLOSE', status: 'ISSUED' });
  });
});
