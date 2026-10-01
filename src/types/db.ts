/** Supabase 行类型 -> 领域类型映射 */

import { DEFAULT_CURRENCY, isCurrencyCode } from '@/domain/currency';
import { MAX_TRANSACTION_IMAGES } from '@/domain/transaction-images';
import type {
  Category,
  Family,
  Ledger,
  Profile,
  RecurringRule,
  RecurringSchedule,
  Tag,
  Transaction,
  TransactionAttributes,
} from './domain';

export interface ProfileRow {
  id: string;
  nickname: string;
  avatar_url: string | null;
}

export interface FamilyRow {
  id: string;
  name: string;
  owner_id: string;
  invite_code: string;
  created_at: string;
}

export interface FamilyMemberRow {
  family_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface LedgerRow {
  id: string;
  name: string;
  type: 'personal' | 'family';
  owner_id: string;
  family_id: string | null;
  monthly_budget: number | string;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  ledger_id: string;
  name: string;
  icon: string;
  kind: 'expense' | 'income';
  sort_order: number;
}

export interface TagRow {
  id: string;
  ledger_id: string;
  category_id: string;
  name: string;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  ledger_id: string;
  category_id: string;
  kind: 'expense' | 'income';
  /** Postgres bigint 经 supabase-js 可能返回 string */
  amount: number | string;
  currency: string;
  tag_names: unknown;
  note: string | null;
  /** 记账类型扩展字段（Postgres jsonb，旧行可能为 null） */
  attributes: unknown;
  /** 账单图片公开 URL 数组（Postgres text[]，旧行可能为 null） */
  images: unknown;
  occurred_at: string;
  created_by: string;
}

export interface RecurringRuleRow {
  id: string;
  ledger_id: string;
  category_id: string;
  kind: 'expense' | 'income';
  amount: number | string;
  currency: string;
  tag_names: unknown;
  note: string | null;
  attributes: unknown;
  images: unknown;
  frequency: string;
  monthly_day: number | null;
  weekly_day: number | null;
  time_zone: string;
  next_run_on: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  nickname: row.nickname,
  avatarUrl: row.avatar_url,
});

export const toFamily = (row: FamilyRow): Family => ({
  id: row.id,
  name: row.name,
  ownerId: row.owner_id,
  inviteCode: row.invite_code,
  createdAt: row.created_at,
});

export const toLedger = (row: LedgerRow): Ledger => ({
  id: row.id,
  name: row.name,
  type: row.type,
  ownerId: row.owner_id,
  familyId: row.family_id,
  monthlyBudget: Number(row.monthly_budget ?? 0),
  createdAt: row.created_at,
});

export const toCategory = (row: CategoryRow): Category => ({
  id: row.id,
  ledgerId: row.ledger_id,
  name: row.name,
  icon: row.icon,
  kind: row.kind,
  sortOrder: row.sort_order,
});

export const toTag = (row: TagRow): Tag => ({
  id: row.id,
  ledgerId: row.ledger_id,
  categoryId: row.category_id,
  name: row.name,
  createdAt: row.created_at,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toTransactionAttributes = (value: unknown): TransactionAttributes => {
  const source = isRecord(value) ? value : {};
  const attributes: TransactionAttributes = {
    reimbursement: source.reimbursement === true,
  };
  // 预留扩展：未知的布尔字段原样透传，后续新增记账类型无需改表
  for (const [key, item] of Object.entries(source)) {
    if (key !== 'reimbursement' && typeof item === 'boolean') attributes[key] = item;
  }
  return attributes;
};

const toStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item !== '')
    : [];

const toTransactionImages = (value: unknown): string[] =>
  toStringArray(value).slice(0, MAX_TRANSACTION_IMAGES);

export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  ledgerId: row.ledger_id,
  categoryId: row.category_id,
  kind: row.kind,
  amount: Number(row.amount),
  currency: isCurrencyCode(row.currency) ? row.currency : DEFAULT_CURRENCY,
  tagNames: toStringArray(row.tag_names),
  note: row.note ?? '',
  attributes: toTransactionAttributes(row.attributes),
  images: toTransactionImages(row.images),
  occurredAt: row.occurred_at,
  createdBy: row.created_by,
});

const toRecurringSchedule = (row: RecurringRuleRow): RecurringSchedule => {
  if (row.frequency === 'weekly') {
    return { frequency: 'weekly', weeklyDay: row.weekly_day ?? 0 };
  }
  return { frequency: 'monthly', monthlyDay: row.monthly_day ?? 1 };
};

export const toRecurringRule = (row: RecurringRuleRow): RecurringRule => ({
  id: row.id,
  ledgerId: row.ledger_id,
  categoryId: row.category_id,
  kind: row.kind,
  amount: Number(row.amount),
  currency: isCurrencyCode(row.currency) ? row.currency : DEFAULT_CURRENCY,
  tagNames: toStringArray(row.tag_names),
  note: row.note ?? '',
  attributes: toTransactionAttributes(row.attributes),
  images: toTransactionImages(row.images),
  schedule: toRecurringSchedule(row),
  timeZone: row.time_zone,
  nextRunOn: row.next_run_on,
  isActive: row.is_active,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

