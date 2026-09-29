/** 领域类型（与数据库解耦，金额单位一律为“分”） */

import type { CurrencyCode } from '@/domain/currency';

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

/** 记账标签：属于账本的某个分类，可在同分类下反复选用 */
export interface Tag {
  id: string;
  ledgerId: string;
  /** 所属分类 ID（标签只在所属分类下展示与新增） */
  categoryId: string;
  name: string;
  createdAt: string;
}

/**
 * 记账类型扩展属性：数据库以 JSONB 保存，后续新增类型无需改表。
 * 当前仅支持 reimbursement（是否报销），新增布尔类型时在此追加字段即可。
 */
export interface TransactionAttributes {
  /** 是否报销 */
  reimbursement: boolean;
  /** 预留扩展：后续记账类型均以布尔值追加 */
  [key: string]: boolean;
}

export interface Transaction {
  id: string;
  ledgerId: string;
  categoryId: string;
  kind: TxKind;
  /** 金额，单位：该币种的最小单位（人民币/美元为分） */
  amount: number;
  /** 币种，默认 CNY */
  currency: CurrencyCode;
  /** 标签 ID，null 表示未打标签。标签可复用，与本笔备注无关 */
  tagId: string | null;
  /** 本笔备注；与标签分开，仅属于本笔、不可复用 */
  note: string;
  /** 记账类型扩展属性（当前含是否报销） */
  attributes: TransactionAttributes;
  /** 本笔账单图片的公开访问 URL，最多 3 张 */
  images: string[];
  /** ISO 8601 */
  occurredAt: string;
  createdBy: string;
}

export interface CreateTransactionInput {
  ledgerId: string;
  categoryId: string;
  kind: TxKind;
  amount: number;
  currency: CurrencyCode;
  tagId: string | null;
  note: string;
  attributes: TransactionAttributes;
  images: string[];
  occurredAt: string;
}

export interface UpdateTransactionInput {
  categoryId?: string;
  kind?: TxKind;
  amount?: number;
  currency?: CurrencyCode;
  tagId?: string | null;
  note?: string;
  attributes?: TransactionAttributes;
  images?: string[];
  occurredAt?: string;
}

export interface TagInput {
  ledgerId: string;
  categoryId: string;
  name: string;
}

export interface CategoryInput {
  ledgerId: string;
  name: string;
  icon: string;
  kind: TxKind;
  sortOrder: number;
}

/** 应用更新：由 GitHub Release 映射而来（仅正式发布版本） */
export interface AppRelease {
  /** Release tag，如 `v0.1.7` */
  tagName: string;
  /** 归一化版本号，如 `0.1.7` */
  version: string;
  /** Release 标题 */
  title: string;
  /** Release 说明原文（含 SHA256 / 镜像行） */
  notes: string;
  /** Release 页面地址（无可下载安装包时给用户兜底跳转） */
  pageUrl: string;
  /** 安装包下载地址 */
  apkUrl: string;
  /** 安装包字节数（GitHub 提供，用于下载前后校验） */
  apkSize: number | null;
  /** 安装包 SHA-256（来自 Release 说明，可能缺失） */
  sha256: string | null;
  /** 说明里声明的镜像地址（国内加速用） */
  mirrors: string[];
  /** 发布时间（ISO 字符串） */
  publishedAt: string | null;
}
