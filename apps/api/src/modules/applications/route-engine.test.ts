import { describe, expect, it } from 'vitest';
import { RouteEngineService, type StageLike } from './route-engine.service.js';

const events = { write: async () => undefined } as never;
const svc = new RouteEngineService(events);

/** Обходной лист: 5 параллельных этапов (группа 1) + финальный деканат. */
const bypass: StageLike[] = [
  { orderNum: 1, status: 'ACTIVE', parallelGroup: 1 },
  { orderNum: 2, status: 'ACTIVE', parallelGroup: 1 },
  { orderNum: 3, status: 'ACTIVE', parallelGroup: 1 },
  { orderNum: 4, status: 'ACTIVE', parallelGroup: 1 },
  { orderNum: 5, status: 'ACTIVE', parallelGroup: 1 },
  { orderNum: 6, status: 'PENDING', parallelGroup: null },
];

/** Обычный последовательный маршрут. */
const linear: StageLike[] = [
  { orderNum: 1, status: 'APPROVED', parallelGroup: null },
  { orderNum: 2, status: 'ACTIVE', parallelGroup: null },
  { orderNum: 3, status: 'PENDING', parallelGroup: null },
];

describe('RouteEngine · группы этапов', () => {
  it('параллельные этапы попадают в одну группу, одиночные — в свои', () => {
    expect(svc.groupKey(bypass[0])).toBe(svc.groupKey(bypass[4]));
    expect(svc.groupKey(bypass[0])).not.toBe(svc.groupKey(bypass[5]));
    expect(svc.groupKey(linear[0])).not.toBe(svc.groupKey(linear[1]));
  });

  it('группа не закрыта, пока согласованы не все параллельные этапы', () => {
    const afterFirst = bypass.map((s) => (s.orderNum === 1 ? { ...s, status: 'APPROVED' } : s));
    expect(svc.pendingInGroup(afterFirst, afterFirst[0]).length).toBe(4);
  });

  it('группа закрывается, когда согласован последний параллельный этап', () => {
    const allButLast = bypass.map((s) =>
      s.parallelGroup === 1 && s.orderNum !== 5 ? { ...s, status: 'APPROVED' } : s,
    );
    const afterLast = allButLast.map((s) => (s.orderNum === 5 ? { ...s, status: 'APPROVED' } : s));
    const last = afterLast.find((s) => s.orderNum === 5)!;
    expect(svc.pendingInGroup(afterLast, last)).toHaveLength(0);
  });

  it('следующая группа после параллельной — финальный этап', () => {
    const next = svc.nextGroupStages(bypass, bypass[0]);
    expect(next.map((s) => s.orderNum)).toEqual([6]);
  });

  it('следующая группа в линейном маршруте — один этап', () => {
    expect(svc.nextGroupStages(linear, linear[1]).map((s) => s.orderNum)).toEqual([3]);
  });

  it('последняя группа: параллельные этапы не считаются последними, финальный — да', () => {
    expect(svc.isLastLiveStage(bypass, 1)).toBe(false);
    expect(svc.isLastLiveStage(bypass, 6)).toBe(true);
  });

  it('requiresSignature: последней считается предпоследняя группа', () => {
    expect(svc.isLastLiveStage(linear, 2, true)).toBe(true);
    expect(svc.isLastLiveStage(linear, 3, true)).toBe(false);
    expect(svc.signatureStageOrderNum(linear)).toBe(3);
  });

  it('SKIPPED этапы не участвуют в порядке групп', () => {
    const withSkip: StageLike[] = [
      { orderNum: 1, status: 'APPROVED', parallelGroup: null },
      { orderNum: 2, status: 'SKIPPED', parallelGroup: null },
      { orderNum: 3, status: 'ACTIVE', parallelGroup: null },
    ];
    expect(svc.isLastLiveStage(withSkip, 3)).toBe(true);
    expect(svc.nextGroupStages(withSkip, withSkip[0]).map((s) => s.orderNum)).toEqual([3]);
  });
});
