/** Supabase 行类型 -> 领域类型映射 */

import type {
  Category,
  Family,
  Ledger,
  Profile,
  Transaction,
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

export interface TransactionRow {
  id: string;
  ledger_id: string;
  category_id: string;
  kind: 'expense' | 'income';
  /** Postgres bigint 经 supabase-js 可能返回 string */
  amount: number | string;
  note: string | null;
  occurred_at: string;
  created_by: string;
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

export const toTransaction = (row: TransactionRow): Transaction => ({
  id: row.id,
  ledgerId: row.ledger_id,
  categoryId: row.category_id,
  kind: row.kind,
  amount: Number(row.amount),
  note: row.note,
  occurredAt: row.occurred_at,
  createdBy: row.created_by,
});
