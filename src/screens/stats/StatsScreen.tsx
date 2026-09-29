import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { BreakdownList } from '@/components/BreakdownList';
import { DonutChart } from '@/components/charts/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { YearSwitcher } from '@/components/ui/YearSwitcher';
import { dominantCurrency } from '@/domain/currency';
import { currentMonth, monthKey, type MonthRef } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import {
  breakdownWithOther,
  monthSummary,
  monthlySummaryPoints,
  scopeToCurrency,
} from '@/domain/statement';
import { useActiveLedger, useCategoryOf } from '@/hooks/useActiveLedgerData';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import {
  selectMonthBucket,
  selectMonthTransactions,
  selectYearBucket,
  selectYearTransactions,
  useTransactionStore,
} from '@/stores/transaction.store';
import type { TxKind } from '@/types/domain';
import { makeStyles, CHART_PALETTE, fontSize, radius, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Stats'>,
  NativeStackScreenProps<RootStackParamList>
>;

type StatsGranularity = 'month' | 'year';

const GRANULARITY_TABS: { key: StatsGranularity; label: string }[] = [
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
];

const KIND_TABS = [
  { key: 'expense' as const, label: '支出' },
  { key: 'income' as const, label: '收入' },
];

export const StatsScreen = (_props: Props) => {
  const styles = useStyles();
  const current = currentMonth();
  const [granularity, setGranularity] = useState<StatsGranularity>('month');
  const [month, setMonth] = useState<MonthRef>(current);
  const [year, setYear] = useState(current.year);
  const [kind, setKind] = useState<TxKind>('expense');

  const ledger = useActiveLedger();
  const categoryOf = useCategoryOf();
  const loadMonth = useTransactionStore((state) => state.loadMonth);
  const loadYear = useTransactionStore((state) => state.loadYear);
  const monthTransactions = useTransactionStore((state) =>
    selectMonthTransactions(state, ledger?.id, month),
  );
  const yearTransactions = useTransactionStore((state) =>
    selectYearTransactions(state, ledger?.id, year),
  );
  const monthBucket = useTransactionStore((state) =>
    selectMonthBucket(state, ledger?.id, month),
  );
  const yearBucket = useTransactionStore((state) =>
    selectYearBucket(state, ledger?.id, year),
  );
  const loadCategories = useCategoryStore((state) => state.load);

  const monthKeyValue = monthKey(month);
  useFocusEffect(
    useCallback(() => {
      if (!ledger) return;
      void loadCategories(ledger.id).catch(() => undefined);
      if (granularity === 'year') void loadYear(ledger.id, year);
      else void loadMonth(ledger.id, month);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [granularity, ledger?.id, monthKeyValue, year]),
  );

  const transactions = granularity === 'year' ? yearTransactions : monthTransactions;
  const activeBucket = granularity === 'year' ? yearBucket : monthBucket;
  const loadingInitial =
    ledger !== null &&
    (activeBucket === undefined ||
      (activeBucket.status === 'loading' && transactions.length === 0));
  /** 汇总与构成只统计主币种：不同币种的最小单位不可直接相加 */
  const currency = dominantCurrency(transactions);
  const scoped = scopeToCurrency(transactions, currency);
  const foreignCount = transactions.length - scoped.length;
  const summary = monthSummary(scoped, currency);
  const items = breakdownWithOther(scoped, kind, (id) => categoryOf(id)?.name ?? '未知分类');
  const total = summary.expense + summary.income;
  const expenseRatio = total > 0 ? summary.expense / total : 0;
  const monthPoints = granularity === 'year' ? monthlySummaryPoints(scoped, currency) : [];
  const emptyMessage = granularity === 'year' ? '本年暂无数据' : '本月暂无数据';

  return (
    <View style={styles.container}>
      <ScreenTopBar>
        <Text style={styles.title}>统计</Text>
        {granularity === 'year' ? (
          <YearSwitcher
            year={year}
            onChange={(nextYear) => {
              setYear(nextYear);
              setMonth((currentMonth) => ({ ...currentMonth, year: nextYear }));
            }}
          />
        ) : (
          <MonthSwitcher
            month={month}
            onChange={(nextMonth) => {
              setMonth(nextMonth);
              setYear(nextMonth.year);
            }}
          />
        )}
      </ScreenTopBar>

      {foreignCount > 0 ? (
        <Text style={styles.foreignHint}>
          另有 {foreignCount} 笔外币记录未计入当前统计
        </Text>
      ) : null}

      <View style={styles.tabs}>
        <SegmentedTabs items={GRANULARITY_TABS} value={granularity} onChange={setGranularity} />
      </View>

      <View style={styles.tabs}>
        <SegmentedTabs items={KIND_TABS} value={kind} onChange={setKind} />
      </View>

      {loadingInitial ? (
        <LoadingView message="正在加载统计数据…" />
      ) : (
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {granularity === 'month' ? '本月收支' : '年度收支'}
          </Text>
          <SummaryRow label="支出" value={formatMoney(summary.expense, currency)} />
          <View style={styles.track}>
            <View style={[styles.expenseBar, { flex: Math.max(expenseRatio, 0.001) }]} />
            <View style={[styles.incomeBar, { flex: Math.max(1 - expenseRatio, 0.001) }]} />
          </View>
          <SummaryRow label="收入" value={formatMoney(summary.income, currency)} />
          <SummaryRow
            label="结余"
            value={formatMoney(summary.balance, currency, { signed: true })}
          />
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
                centerLabel={formatMoney(
                  kind === 'expense' ? summary.expense : summary.income,
                  currency,
                )}
                centerSub={kind === 'expense' ? '总支出' : '总收入'}
              />
              <View style={styles.legend}>
                <BreakdownList items={items} currency={currency} showAmount />
              </View>
            </View>
          ) : (
            <EmptyState icon="stats-chart-outline" message={emptyMessage} />
          )}
        </View>

        {granularity === 'year' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>月度明细</Text>
            {monthPoints.map((point) => (
              <View key={point.month} style={styles.monthRow}>
                <Text style={styles.monthLabel}>{point.month}月</Text>
                <View style={styles.monthMetrics}>
                  <Text style={styles.monthExpense}>
                    支出 {formatMoney(point.expense, currency)}
                  </Text>
                  <Text style={styles.monthIncome}>
                    收入 {formatMoney(point.income, currency)}
                  </Text>
                  <Text style={styles.monthBalance}>
                    结余 {formatMoney(point.balance, currency, { signed: true })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      )}
    </View>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => {
  const styles = useStyles();
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryAmount, { flex: 1, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  breakdown: {
    alignItems: 'center',
    gap: space(4),
  },
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
  expenseBar: {
    backgroundColor: colors.danger,
    borderRadius: radius.round,
    height: 6,
  },
  foreignHint: {
    backgroundColor: colors.card,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    paddingBottom: space(2),
    paddingHorizontal: space(4),
  },
  incomeBar: {
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 6,
  },
  legend: {
    alignSelf: 'stretch',
  },
  monthBalance: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  monthExpense: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  monthIncome: {
    color: colors.primary,
    fontSize: fontSize.xs,
  },
  monthLabel: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '500',
    width: 42,
  },
  monthMetrics: {
    alignItems: 'flex-end',
    flex: 1,
    gap: 2,
  },
  monthRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: space(2),
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
}));
