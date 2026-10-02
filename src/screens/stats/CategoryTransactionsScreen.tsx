import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { DaySection } from '@/components/DaySection';
import { EmptyState } from '@/components/EmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { LoadingView } from '@/components/ui/LoadingView';
import { formatMoney } from '@/domain/money';
import { groupByDay } from '@/domain/statement';
import { useActiveCategories, useActiveLedger, useCreatorLabel } from '@/hooks/useActiveLedgerData';
import type { RootStackParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { selectPeriodBucket, selectPeriodTransactions, useTransactionStore } from '@/stores/transaction.store';
import { makeStyles, fontSize, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryTransactions'>;

export const CategoryTransactionsScreen = ({ navigation, route }: Props) => {
  const styles = useStyles();
  const {
    categoryId,
    categoryName,
    currency,
    end,
    memberId,
    periodKey,
    periodLabel,
    start,
  } = route.params;
  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  const creatorLabelOf = useCreatorLabel();
  const loadCategories = useCategoryStore((state) => state.load);
  const loadPeriod = useTransactionStore((state) => state.loadPeriod);
  const periodBucket = useTransactionStore((state) =>
    selectPeriodBucket(state, ledger?.id, periodKey),
  );
  const periodTransactions = useTransactionStore((state) =>
    selectPeriodTransactions(state, ledger?.id, periodKey),
  );

  useFocusEffect(
    useCallback(() => {
      if (!ledger) return undefined;
      void loadCategories(ledger.id).catch(() => undefined);
      void loadPeriod(ledger.id, periodKey, start, end);
      return undefined;
    }, [end, ledger?.id, loadCategories, loadPeriod, periodKey, start]),
  );

  const transactions = useMemo(
    () =>
      periodTransactions
        .filter(
          (tx) =>
            tx.categoryId === categoryId &&
            tx.currency === currency &&
            (!memberId || tx.createdBy === memberId),
        )
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1)),
    [categoryId, currency, memberId, periodTransactions],
  );
  const groups = useMemo(() => groupByDay(transactions), [transactions]);
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const loadingInitial =
    ledger !== null &&
    (periodBucket === undefined ||
      (periodBucket.status === 'loading' && periodTransactions.length === 0));

  return (
    <View style={styles.container}>
      <AppHeader title={`${categoryName}明细`} onBack={() => navigation.goBack()} />
      <View style={styles.filterBar}>
        <Text style={styles.filterText} numberOfLines={1}>
          {periodLabel}
          {memberId ? ' · 已按成员筛选' : ''}
        </Text>
        <Text style={styles.totalText}>
          {transactions.length} 笔 · {formatMoney(total, currency)}
        </Text>
      </View>

      {loadingInitial ? (
        <LoadingView message="正在加载分类明细…" />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {groups.length > 0 ? (
            groups.map((group) => (
              <DaySection
                key={group.key}
                group={group}
                categories={categories}
                readOnly
                creatorNameOf={(tx) => creatorLabelOf(tx.createdBy)}
                onRowPress={(tx) =>
                  navigation.navigate('TransactionPreview', { transactionId: tx.id })
                }
              />
            ))
          ) : (
            <EmptyState icon="receipt-outline" message="当前统计条件下暂无该分类明细" />
          )}
        </ScrollView>
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(3),
  },
  filterBar: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  filterText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: fontSize.xs,
  },
  totalText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
}));
