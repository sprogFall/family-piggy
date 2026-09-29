import { useCallback, useMemo } from 'react';

import { useFocusEffect } from '@react-navigation/native';

import { creatorLabel } from '@/domain/attribution';
import type { MonthRef } from '@/domain/dates';
import { useAuthStore } from '@/stores/auth.store';
import { selectCategories, useCategoryStore } from '@/stores/category.store';
import { selectActiveLedger, selectMembers, useLedgerStore } from '@/stores/ledger.store';
import { selectTags, useTagStore } from '@/stores/tag.store';
import { selectMonthTransactions, useTransactionStore } from '@/stores/transaction.store';
import type { Category, FamilyMember, Tag } from '@/types/domain';

export const useActiveLedger = () => useLedgerStore(selectActiveLedger);

export const useActiveCategories = (): Category[] => {
  const ledger = useActiveLedger();
  return useCategoryStore((state) => selectCategories(state, ledger?.id));
};

export const useCategoryOf = (): ((categoryId: string) => Category | undefined) => {
  const categories = useActiveCategories();
  return useCallback(
    (categoryId: string) => categories.find((category) => category.id === categoryId),
    [categories],
  );
};

/** 当前账本某分类下的标签（记账时点选复用）；未选分类返回空数组 */
export const useActiveTags = (categoryId: string | null): Tag[] => {
  const ledger = useActiveLedger();
  return useTagStore((state) => selectTags(state, ledger?.id, categoryId));
};

/** 标签 ID -> 标签名；未加载或已删除时返回空串 */
export const useTagNameOf = (): ((tagId: string) => string) => {
  const ledger = useActiveLedger();
  const ledgerTags = useTagStore((state) =>
    ledger?.id ? state.byLedger[ledger.id] : undefined,
  );
  return useMemo(() => {
    const nameById = new Map<string, string>();
    for (const tags of Object.values(ledgerTags ?? {})) {
      for (const tag of tags) nameById.set(tag.id, tag.name);
    }
    return (tagId: string) => nameById.get(tagId) ?? '';
  }, [ledgerTags]);
};

/**
 * 当前家庭账本的成员：账本为家庭时确保成员已加载，个人账本返回稳定空数组。
 * 成员数据用于「谁记的」标注，加载失败时静默降级（不标注，不影响记账主流程）。
 */
export const useActiveFamilyMembers = (): FamilyMember[] => {
  const ledger = useActiveLedger();
  const familyId = ledger?.type === 'family' ? ledger.familyId : null;
  const members = useLedgerStore((state) => selectMembers(state, familyId ?? ''));
  const loadMembers = useLedgerStore((state) => state.loadMembers);

  useFocusEffect(
    useCallback(() => {
      if (!familyId) return undefined;
      void loadMembers(familyId).catch(() => undefined);
      return undefined;
    }, [familyId, loadMembers]),
  );

  return members;
};

/**
 * 记录人展示名：仅家庭账本返回标注，统一展示成员昵称（本人也不显示「我」）；
 * 个人账本、成员资料未加载或成员已退出家庭时返回 null，由 UI 决定隐藏。
 */
export const useCreatorLabel = (): ((createdBy: string) => string | null) => {
  const ledger = useActiveLedger();
  const viewerId = useAuthStore((state) => state.session?.user.id ?? null);
  const profile = useAuthStore((state) => state.profile);
  const members = useActiveFamilyMembers();
  const isFamily = ledger?.type === 'family';
  const profileNickname = profile?.nickname ?? null;

  return useCallback(
    (createdBy: string) => {
      if (!isFamily) return null;
      const memberNickname = members.find((member) => member.userId === createdBy)?.nickname;
      const selfNickname = createdBy === viewerId ? profileNickname : null;
      return creatorLabel(createdBy, selfNickname ?? memberNickname);
    },
    [isFamily, members, profileNickname, viewerId],
  );
};

export const useMonthTransactions = (month: MonthRef) => {
  const ledger = useActiveLedger();
  return useTransactionStore((state) => selectMonthTransactions(state, ledger?.id, month));
};
