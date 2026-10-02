import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import type { CurrencyCode } from '@/domain/currency';
import { formatMoney, formatRatio } from '@/domain/money';
import type { DistributionItem } from '@/domain/statement';
import { makeStyles, CHART_PALETTE, useColors, fontSize, radius, space } from '@/theme';

interface Props {
  items: DistributionItem[];
  currency: CurrencyCode;
  /** 点击分类进入该分类在当前统计条件下的明细；「其他」为聚合项不可下钻 */
  onPressItem?: (item: DistributionItem) => void;
}

/** 分类分布明细：分类名、金额、占比与笔数 */
export const DistributionList = ({ items, currency, onPressItem }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  return (
    <View>
      {items.map((item, index) => {
        const pressable = item.categoryId !== 'other' && Boolean(onPressItem);
        return (
          <Pressable
            key={`${item.categoryId}-${index}`}
            accessibilityRole={pressable ? 'button' : undefined}
            accessibilityLabel={pressable ? `查看${item.name}分类明细` : undefined}
            disabled={!pressable}
            style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
            onPress={() => onPressItem?.(item)}
          >
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
            {pressable ? (
              <Ionicons
                name="chevron-forward"
                size={15}
                color={colors.textTertiary}
                style={styles.chevron}
              />
            ) : null}
          </Pressable>
        );
      })}
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
  chevron: {
    marginLeft: space(1),
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
  pressed: {
    opacity: 0.6,
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingVertical: space(2),
  },
}));
