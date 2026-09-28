import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BreakdownList } from '@/components/BreakdownList';
import { DonutChart } from '@/components/charts/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { currentMonth, monthKey, type MonthRef } from '@/domain/dates';
import { formatCents } from '@/domain/money';
import { breakdownWithOther, monthSummary } from '@/domain/statement';
import { useActiveLedger, useCategoryOf } from '@/hooks/useActiveLedgerData';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { selectMonthTransactions, useTransactionStore } from '@/stores/transaction.store';
import type { TxKind } from '@/types/domain';
import { createStyles, CHART_PALETTE, colors, fontSize, radius, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Stats'>,
  NativeStackScreenProps<RootStackParamList>
>;

const KIND_TABS = [
  { key: 'expense' as const, label: '支出' },
  { key: 'income' as const, label: '收入' },
];

export const StatsScreen = (_props: Props) => {
  const [month, setMonth] = useState<MonthRef>(currentMonth());
  const [kind, setKind] = useState<TxKind>('expense');

  const ledger = useActiveLedger();
  const categoryOf = useCategoryOf();
  const transactions = useTransactionStore((state) =>
    selectMonthTransactions(state, ledger?.id, month),
  );
  const loadMonth = useTransactionStore((state) => state.loadMonth);

  const monthKeyValue = monthKey(month);
  useFocusEffect(
    useCallback(() => {
      if (!ledger) return;
      void loadMonth(ledger.id, month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ledger?.id, monthKeyValue]),
  );

  const summary = monthSummary(transactions);
  const items = breakdownWithOther(
    transactions,
    kind,
    (id) => categoryOf(id)?.name ?? '未知分类',
  );
  const total = summary.expense + summary.income;
  const expenseRatio = total > 0 ? summary.expense / total : 0;

  return (
    <View style={styles.container}>
      <ScreenTopBar>
        <Text style={styles.title}>统计</Text>
        <MonthSwitcher month={month} onChange={setMonth} />
      </ScreenTopBar>

      <View style={styles.tabs}>
        <SegmentedTabs items={KIND_TABS} value={kind} onChange={setKind} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>本月收支</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>支出</Text>
            <Text style={[styles.summaryAmount, { flex: 1, textAlign: 'right' }]}>
              {formatCents(summary.expense)}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.expenseBar, { flex: Math.max(expenseRatio, 0.001) }]} />
            <View style={[styles.incomeBar, { flex: Math.max(1 - expenseRatio, 0.001) }]} />
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>收入</Text>
            <Text style={[styles.summaryAmount, { flex: 1, textAlign: 'right' }]}>
              {formatCents(summary.income)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{kind === 'expense' ? '支出' : '收入'}构成</Text>
          {items.length > 0 ? (
            /* 环形图与明细上下排布：明细独占整卡宽度，保证再长的分类名也能完整展示 */
            <View style={styles.breakdown}>
              <DonutChart
                size={150}
                segments={items.map((item, index) => ({
                  value: item.amount,
                  color: CHART_PALETTE[index % CHART_PALETTE.length],
                }))}
                centerLabel={formatCents(kind === 'expense' ? summary.expense : summary.income)}
                centerSub={kind === 'expense' ? '总支出' : '总收入'}
              />
              {/* alignSelf: stretch 让明细撑满整卡宽度，长分类名换行而非省略 */}
              <View style={styles.legend}>
                <BreakdownList items={items} showAmount />
              </View>
            </View>
          ) : (
            <EmptyState icon="stats-chart-outline" message="本月暂无数据" />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = createStyles({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(3),
    padding: space(4),
  },
  cardTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: space(3),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(3),
  },
  breakdown: {
    alignItems: 'center',
    gap: space(4),
  },
  legend: {
    alignSelf: 'stretch',
  },
  expenseBar: {
    backgroundColor: colors.danger,
    borderRadius: radius.round,
    height: 6,
  },
  incomeBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 6,
  },
  summaryAmount: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(1.5),
  },
  tabs: {
    backgroundColor: colors.card,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  track: {
    flexDirection: 'row',
    gap: space(1),
    marginVertical: space(2),
  },
});
