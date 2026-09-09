import { describe, expect, it } from 'vitest';
import { evaluateAccessRule, type EvaluableUser } from './access-rule.evaluator.js';

const budgetStudent: EvaluableUser = {
  role: 'STUDENT',
  course: 3,
  groupName: 'ИС-21',
  department: null,
  isBudget: true,
};
const paidStudent: EvaluableUser = { ...budgetStudent, isBudget: false };

describe('evaluateAccessRule', () => {
  it('null -> доступно всем', () => {
    expect(evaluateAccessRule(null, paidStudent).allowed).toBe(true);
  });

  it('eq is_budget: бюджетник проходит, внебюджетник — нет с denyMessage', () => {
    const rule = { all: [{ field: 'is_budget' as const, op: 'eq' as const, value: true }], denyMessage: 'только бюджет' };
    expect(evaluateAccessRule(rule, budgetStudent).allowed).toBe(true);
    const denied = evaluateAccessRule(rule, paidStudent);
    expect(denied.allowed).toBe(false);
    expect(denied.denyMessage).toBe('только бюджет');
  });

  it('in / gte / lte', () => {
    expect(
      evaluateAccessRule({ all: [{ field: 'group_name', op: 'in', value: ['ИС-21', 'ПМ-32'] }] }, budgetStudent).allowed,
    ).toBe(true);
    expect(evaluateAccessRule({ all: [{ field: 'course', op: 'gte', value: 2 }] }, budgetStudent).allowed).toBe(true);
    expect(evaluateAccessRule({ all: [{ field: 'course', op: 'lte', value: 2 }] }, budgetStudent).allowed).toBe(false);
  });

  it('any (ИЛИ)', () => {
    const rule = {
      any: [
        { field: 'is_budget' as const, op: 'eq' as const, value: true },
        { field: 'course' as const, op: 'gte' as const, value: 5 },
      ],
    };
    expect(evaluateAccessRule(rule, paidStudent).allowed).toBe(false);
    expect(evaluateAccessRule(rule, { ...paidStudent, course: 5 }).allowed).toBe(true);
  });

  it('вложенность: all -> any', () => {
    const rule = {
      all: [
        { field: 'role' as const, op: 'eq' as const, value: 'STUDENT' },
        { any: [{ field: 'course' as const, op: 'eq' as const, value: 1 }, { field: 'course' as const, op: 'eq' as const, value: 3 }] },
      ],
    };
    expect(evaluateAccessRule(rule, budgetStudent).allowed).toBe(true);
    expect(evaluateAccessRule(rule, { ...budgetStudent, course: 2 }).allowed).toBe(false);
  });
});
