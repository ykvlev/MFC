import { ConflictException, Injectable } from '@nestjs/common';
import {
  type ApplicationAction,
  type ApplicationStatus,
  isTransitionAllowed,
} from '@edinoe-okno/shared';

export interface TypeFlags {
  requiresSignature: boolean;
  usesCell: boolean;
  usesBooking: boolean;
}

export type PostApprovalIntent =
  | { kind: 'NEXT_STAGE'; status: 'IN_REVIEW' }
  | { kind: 'AWAIT_SIGNATURE'; status: 'AWAITING_SIGNATURE' }
  | { kind: 'ASSIGN_CELL'; status: 'APPROVED' }
  | { kind: 'CLOSE'; status: 'ISSUED' };

/** Ядро статусной машины (ТЗ раздел 6). */
@Injectable()
export class ApplicationStateMachine {
  assert(from: ApplicationStatus, action: ApplicationAction, to: ApplicationStatus): void {
    if (!isTransitionAllowed(from, action, to)) {
      throw new ConflictException({
        code: 'INVALID_TRANSITION',
        message: `Недопустимый переход: ${from} --${action}--> ${to}`,
      });
    }
  }

  /**
   * Что происходит после согласования этапа `approveStage`.
   * @param isLastLiveStage — согласован последний «живой» (не SKIPPED) этап.
   */
  resolveApproval(flags: TypeFlags, isLastLiveStage: boolean): PostApprovalIntent {
    if (!isLastLiveStage) return { kind: 'NEXT_STAGE', status: 'IN_REVIEW' };
    if (flags.requiresSignature) return { kind: 'AWAIT_SIGNATURE', status: 'AWAITING_SIGNATURE' };
    if (flags.usesCell) return { kind: 'ASSIGN_CELL', status: 'APPROVED' };
    return { kind: 'CLOSE', status: 'ISSUED' };
  }
}
