/** 领域类型（与数据库解耦，金额单位一律为“分”） */

export type LedgerType = 'personal' | 'family';
export type TxKind = 'expense' | 'income';
export type FamilyRole = 'owner' | 'member';

export const KIND_LABEL: Record<TxKind, string> = {
  expense: '支出',
  income: '收入',
};

export interface Profile {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
}

export interface FamilyMember {
  familyId: string;
  userId: string;
  role: FamilyRole;
  nickname: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface Ledger {
  id: string;
  name: string;
  type: LedgerType;
  ownerId: string;
  familyId: string | null;
  /** 月度预算（分），0 表示未设置 */
  monthlyBudget: number;
  createdAt: string;
}

export interface Category {
  id: string;
  ledgerId: string;
  name: string;
  icon: string;
  kind: TxKind;
  sortOrder: number;
}

/** 记账标签：属于账本且区分收支类型，可在同类型下反复选用 */
export interface Tag {
  id: string;
  ledgerId: string;
  kind: TxKind;
  name: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  ledgerId: string;
  categoryId: string;
  kind: TxKind;
  /** 金额，单位：分 */
  amount: number;
  /** 标签 ID，null 表示未打标签 */
  tagId: string | null;
  /** ISO 8601 */
  occurredAt: string;
  createdBy: string;
}

export interface CreateTransactionInput {
  ledgerId: string;
  categoryId: string;
  kind: TxKind;
  amount: number;
  tagId: string | null;
  occurredAt: string;
}

export interface UpdateTransactionInput {
  categoryId?: string;
  kind?: TxKind;
  amount?: number;
  tagId?: string | null;
  occurredAt?: string;
}

export interface TagInput {
  ledgerId: string;
  kind: TxKind;
  name: string;
}

export interface CategoryInput {
  ledgerId: string;
  name: string;
  icon: string;
  kind: TxKind;
  sortOrder: number;
}
