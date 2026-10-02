import { Text, View } from 'react-native';

import type { CurrencyCode } from '@/domain/currency';
import { formatMoney, formatRatio } from '@/domain/money';
import type { DistributionItem } from '@/domain/statement';
import { makeStyles, CHART_PALETTE, fontSize, radius, space } from '@/theme';

interface Props {
  items: DistributionItem[];
  currency: CurrencyCode;
}

/** 分类分布明细：分类名、金额、占比与笔数 */
export const DistributionList = ({ items, currency }: Props) => {
  const styles = useStyles();
  return (
    <View>
      {items.map((item, index) => (
        <View key={`${item.categoryId}-${index}`} style={styles.row}>
          <View
            style={[
              styles.dot,
              { backgroundColor: CHART_PALETTE[index % CHART_PALETTE.length] },
            ]}
          />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.meta}>{`${formatRatio(item.ratio)} · 共 ${item.count} 笔`}</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(item.amount, currency)}</Text>
        </View>
      ))}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: space(2),
  },
  dot: {
    borderRadius: radius.round,
    height: 8,
    marginRight: space(2),
    marginTop: 4,
    width: 8,
  },
  info: {
    flex: 1,
  },
  meta: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  row: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: space(2),
  },
}));
