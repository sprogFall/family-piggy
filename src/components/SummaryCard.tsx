import { Pressable, Text, View } from 'react-native';

import { budgetProgress } from '@/domain/budget';
import { formatCents } from '@/domain/money';
import { createStyles, colors, fontSize, space } from '@/theme';

interface Props {
  expense: number;
  income: number;
  balance: number;
  /** 月度预算（分），0/未传表示未设置 */
  budget?: number;
  onPressBudget?: () => void;
}

export const SummaryCard = ({ expense, income, balance, budget = 0, onPressBudget }: Props) => {
  const progress = budgetProgress(expense, budget);
  return (
    <View style={styles.card}>
      <Text style={styles.label}>本月支出(元)</Text>
      <Text style={styles.expense}>{formatCents(expense)}</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.subLabel}>本月收入(元)</Text>
          <Text style={styles.subValue}>{formatCents(income)}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.subLabel}>结余(元)</Text>
          <Text style={styles.subValue}>{formatCents(balance, { signed: true })}</Text>
        </View>
      </View>

      {budget > 0 ? (
        <Pressable style={styles.budgetRow} onPress={onPressBudget} disabled={!onPressBudget}>
          <View style={styles.budgetTrack}>
            <View style={[styles.budgetBar, { flex: Math.max(progress.ratio, 0.02) }]} />
            <View style={{ flex: 1 - Math.max(progress.ratio, 0.02) }} />
          </View>
          <Text style={styles.budgetText}>
            {progress.isOver
              ? `已超支 ${formatCents(-progress.remainingCents)} / ${formatCents(budget)}`
              : `剩余 ${formatCents(progress.remainingCents)} / ${formatCents(budget)}`}
          </Text>
        </Pressable>
      ) : (
        <Pressable onPress={onPressBudget} disabled={!onPressBudget} hitSlop={8}>
          <Text style={styles.budgetHint}>＋ 设置月预算</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = createStyles({
  budgetBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 6,
  },
  budgetHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.sm,
    marginTop: space(4),
  },
  budgetRow: {
    marginTop: space(4),
  },
  budgetText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: fontSize.xs,
    marginTop: space(1.5),
  },
  budgetTrack: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    flexDirection: 'row',
    height: 6,
  },
  card: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: space(5),
  },
  expense: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    marginTop: space(1),
  },
  item: {
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
  },
  row: {
    flexDirection: 'row',
    marginTop: space(4),
  },
  subLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: fontSize.sm,
  },
  subValue: {
    color: '#FFFFFF',
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: 2,
  },
});
