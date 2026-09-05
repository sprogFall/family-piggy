import { useCallback } from 'react';

import { selectActiveLedger, useLedgerStore } from '@/stores/ledger.store';
import { selectCategories, useCategoryStore } from '@/stores/category.store';
import { selectMonthTransactions, useTransactionStore } from '@/stores/transaction.store';
import type { MonthRef } from '@/domain/dates';
import type { Category } from '@/types/domain';

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

export const useMonthTransactions = (month: MonthRef) => {
  const ledger = useActiveLedger();
  return useTransactionStore((state) => selectMonthTransactions(state, ledger?.id, month));
};
