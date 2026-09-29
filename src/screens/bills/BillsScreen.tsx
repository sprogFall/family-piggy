import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { DaySection } from '@/components/DaySection';
import { EmptyState } from '@/components/EmptyState';
import { LedgerSwitcherSheet } from '@/components/LedgerSwitcherSheet';
import { LoadingView } from '@/components/ui/LoadingView';
import { MonthSwitcher } from '@/components/ui/MonthSwitcher';
import { PromptModal } from '@/components/ui/PromptModal';
import { SearchBar } from '@/components/ui/SearchBar';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TransactionTypeFilter } from '@/components/ui/TransactionTypeFilter';
import { dominantCurrency } from '@/domain/currency';
import { currentMonth, monthKey, type MonthRef } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { groupByDay, monthSummary, scopeToCurrency } from '@/domain/statement';
import {
  filterTransactions,
  type TransactionKindFilterValue,
  type TransactionTypeFilterValue,
} from '@/domain/transaction-filter';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import { transactionImageService } from '@/services/transaction-image.service';
import {
  useActiveCategories,
  useActiveFamilyMembers,
  useActiveLedger,
  useCreatorLabel,
  useTagNameOf,
} from '@/hooks/useActiveLedgerData';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { useLedgerStore } from '@/stores/ledger.store';
import { useTagStore } from '@/stores/tag.store';
import {
  selectMonthBucket,
  selectMonthTransactions,
  useTransactionStore,
} from '@/stores/transaction.store';
import type { Transaction } from '@/types/domain';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Bills'>,
  NativeStackScreenProps<RootStackParamList>
>;

const KIND_FILTER_ITEMS: { key: TransactionKindFilterValue; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'expense', label: '支出' },
  { key: 'income', label: '收入' },
];

