import { Injectable } from '@nestjs/common';
import type { AccessRule } from '@edinoe-okno/shared';
import type { Prisma } from '@prisma/client';
import { EventLogService } from '../events/event-log.service.js';
import { evaluateAccessRule, type EvaluableUser } from '../application-types/access-rule.evaluator.js';

type Tx = Prisma.TransactionClient;

function addWorkingDays(from: Date, days: number): Date {
  const d = new Date(from);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export interface AutoStageRejection {
  rejected: true;
  reason: string;
}

/**
 * Маршруты и этапы (ТЗ 4.2 `application_stages`, 6.5).
 * Название и подразделение копируются в момент подачи.
 */
@Injectable()
export class RouteEngineService {
  constructor(private readonly events: EventLogService) {}

  /**
   * Создаёт фактические этапы из шаблона маршрута и проводит ведущие авто-этапы.
   * Возвращает id первого ACTIVE этапа, либо отказ, если авто-этап не пройден.
   */
  async materialize(
    tx: Tx,
    params: {
      applicationId: string;
      typeId: string;
      applicant: EvaluableUser;
      typeAccessRule: AccessRule | null;
    },
  ): Promise<{ activeStageId: string | null } | AutoStageRejection> {
    const steps = await tx.routeStep.findMany({
      where: { typeId: params.typeId },
      orderBy: { orderNum: 'asc' },
    });

    const now = new Date();
    let firstActiveId: string | null = null;

    for (const step of steps) {
      const stage = await tx.applicationStage.create({
        data: {
          applicationId: params.applicationId,
          routeStepId: step.id,
          orderNum: step.orderNum,
          name: step.name,
          approverDepartment: step.approverDepartment,
          status: 'PENDING',
          dueAt: step.slaDays ? addWorkingDays(now, step.slaDays) : null,
        },
      });

      if (firstActiveId === null && !step.isAuto) {
        await tx.applicationStage.update({ where: { id: stage.id }, data: { status: 'ACTIVE' } });
        firstActiveId = stage.id;
        continue;
      }

      if (firstActiveId === null && step.isAuto) {
        // ТЗ 6.5: авто-этап — проверка access_rule, сразу APPROVED или заявка -> REJECTED.
        const decision = evaluateAccessRule(params.typeAccessRule, params.applicant);
        if (!decision.allowed) {
          await tx.applicationStage.update({
            where: { id: stage.id },
            data: { status: 'REJECTED', actedAt: new Date(), comment: decision.denyMessage },
          });
          return { rejected: true, reason: decision.denyMessage ?? 'Автоматическая проверка не пройдена' };
        }
        await tx.applicationStage.update({
          where: { id: stage.id },
          data: { status: 'APPROVED', actedAt: new Date(), comment: 'Проверено автоматически' },
        });
        await this.events.write(tx, {
          action: 'application.stage_approved',
          applicationId: params.applicationId,
          payload: { stage: step.name, auto: true },
        });
      }
    }

    return { activeStageId: firstActiveId };
  }

  /** Индекс последнего «живого» этапа (не SKIPPED). */
  isLastLiveStage(
    stages: Array<{ orderNum: number; status: string }>,
    approvedOrderNum: number,
  ): boolean {
    const live = stages
      .filter((s) => s.status !== 'SKIPPED')
      .map((s) => s.orderNum)
      .sort((a, b) => a - b);
    return live[live.length - 1] === approvedOrderNum;
  }
}
