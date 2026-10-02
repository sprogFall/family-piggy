import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import type { TrendChartType, TrendSeriesMode } from '@/components/charts/StatsTrendChart';
import { EmptyState } from '@/components/EmptyState';
import { LoadingView } from '@/components/ui/LoadingView';
import { ScreenTopBar } from '@/components/ui/ScreenTopBar';
import { dominantCurrency } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import { periodFromPreset, type PeriodRange } from '@/domain/period';
import {
  distributionWithOther,
  monthSummary,
  scopeToCurrency,
  trendInRange,
  type DistributionMode,
} from '@/domain/statement';
import { useActiveFamilyMembers, useActiveLedger, useCategoryOf } from '@/hooks/useActiveLedgerData';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import {
  selectPeriodBucket,
  selectPeriodTransactions,
  useTransactionStore,
} from '@/stores/transaction.store';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

import { DistributionSection } from './DistributionSection';
import { MemberFilterSheet } from './MemberFilterSheet';
import { RankingSection } from './RankingSection';
import { TimePeriodSheet } from './TimePeriodSheet';
import { TrendSection } from './TrendSection';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Stats'>,
  NativeStackScreenProps<RootStackParamList>
>;

export const StatsScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const [period, setPeriod] = useState<PeriodRange>(() => periodFromPreset('thisMonth'));
  const [periodVisible, setPeriodVisible] = useState(false);
  const [memberVisible, setMemberVisible] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [trendMode, setTrendMode] = useState<TrendSeriesMode>('both');
  const [chartType, setChartType] = useState<TrendChartType>('bar');
  const [distributionMode, setDistributionMode] = useState<DistributionMode>('expense');
  const [rankingVisible, setRankingVisible] = useState(10);

  const ledger = useActiveLedger();
  const categoryOf = useCategoryOf();
  const members = useActiveFamilyMembers();
  const loadCategories = useCategoryStore((state) => state.load);
  const loadPeriod = useTransactionStore((state) => state.loadPeriod);
  const periodBucket = useTransactionStore((state) =>
    selectPeriodBucket(state, ledger?.id, period.key),
  );
  const transactions = useTransactionStore((state) =>
    selectPeriodTransactions(state, ledger?.id, period.key),
  );

  useFocusEffect(
    useCallback(() => {
      if (!ledger) return undefined;
      void loadCategories(ledger.id).catch(() => undefined);
      void loadPeriod(ledger.id, period.key, period.start, period.end);
      return undefined;
    }, [ledger?.id, period.key, period.start, period.end, loadCategories, loadPeriod]),
  );

  useEffect(() => {
    setMemberId(null);
    setRankingVisible(10);
  }, [ledger?.id]);

  useEffect(() => {
    setRankingVisible(10);
  }, [distributionMode, memberId, period.key]);

  const memberTransactions = useMemo(
    () => (memberId ? transactions.filter((tx) => tx.createdBy === memberId) : transactions),
    [memberId, transactions],
  );
  const currency = useMemo(() => dominantCurrency(memberTransactions), [memberTransactions]);
  const scoped = useMemo(
    () => scopeToCurrency(memberTransactions, currency),
    [currency, memberTransactions],
  );
  const foreignCount = memberTransactions.length - scoped.length;
  const summary = useMemo(() => monthSummary(scoped, currency), [currency, scoped]);
  const trendPoints = useMemo(
    () => trendInRange(scoped, period.start, period.end, currency),
    [currency, period.end, period.start, scoped],
  );
  const distributionItems = useMemo(
    () => distributionWithOther(scoped, distributionMode, (id) => categoryOf(id)?.name ?? '未知分类', 8),
    [categoryOf, distributionMode, scoped],
  );
  const rankingTransactions = useMemo(() => {
    const list =
      distributionMode === 'all' ? scoped : scoped.filter((tx) => tx.kind === distributionMode);
    return [...list].sort((a, b) => b.amount - a.amount);
  }, [distributionMode, scoped]);

  const visibleRanking = rankingTransactions.slice(0, rankingVisible);
  const hasMoreRanking = rankingVisible < rankingTransactions.length;
  const loadMoreRanking = () =>
    setRankingVisible((count) => Math.min(count + 10, rankingTransactions.length));
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!hasMoreRanking) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) loadMoreRanking();
  };

  const loadingInitial =
    ledger !== null &&
    (periodBucket === undefined ||
      (periodBucket.status === 'loading' && transactions.length === 0));
  const memberLabel = memberId
    ? members.find((member) => member.userId === memberId)?.nickname ?? '成员'
    : '全部成员';
  const distributionLabel =
    distributionMode === 'all' ? '收支' : distributionMode === 'income' ? '收入' : '支出';
  const rankingTitle = `${distributionLabel}排行（金额倒序）`;

  return (
    <View style={styles.container}>
      <ScreenTopBar>
        <Text style={styles.title}>统计</Text>
        {ledger?.type === 'family' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="按成员筛选"
            style={styles.memberChip}
            onPress={() => setMemberVisible(true)}
          >
            <Ionicons name="people-outline" size={16} color={colors.primary} />
            <Text style={styles.memberText} numberOfLines={1}>
              {memberLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <View />
        )}
      </ScreenTopBar>

      <View style={styles.periodRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="选择统计时间周期"
          style={styles.periodChip}
          onPress={() => setPeriodVisible(true)}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={styles.periodText} numberOfLines={1}>
            {period.label}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </Pressable>
      </View>

      {!ledger ? (
        <EmptyState icon="wallet-outline" message="暂无账本，请先创建或切换账本" />
      ) : loadingInitial ? (
        <LoadingView message="正在加载统计数据…" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={120}
          onScroll={handleScroll}
        >
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{period.label}收支</Text>
            <SummaryRow label="支出" value={formatMoney(summary.expense, currency)} />
            <SummaryRow label="收入" value={formatMoney(summary.income, currency)} />
            <SummaryRow
              label="结余"
              value={formatMoney(summary.balance, currency, { signed: true })}
            />
          </View>

          {foreignCount > 0 ? (
            <Text style={styles.foreignHint}>
              另有 {foreignCount} 笔外币记录未计入当前统计
            </Text>
          ) : null}

          <TrendSection
            points={trendPoints}
            mode={trendMode}
            chartType={chartType}
            onModeChange={setTrendMode}
            onChartTypeChange={setChartType}
          />

          <DistributionSection
            items={distributionItems}
            currency={currency}
            mode={distributionMode}
            onModeChange={setDistributionMode}
          />

          <RankingSection
            title={rankingTitle}
            transactions={visibleRanking}
            totalCount={rankingTransactions.length}
            hasMore={hasMoreRanking}
            categoryOf={categoryOf}
            onPressTransaction={(transactionId) =>
              navigation.navigate('TransactionPreview', { transactionId })
            }
            onLoadMore={loadMoreRanking}
          />
        </ScrollView>
      )}

      <TimePeriodSheet
        visible={periodVisible}
        value={period}
        onClose={() => setPeriodVisible(false)}
        onConfirm={setPeriod}
      />
      {ledger?.type === 'family' ? (
        <MemberFilterSheet
          visible={memberVisible}
          members={members}
          selectedId={memberId}
          onClose={() => setMemberVisible(false)}
          onSelect={setMemberId}
        />
      ) : null}
    </View>
  );
};

const SummaryRow = ({ label, value }: { label: string; value: string }) => {
  const styles = useStyles();
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryAmount}>{value}</Text>
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
  foreignHint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: space(3),
    paddingHorizontal: space(1),
  },
  memberChip: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: space(1),
    maxWidth: 140,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  memberText: {
    color: colors.primary,
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  periodChip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: space(1.5),
    maxWidth: '90%',
    paddingHorizontal: space(3),
    paddingVertical: space(2),
  },
  periodRow: {
    paddingBottom: space(2),
    paddingHorizontal: space(4),
  },
  periodText: {
    color: colors.text,
    flexShrink: 1,
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  summaryAmount: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: space(3),
    padding: space(4),
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space(1.5),
  },
  summaryTitle: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: space(2),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
