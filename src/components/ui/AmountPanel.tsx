import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { currencySymbol, type CurrencyCode } from '@/domain/currency';
import { AMOUNT_ROW_MIN_HEIGHT, fontSize, makeStyles, radius, space, useColors } from '@/theme';

interface Props {
  currency: CurrencyCode;
  /** 键盘输入的金额字符串（未输入为 ''） */
  amount: string;
  /** 记账日期展示文案 */
  dateLabel: string;
  onPressCurrency: () => void;
  onPressDate: () => void;
}

/**
 * 「记一笔」顶部金额行：整行加高、金额大字展示，先确认币种、数额与时间。
 * 抽出独立组件便于单独验证「加高 + 金额醒目」的令牌与交互。
 */
export const AmountPanel = ({
  currency,
  amount,
  dateLabel,
  onPressCurrency,
  onPressDate,
}: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const empty = amount === '';

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
      <View style={styles.amountBox}>
        <Text style={styles.amountSymbol}>{currencySymbol(currency)}</Text>
        <Text
          testID="amount-value"
          style={[styles.amountValue, empty && styles.amountPlaceholder]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {empty ? '0.00' : amount}
        </Text>
      </View>
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
    alignItems: 'baseline',
    flex: 1,
    flexDirection: 'row',
    marginRight: space(3),
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
