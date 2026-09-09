import type { UserRole } from './user.js';

export const FIELD_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'DATE_RANGE',
  'SELECT',
  'CHECKBOX',
  'FILE',
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export interface SelectOption {
  value: string;
  label: string;
}

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  default?: unknown;
  visibleFor?: UserRole[];

  // TEXT / TEXTAREA
  minLength?: number;
  maxLength?: number;
  pattern?: string;

  // NUMBER
  min?: number;
  max?: number;
  step?: number;

  // DATE / DATE_RANGE — 'today', 'today+30', ISO
  minDate?: string;
  maxDate?: string;

  // SELECT
  options?: Array<string | SelectOption>;
  multiple?: boolean;

  // FILE
  accept?: string[];
  maxSizeMb?: number;
}

export type FieldsSchema = FieldSchema[];

// --- access_rule ---

export const ACCESS_RULE_OPS = ['eq', 'neq', 'in', 'gte', 'lte'] as const;
export type AccessRuleOp = (typeof ACCESS_RULE_OPS)[number];

export const ACCESS_RULE_FIELDS = [
  'is_budget',
  'role',
  'course',
  'group_name',
  'department',
] as const;
export type AccessRuleField = (typeof ACCESS_RULE_FIELDS)[number];

export interface AccessRuleCondition {
  field: AccessRuleField;
  op: AccessRuleOp;
  value: unknown;
}

export interface AccessRuleGroup {
  all?: Array<AccessRuleCondition | AccessRuleGroup>;
  any?: Array<AccessRuleCondition | AccessRuleGroup>;
}

export type AccessRule = AccessRuleGroup & { denyMessage?: string };
