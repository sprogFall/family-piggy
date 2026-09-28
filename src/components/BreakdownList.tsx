import { Text, View } from 'react-native';

import type { CurrencyCode } from '@/domain/currency';
import { formatMoney, formatRatio } from '@/domain/money';
import type { BreakdownItem } from '@/domain/statement';
import { createStyles, CHART_PALETTE, colors, fontSize, space } from '@/theme';

interface Props {
  items: BreakdownItem[];
  /** 汇总币种（明细金额按该币种展示） */
  currency: CurrencyCode;
  /** 是否展示金额（统计页展示，首页仅占比） */
  showAmount?: boolean;
}

export const BreakdownList = ({ items, currency, showAmount = false }: Props) => (
  <View>
    {items.map((item, index) => (
      <View key={`${item.categoryId}-${index}`} style={styles.row}>
        <View style={[styles.dot, { backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }]} />
        {/* 不限行数：窄列下长分类名换行展示，避免只剩省略号 */}
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.ratio}>{formatRatio(item.ratio)}</Text>
        {showAmount ? (
          <Text style={styles.amount}>{formatMoney(item.amount, currency)}</Text>
        ) : null}
      </View>
    ))}
  </View>
);

const styles = createStyles({
  amount: {
    color: colors.text,
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
    width: 96,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: space(2),
    width: 8,
  },
  name: {
    color: colors.text,
    flexGrow: 1,
    flexShrink: 1,
    fontSize: fontSize.sm,
    minWidth: 48,
  },
  ratio: {
    color: colors.textSecondary,
    flexShrink: 0,
    fontSize: fontSize.sm,
    marginRight: space(3),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(1.5),
  },
});
