import { StyleSheet, Text, View } from 'react-native';

import { formatCents, formatRatio } from '@/domain/money';
import type { BreakdownItem } from '@/domain/statement';
import { CHART_PALETTE, colors, fontSize, space } from '@/theme';

interface Props {
  items: BreakdownItem[];
  /** 是否展示金额（统计页展示，首页仅占比） */
  showAmount?: boolean;
}

export const BreakdownList = ({ items, showAmount = false }: Props) => (
  <View>
    {items.map((item, index) => (
      <View key={`${item.categoryId}-${index}`} style={styles.row}>
        <View style={[styles.dot, { backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] }]} />
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.ratio}>{formatRatio(item.ratio)}</Text>
        {showAmount ? (
          <Text style={styles.amount}>{formatCents(item.amount)}</Text>
        ) : null}
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  amount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    textAlign: 'right',
    width: 84,
  },
  dot: {
    borderRadius: 4,
    height: 8,
    marginRight: space(2),
    width: 8,
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.sm,
  },
  ratio: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(3),
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(1.5),
  },
});
