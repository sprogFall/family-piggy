import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BreakdownList } from '@/components/BreakdownList';
import { DonutChart } from '@/components/charts/DonutChart';
import { TrendChart } from '@/components/charts/TrendChart';
import { EmptyState } from '@/components/EmptyState';
import { LedgerSwitcherSheet } from '@/components/LedgerSwitcherSheet';
import { SummaryCard } from '@/components/SummaryCard';
import { MonthPickerSheet } from '@/components/ui/MonthPickerSheet';
import { PromptModal } from '@/components/ui/PromptModal';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { currentMonth, monthKey, monthLabel, type MonthRef } from '@/domain/dates';
import { formatCents } from '@/domain/money';
import { breakdownWithOther, monthSummary, trendByDay } from '@/domain/statement';
import { useActiveLedger, useCategoryOf, useMonthTransactions } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { createStyles, CHART_PALETTE, colors, fontSize, radius, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const HomeScreen = ({ navigation }: Props) => {
  const [month, setMonth] = useState<MonthRef>(currentMonth());
  const [showLedgerSheet, setShowLedgerSheet] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showCreateLedger, setShowCreateLedger] = useState(false);

  const ledger = useActiveLedger();
  const categoryOf = useCategoryOf();
  const transactions = useMonthTransactions(month);

  const loadMonth = useTransactionStore((state) => state.loadMonth);
  const subscribe = useTransactionStore((state) => state.subscribe);
  const loadCategories = useCategoryStore((state) => state.load);
  const createPersonalLedger = useLedgerStore((state) => state.createPersonalLedger);

  const monthKeyValue = monthKey(month);
  useFocusEffect(
    useCallback(() => {
      if (!ledger) return undefined;
      void loadMonth(ledger.id, month);
      void loadCategories(ledger.id);
      return subscribe(ledger.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ledger?.id, monthKeyValue]),
  );

  const summary = monthSummary(transactions);
  const trendValues = trendByDay(transactions, month).map((point) => point.expense);
  const breakdownItems = breakdownWithOther(
    transactions,
    'expense',
    (id) => categoryOf(id)?.name ?? '未知分类',
  );

  return (
    <View style={styles.container}>
      <ScreenTopBar>
        <Pressable style={styles.ledgerChip} onPress={() => setShowLedgerSheet(true)}>
          <Ionicons name="book" size={16} color={colors.primary} />
          <Text style={styles.ledgerName} numberOfLines={1}>
            {ledger?.name ?? '选择账本'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>
        <Pressable style={styles.monthChip} onPress={() => setShowMonthPicker(true)}>
          <Text style={styles.monthText}>{monthLabel(month)}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>
      </ScreenTopBar>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {ledger ? (
          <>
            <SummaryCard
              expense={summary.expense}
              income={summary.income}
              balance={summary.balance}
              budget={ledger.monthlyBudget}
              onPressBudget={() => navigation.navigate('Budget')}
            />

            <View style={styles.card}>
              <Text style={styles.cardTitle}>本月收支趋势</Text>
              <TrendChart values={trendValues} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>支出占比</Text>
              {breakdownItems.length > 0 ? (
                <View style={styles.donutRow}>
                  <DonutChart
                    segments={breakdownItems.map((item, index) => ({
                      value: item.amount,
                      color: CHART_PALETTE[index % CHART_PALETTE.length],
                    }))}
                    centerLabel={formatCents(summary.expense)}
                    centerSub="本月支出"
                  />
                  <View style={styles.legend}>
                    <BreakdownList items={breakdownItems} />
                  </View>
                </View>
              ) : (
                <EmptyState icon="pie-chart-outline" message="本月暂无支出记录" />
              )}
            </View>
          </>
        ) : (
          <EmptyState icon="wallet-outline" message="暂无账本，下拉切换账本以创建" />
        )}
      </ScrollView>

      <LedgerSwitcherSheet
        visible={showLedgerSheet}
        onClose={() => setShowLedgerSheet(false)}
        onSelect={(selected) => useLedgerStore.getState().setActive(selected.id)}
        onCreatePersonal={() => setShowCreateLedger(true)}
        onManageFamilies={() => {
          setShowLedgerSheet(false);
          navigation.navigate('FamilyHub');
        }}
      />
      <MonthPickerSheet
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        value={month}
        onSelect={setMonth}
      />
      <PromptModal
        visible={showCreateLedger}
        onClose={() => setShowCreateLedger(false)}
        title="新建个人账本"
        placeholder="账本名称"
        onSubmit={(name) => {
          void createPersonalLedger(name).catch((error: unknown) =>
            showAlert('创建失败', getErrorMessage(error)),
          );
        }}
      />
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
    padding: space(4),
  },
  donutRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(4),
  },
  ledgerChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: space(1),
    maxWidth: '60%',
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  ledgerName: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  legend: {
    flex: 1,
  },
  monthChip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(1),
  },
  monthText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
});
