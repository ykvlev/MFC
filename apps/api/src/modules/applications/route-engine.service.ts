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

/** Минимальная форма этапа, достаточная для логики маршрута. */
export interface StageLike {
  id?: string;
  orderNum: number;
  status: string;
  parallelGroup?: number | null;
}

/**
 * Маршруты и этапы (ТЗ 4.2 `application_stages`, 6.5).
 * Название и подразделение копируются в момент подачи.
 *
 * Расширение сверх ТЗ — параллельные этапы: шаги с одинаковым
 * `parallel_group` активируются одновременно и закрывают группу только
 * когда согласованы все (обходной лист).
 */
@Injectable()
export class RouteEngineService {
  constructor(private readonly events: EventLogService) {}

  /** Ключ группы активации: параллельная группа либо сам шаг. */
  groupKey(s: StageLike): string {
    return s.parallelGroup != null ? `g${s.parallelGroup}` : `s${s.orderNum}`;
  }

  /** Упорядоченный список ключей групп по «живым» этапам. */
  private groupOrder(stages: StageLike[]): string[] {
    const live = stages.filter((s) => s.status !== 'SKIPPED').sort((a, b) => a.orderNum - b.orderNum);
    const keys: string[] = [];
    for (const s of live) {
      const k = this.groupKey(s);
      if (!keys.includes(k)) keys.push(k);
    }
    return keys;
  }

  /** Этапы группы, ещё не закрытые согласованием. */
  pendingInGroup(stages: StageLike[], stage: StageLike): StageLike[] {
    const k = this.groupKey(stage);
    return stages.filter(
      (s) => this.groupKey(s) === k && s.orderNum !== stage.orderNum && s.status !== 'APPROVED' && s.status !== 'SKIPPED',
    );
  }

  /** Этапы следующей группы после группы `stage`. */
  nextGroupStages(stages: StageLike[], stage: StageLike): StageLike[] {
    const order = this.groupOrder(stages);
    const idx = order.indexOf(this.groupKey(stage));
    const nextKey = order[idx + 1];
    if (!nextKey) return [];
    return stages.filter((s) => s.status !== 'SKIPPED' && this.groupKey(s) === nextKey);
  }

  /**
   * Создаёт фактические этапы из шаблона маршрута и проводит ведущие авто-этапы.
   * Активирует всю первую группу (для параллельных маршрутов — сразу несколько).
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
    const created: Array<{ id: string; orderNum: number; parallelGroup: number | null; isAuto: boolean; name: string }> = [];

    for (const step of steps) {
      const stage = await tx.applicationStage.create({
        data: {
          applicationId: params.applicationId,
          routeStepId: step.id,
          orderNum: step.orderNum,
          name: step.name,
          approverDepartment: step.approverDepartment,
          parallelGroup: step.parallelGroup,
          status: 'PENDING',
          dueAt: step.slaDays ? addWorkingDays(now, step.slaDays) : null,
        },
      });
      created.push({
        id: stage.id,
        orderNum: step.orderNum,
        parallelGroup: step.parallelGroup,
        isAuto: step.isAuto,
        name: step.name,
      });
    }

    // Проводим ведущие авто-этапы, затем активируем первую «живую» группу.
    let firstActiveId: string | null = null;
    const asStages: StageLike[] = created.map((c) => ({ orderNum: c.orderNum, status: 'PENDING', parallelGroup: c.parallelGroup }));
    const order = this.groupOrder(asStages);

    for (const key of order) {
      const groupSteps = created.filter((c) => this.groupKey({ orderNum: c.orderNum, status: 'PENDING', parallelGroup: c.parallelGroup }) === key);

      if (groupSteps.every((s) => s.isAuto)) {
        // ТЗ 6.5: авто-этап — проверка access_rule, сразу APPROVED или заявка -> REJECTED.
        const decision = evaluateAccessRule(params.typeAccessRule, params.applicant);
        if (!decision.allowed) {
          for (const s of groupSteps) {
            await tx.applicationStage.update({
              where: { id: s.id },
              data: { status: 'REJECTED', actedAt: new Date(), comment: decision.denyMessage },
            });
          }
          return { rejected: true, reason: decision.denyMessage ?? 'Автоматическая проверка не пройдена' };
        }
        for (const s of groupSteps) {
          await tx.applicationStage.update({
            where: { id: s.id },
            data: { status: 'APPROVED', actedAt: new Date(), comment: 'Проверено автоматически' },
          });
          await this.events.write(tx, {
            action: 'application.stage_approved',
            applicationId: params.applicationId,
            payload: { stage: s.name, auto: true },
          });
        }
        continue;
      }

      // Первая неавтоматическая группа — активируем целиком.
      for (const s of groupSteps) {
        await tx.applicationStage.update({ where: { id: s.id }, data: { status: 'ACTIVE' } });
      }
      firstActiveId = groupSteps[0]?.id ?? null;
      break;
    }

    return { activeStageId: firstActiveId };
  }

  /**
   * Последняя «живая» группа согласования.
   * Для типов с офлайн-подписью последняя группа маршрута — подтверждение
   * подписанного скана; предшествующая ей и считается последней группой
   * согласования (ТЗ 6.1).
   */
  isLastLiveStage(stages: StageLike[], approvedOrderNum: number, requiresSignature = false): boolean {
    const stage = stages.find((s) => s.orderNum === approvedOrderNum);
    if (!stage) return false;
    const order = this.groupOrder(stages);
    const lastKey = requiresSignature ? order[order.length - 2] : order[order.length - 1];
    return this.groupKey(stage) === lastKey;
  }

  /** Последний этап маршрута — этап подтверждения скана (для requiresSignature). */
  signatureStageOrderNum(stages: StageLike[]): number {
    const live = stages.filter((s) => s.status !== 'SKIPPED').map((s) => s.orderNum);
    return Math.max(...live);
  }
}
