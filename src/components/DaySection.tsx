import { StyleSheet, Text, View } from 'react-native';

import { formatCents } from '@/domain/money';
import type { DayGroup } from '@/domain/statement';
import type { Category, Transaction } from '@/types/domain';
import { colors, fontSize, space } from '@/theme';

import { TransactionRow } from './TransactionRow';

interface Props {
  group: DayGroup;
  categories: Category[];
  onRowPress?: (transaction: Transaction) => void;
}

export const DaySection = ({ group, categories, onRowPress }: Props) => {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.day}>{group.label}</Text>
        <View style={styles.headerRight}>
          {group.expense > 0 ? (
            <Text style={styles.sum}>支出 {formatCents(group.expense)}</Text>
          ) : null}
          {group.income > 0 ? (
            <Text style={[styles.sum, styles.income]}>收入 {formatCents(group.income)}</Text>
          ) : null}
        </View>
      </View>
      {group.transactions.map((tx) => {
        const category = categoryById.get(tx.categoryId);
        return (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            categoryName={category?.name ?? '未知分类'}
            iconKey={category?.icon ?? 'ellipsis-horizontal'}
            showTime
            onPress={() => onRowPress?.(tx)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  day: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: space(1),
  },
  headerRight: {
    flexDirection: 'row',
    gap: space(3),
  },
  income: {
    color: colors.income,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: space(3),
    paddingHorizontal: space(3),
    paddingTop: space(2),
  },
  sum: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