export const BillsScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [month, setMonth] = useState<MonthRef>(currentMonth());
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilterValue>('all');
  const [kindFilter, setKindFilter] = useState<TransactionKindFilterValue>('all');
  const [recorderFilter, setRecorderFilter] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [showLedgerSheet, setShowLedgerSheet] = useState(false);
  const [showCreateLedger, setShowCreateLedger] = useState(false);

  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  const familyMembers = useActiveFamilyMembers();
  /** 家庭账本展示「谁记的」；个人账本恒为 null，不展示 */
  const creatorLabelOf = useCreatorLabel();
  const tagNameOf = useTagNameOf();
  const transactions = useTransactionStore((state) =>
    selectMonthTransactions(state, ledger?.id, month),
  );
  const monthBucket = useTransactionStore((state) =>
    selectMonthBucket(state, ledger?.id, month),
  );

  const loadMonth = useTransactionStore((state) => state.loadMonth);
  const subscribe = useTransactionStore((state) => state.subscribe);
  const loadCategories = useCategoryStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  const createPersonalLedger = useLedgerStore((state) => state.createPersonalLedger);
  const removeTransaction = useTransactionStore((state) => state.remove);

  const recorderOptions = useMemo(
    () =>
      ledger?.type === 'family'
        ? familyMembers.map((member) => ({ userId: member.userId, label: member.nickname }))
        : [],
    [familyMembers, ledger?.type],
  );

  useEffect(() => {
    if (
      recorderFilter !== 'all' &&
      !recorderOptions.some((option) => option.userId === recorderFilter)
    ) {
      setRecorderFilter('all');
    }
  }, [recorderFilter, recorderOptions]);

  const categoryNameOf = useCallback(
    (categoryId: string) => categories.find((category) => category.id === categoryId)?.name ?? '未知分类',
    [categories],
  );

  const visibleTransactions = useMemo(
    () =>
      filterTransactions(
        transactions,
        {
          type: typeFilter,
          kind: kindFilter,
          createdBy: recorderFilter,
          keyword,
        },
        categoryNameOf,
        tagNameOf,
      ),
    [categoryNameOf, kindFilter, keyword, recorderFilter, tagNameOf, transactions, typeFilter],
  );

  const confirmDeleteTransaction = (transaction: Transaction) => {
    if (!ledger) return;
    const imageUrls = transaction.images;
    showAlert('删除账单', '删除后不可恢复，确定删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void removeTransaction(transaction.id, ledger.id)
            .then(() => {
              if (imageUrls.length > 0) {
                void transactionImageService.remove(imageUrls).catch(() => undefined);
              }
            })
            .catch((error: unknown) => showAlert('删除失败', getErrorMessage(error)));
        },
      },
    ]);
  };

  const monthKeyValue = monthKey(month);
  const loadingInitial =
    ledger !== null &&
    (monthBucket === undefined ||
      (monthBucket.status === 'loading' && transactions.length === 0));
  const refreshing = monthBucket?.status === 'loading' && transactions.length > 0;
  const handleRefresh = useCallback(() => {
    if (ledger) void loadMonth(ledger.id, month);
  }, [ledger?.id, monthKeyValue]);

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

  const groups = groupByDay(visibleTransactions);
  /** 顶部汇总只统计主币种：不同币种的最小单位不可直接相加 */
  const currency = dominantCurrency(transactions);
  const summary = monthSummary(transactions, currency);
  const foreignCount = transactions.length - scopeToCurrency(transactions, currency).length;
  const activeFilterCount =
    (typeFilter !== 'all' ? 1 : 0) +
    (kindFilter !== 'all' ? 1 : 0) +
    (recorderFilter !== 'all' ? 1 : 0);
  const hasActiveFilter = activeFilterCount > 0 || keyword.trim() !== '';

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

      <SearchBar value={keyword} onChangeText={setKeyword} />

      <Pressable style={styles.filterToggle} onPress={() => setFiltersExpanded((value) => !value)}>
        <Ionicons name="options-outline" size={17} color={colors.primary} />
        <Text style={styles.filterToggleText}>筛选</Text>
        {activeFilterCount > 0 ? (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
          </View>
        ) : null}
        <Ionicons
          name={filtersExpanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.textTertiary}
        />
      </Pressable>

      {filtersExpanded ? (
        <View style={styles.filterPanel}>
          <Text style={styles.filterLabel}>收支类型</Text>
          <SegmentedTabs items={KIND_FILTER_ITEMS} value={kindFilter} onChange={setKindFilter} />
          <TransactionTypeFilter value={typeFilter} onChange={setTypeFilter} />
          {recorderOptions.length > 0 ? (
            <View style={styles.recorderBar}>
              <Text style={styles.recorderLabel}>记录人</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.recorderScroll}
                contentContainerStyle={styles.recorderOptions}
              >
                {[{ userId: 'all', label: '全部' }, ...recorderOptions].map((option) => {
                  const selected = option.userId === recorderFilter;
                  return (
                    <Pressable
                      key={option.userId}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected }}
                      style={[styles.filterChip, selected ? styles.filterChipSelected : null]}
                      onPress={() => setRecorderFilter(option.userId)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          selected ? styles.filterChipTextSelected : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {loadingInitial ? (
        <LoadingView message="正在加载账单…" />
      ) : (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
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

        <View style={styles.list}>
          {groups.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              message={hasActiveFilter ? '没有符合条件的账单' : '本月暂无账单，点击下方 + 记一笔'}
            />
          ) : (
            groups.map((group) => (
              <DaySection
                key={group.key}
                group={group}
                categories={categories}
                tagNameOf={tagNameOf}
                creatorNameOf={(tx) => creatorLabelOf(tx.createdBy)}
                onRowPress={(tx) =>
                  navigation.navigate('TransactionPreview', { transactionId: tx.id })
                }
                onEdit={(tx) => navigation.navigate('AddTransaction', { transactionId: tx.id })}
                onDelete={confirmDeleteTransaction}
              />
            ))
          )}
        </View>
      </ScrollView>
      )}

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

const SummaryItem = ({ label, value }: { label: string; value: string }) => {
  const styles = useStyles();
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  filterBadge: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.round,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  filterChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.round,
    borderWidth: 1,
    paddingHorizontal: space(3),
    paddingVertical: space(1),
  },
  filterChipSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  filterChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  filterLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    paddingHorizontal: space(4),
    paddingTop: space(2),
  },
  filterPanel: {
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  filterToggle: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(4),
    paddingVertical: space(2.5),
  },
  filterToggleText: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  foreignHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    paddingHorizontal: space(4),
    paddingTop: space(2),
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
  recorderBar: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  recorderLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginRight: space(2),
  },
  recorderOptions: {
    gap: space(2),
    paddingRight: space(2),
  },
  recorderScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: space(4),
  },
  summaryBar: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    flexDirection: 'row',
    marginHorizontal: space(3),
    marginTop: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(3),
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
}));
