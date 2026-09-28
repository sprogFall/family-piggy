import type { LayoutChangeEvent } from 'react-native';
import { Text, View } from 'react-native';

import type { CurrencyCode } from '@/domain/currency';
import { formatMoney } from '@/domain/money';
import { makeStyles, fontSize, radius, space } from '@/theme';

export interface TooltipSize {
  width: number;
  height: number;
}

interface Props {
  /** 日期文案，如 "8月3日" */
  label: string;
  /** 当日支出（分） */
  expense: number;
  /** 当日收入（分） */
  income: number;
  /** 汇总币种（金额按该币种展示） */
  currency: CurrencyCode;
  /** 相对图表容器左上角的偏移（由 domain 的 tooltipPlacement 收敛） */
  left: number;
  top: number;
  /** 量得自身尺寸后回填，供边界收敛使用 */
  onMeasure?: (size: TooltipSize) => void;
}

/** 折线图悬浮浮层：半透明背景、不拦截触摸，内容为日期 / 支出 / 收入 */
export const TrendTooltip = ({
  label,
  expense,
  income,
  currency,
  left,
  top,
  onMeasure,
}: Props) => {
  const styles = useStyles();
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    onMeasure?.({ width, height });
  };

  return (
    <View
      testID="trend-tooltip"
      pointerEvents="none"
      style={[styles.bubble, { left, top }]}
      onLayout={handleLayout}
    >
      <Text style={styles.day} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.amount} numberOfLines={1}>
        {`支出 ${formatMoney(expense, currency)}`}
      </Text>
      <Text style={styles.amount} numberOfLines={1}>
        {`收入 ${formatMoney(income, currency)}`}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.white,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  bubble: {
    backgroundColor: colors.toastBg,
    borderRadius: radius.sm,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    position: 'absolute',
  },
  day: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginBottom: space(1),
  },
}));
