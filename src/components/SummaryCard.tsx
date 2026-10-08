import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import { budgetProgress } from '@/domain/budget';
import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import { useSettingsStore } from '@/stores/settings.store';
import { makeStyles, useColors, fontSize, space } from '@/theme';

/** 隐藏金额时的占位：星号而非圆点，避免与货币符号混淆 */
const AMOUNT_MASK = '****';

interface Props {
  expense: number;
  income: number;
  balance: number;
  /** 汇总币种（不同币种的最小单位不可直接相加，金额均为该币种） */
  currency: CurrencyCode;
  /** 月度预算（分），0/未传表示未设置 */
  budget?: number;
  onPressBudget?: () => void;
}

export const SummaryCard = ({
  expense,
  income,
  balance,
  currency,
  budget = 0,
  onPressBudget,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  // 隐藏状态是本地设置：重启 App 后依然保持
  const amountsHidden = useSettingsStore((state) => state.amountsHidden);
  const setAmountsHidden = useSettingsStore((state) => state.setAmountsHidden);
  const progress = budgetProgress(expense, budget);
  const mask = (value: string): string => (amountsHidden ? AMOUNT_MASK : value);

  return (
    <View style={styles.card}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>本月支出</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={amountsHidden ? '显示金额' : '隐藏金额'}
          hitSlop={8}
          onPress={() => setAmountsHidden(!amountsHidden)}
        >
          <Ionicons
            name={amountsHidden ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={colors.white}
          />
        </Pressable>
      </View>
      <Text style={styles.expense}>{mask(formatMoney(expense, currency))}</Text>
      <View style={styles.row}>
        <View style={styles.item}>
          <Text style={styles.subLabel}>本月收入</Text>
          <Text style={styles.subValue}>{mask(formatMoney(income, currency))}</Text>
        </View>
        <View style={styles.item}>
          <Text style={styles.subLabel}>结余</Text>
          <Text style={styles.subValue}>
            {mask(formatMoney(balance, currency, { signed: true }))}
          </Text>
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
              ? `已超支 ${mask(formatMoney(-progress.remainingCents, currency))} / ${mask(formatMoney(budget, currency))}`
              : `剩余 ${mask(formatMoney(progress.remainingCents, currency))} / ${mask(formatMoney(budget, currency))}`}
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

const useStyles = makeStyles((colors) => ({
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
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
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
}));
