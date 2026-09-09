import type {
  AccessRule,
  AccessRuleCondition,
  AccessRuleGroup,
} from '@edinoe-okno/shared';

export interface EvaluableUser {
  role: string;
  course: number | null;
  groupName: string | null;
  department: string | null;
  isBudget: boolean;
}

export interface AccessDecision {
  allowed: boolean;
  denyMessage?: string;
}

const FIELD_MAP: Record<string, (u: EvaluableUser) => unknown> = {
  is_budget: (u) => u.isBudget,
  role: (u) => u.role,
  course: (u) => u.course,
  group_name: (u) => u.groupName,
  department: (u) => u.department,
};

function evalCondition(c: AccessRuleCondition, u: EvaluableUser): boolean {
  const actual = FIELD_MAP[c.field]?.(u);
  switch (c.op) {
    case 'eq':
      return actual === c.value;
    case 'neq':
      return actual !== c.value;
    case 'in':
      return Array.isArray(c.value) && c.value.includes(actual as never);
    case 'gte':
      return typeof actual === 'number' && typeof c.value === 'number' && actual >= c.value;
    case 'lte':
      return typeof actual === 'number' && typeof c.value === 'number' && actual <= c.value;
    default:
      return false;
  }
}

function isCondition(node: unknown): node is AccessRuleCondition {
  return typeof node === 'object' && node !== null && 'field' in node && 'op' in node;
}

function evalGroup(group: AccessRuleGroup, u: EvaluableUser, depth: number): boolean {
  if (depth > 2) return false; // ТЗ 4.4: вложенность до 2 уровней
  const evalNode = (n: AccessRuleCondition | AccessRuleGroup): boolean =>
    isCondition(n) ? evalCondition(n, u) : evalGroup(n, u, depth + 1);

  if (group.all && group.all.length > 0) {
    if (!group.all.every(evalNode)) return false;
  }
  if (group.any && group.any.length > 0) {
    if (!group.any.some(evalNode)) return false;
  }
  return true;
}

/** ТЗ 4.4. `rule = null` — доступно всем студентам. */
export function evaluateAccessRule(rule: AccessRule | null | undefined, user: EvaluableUser): AccessDecision {
  if (!rule) return { allowed: true };
  const allowed = evalGroup(rule, user, 0);
  return allowed
    ? { allowed: true }
    : { allowed: false, denyMessage: rule.denyMessage ?? 'Этот тип заявки вам недоступен' };
}
