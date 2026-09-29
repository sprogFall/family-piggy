import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatEvaluatedAmount } from '@/domain/amount-input';
import { currencySymbol, type CurrencyCode } from '@/domain/currency';
import { AMOUNT_ROW_MIN_HEIGHT, fontSize, makeStyles, radius, space, useColors } from '@/theme';

interface Props {
  currency: CurrencyCode;
  /** 键盘输入的金额表达式（未输入为 ''），如 "50-1" */
  amount: string;
  /** 表达式实时求值结果；能计算时会放大展示，表达式作为灰色副文案 */
  result?: string | null;
  /** 记账日期展示文案 */
  dateLabel: string;
  onPressCurrency: () => void;
  onPressDate: () => void;
  /** 点击金额区域时唤起金额键盘 */
  onPressAmount?: () => void;
}

/**
 * 「记一笔」顶部金额行：整行加高、金额大字展示，先确认币种、数额与时间。
 * 有运算符时主文案显示实时结果，灰色小字保留计算过程（如 50-1）。
 */
export const AmountPanel = ({
  currency,
  amount,
  result = null,
  dateLabel,
  onPressCurrency,
  onPressDate,
  onPressAmount,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const empty = amount === '';
  const showResult = /[+\-×÷]/.test(amount) && result !== null;
  const displayValue = showResult ? formatEvaluatedAmount(result) : empty ? '0.00' : amount;
  const displayExpression = showResult ? amount : null;
  const placeholder = empty && !showResult;

  return (
    <View testID="amount-panel" style={styles.panel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="选择币种"
        hitSlop={8}
        style={styles.currencyChip}
        onPress={onPressCurrency}
      >
        <Text style={styles.currencyCode}>{currency}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
      </Pressable>
      <View style={styles.divider} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="编辑金额"
        disabled={!onPressAmount}
        style={styles.amountBox}
        onPress={onPressAmount}
      >
        <Text style={styles.amountSymbol}>{currencySymbol(currency)}</Text>
        <View style={styles.amountTexts}>
          <Text
            testID="amount-value"
            style={[styles.amountValue, placeholder && styles.amountPlaceholder]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayValue}
          </Text>
          {displayExpression ? (
            <Text testID="amount-expression" style={styles.amountExpression} numberOfLines={1}>
              {displayExpression}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="选择日期"
        hitSlop={8}
        style={styles.dateChip}
        onPress={onPressDate}
      >
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
        <Text style={styles.dateText}>{dateLabel}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amountBox: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    marginRight: space(3),
  },
  amountExpression: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: -space(0.5),
  },
  /** 未输入金额时用弱化色，输入后转为正文色 */
  amountPlaceholder: {
    color: colors.textTertiary,
  },
  amountSymbol: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginRight: space(1),
  },
  amountTexts: {
    flex: 1,
  },
  amountValue: {
    color: colors.text,
    fontSize: fontSize.display,
    fontWeight: '700',
  },
  currencyChip: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(1),
    paddingVertical: space(1),
  },
  currencyCode: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: space(1),
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
  },
  dateText: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  divider: {
    backgroundColor: colors.border,
    height: 26,
    marginHorizontal: space(3),
    width: 1,
  },
  panel: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: AMOUNT_ROW_MIN_HEIGHT,
    paddingHorizontal: space(4),
    paddingVertical: space(4),
  },
}));
