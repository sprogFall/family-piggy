import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DaySection } from '@/components/DaySection';
import { EmptyState } from '@/components/EmptyState';
import { LedgerSwitcherSheet } from '@/components/LedgerSwitcherSheet';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PromptModal } from '@/components/ui/PromptModal';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { dominantCurrency } from '@/domain/currency';
import { currentMonth, monthKey, type MonthRef } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { groupByDay, monthSummary, scopeToCurrency } from '@/domain/statement';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import {
  useActiveLedger,
  useActiveCategories,
  useCreatorLabel,
  useTagNameOf,
} from '@/hooks/useActiveLedgerData';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useTagStore } from '@/stores/tag.store';
import { selectMonthTransactions, useTransactionStore } from '@/stores/transaction.store';
import { createStyles, colors, fontSize, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Bills'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const BillsScreen = ({ navigation }: Props) => {
  const [month, setMonth] = useState<MonthRef>(currentMonth());
  const [showLedgerSheet, setShowLedgerSheet] = useState(false);
  const [showCreateLedger, setShowCreateLedger] = useState(false);

  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  /** 家庭账本展示「谁记的」；个人账本恒为 null，不展示 */
  const creatorLabelOf = useCreatorLabel();
  const tagNameOf = useTagNameOf();
  const transactions = useTransactionStore((state) =>
    selectMonthTransactions(state, ledger?.id, month),
  );

  const loadMonth = useTransactionStore((state) => state.loadMonth);
  const subscribe = useTransactionStore((state) => state.subscribe);
  const loadCategories = useCategoryStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  const createPersonalLedger = useLedgerStore((state) => state.createPersonalLedger);

  const monthKeyValue = monthKey(month);
  useFocusEffect(
    useCallback(() => {
      if (!ledger) return undefined;
      void loadMonth(ledger.id, month);
      void loadCategories(ledger.id);
      void loadTags(ledger.id).catch(() => undefined);
      return subscribe(ledger.id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ledger?.id, monthKeyValue]),
  );

  const groups = groupByDay(transactions);
  /** 顶部汇总只统计主币种：不同币种的最小单位不可直接相加 */
  const currency = dominantCurrency(transactions);
  const summary = monthSummary(transactions, currency);
  const foreignCount = transactions.length - scopeToCurrency(transactions, currency).length;

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
        <MonthSwitcher month={month} onChange={setMonth} />
      </ScreenTopBar>

      <View style={styles.summaryBar}>
        <SummaryItem label="支出" value={formatMoney(summary.expense, currency)} />
        <SummaryItem label="收入" value={formatMoney(summary.income, currency)} />
        <SummaryItem
          label="结余"
          value={formatMoney(summary.balance, currency, { signed: true })}
        />
      </View>
      {foreignCount > 0 ? (
        <Text style={styles.foreignHint}>另有 {foreignCount} 笔外币记录未计入上方汇总</Text>
      ) : null}

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {groups.length === 0 ? (
          <EmptyState icon="receipt-outline" message="本月暂无账单，点击下方 + 记一笔" />
        ) : (
          groups.map((group) => (
            <DaySection
              key={group.key}
              group={group}
              categories={categories}
              tagNameOf={tagNameOf}
              creatorNameOf={(tx) => creatorLabelOf(tx.createdBy)}
              onRowPress={(tx) => navigation.navigate('AddTransaction', { transactionId: tx.id })}
            />
          ))
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

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = createStyles({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  foreignHint: {
    backgroundColor: colors.card,
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    paddingBottom: space(2),
    paddingHorizontal: space(4),
  },
  ledgerChip: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 999,
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
  list: {
    padding: space(3),
  },
  summaryBar: {
    backgroundColor: colors.card,
    flexDirection: 'row',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  summaryValue: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 2,
  },
});
