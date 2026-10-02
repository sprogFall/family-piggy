import { Pressable, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { dayKeyOf } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import type { Category, Transaction } from '@/types/domain';
import { makeStyles, fontSize, space } from '@/theme';

interface Props {
  title: string;
  transactions: Transaction[];
  totalCount: number;
  hasMore: boolean;
  categoryOf: (categoryId: string) => Category | undefined;
  onPressTransaction: (transactionId: string) => void;
  onLoadMore: () => void;
}

export const RankingSection = ({
  title,
  transactions,
  totalCount,
  hasMore,
  categoryOf,
  onPressTransaction,
  onLoadMore,
}: Props) => {
  const styles = useStyles();
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {transactions.length > 0 ? (
        <>
          {transactions.map((tx, index) => {
            const tagNames = tx.tagNames.filter((name) => name !== '');
            return (
              <Pressable
                key={tx.id}
                accessibilityRole="button"
                accessibilityLabel={`查看第 ${index + 1} 名账单详情`}
                style={styles.row}
                onPress={() => onPressTransaction(tx.id)}
              >
                <Text style={styles.index}>{index + 1}</Text>
                <View style={styles.info}>
                  <Text style={styles.category} numberOfLines={1}>
                    {categoryOf(tx.categoryId)?.name ?? '未知分类'}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {dayKeyOf(tx.occurredAt)}
                    {tagNames.length > 0
                      ? ` · ${tagNames.map((name) => `#${name}`).join(' ')}`
                      : ''}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {formatMoney(tx.amount, tx.currency, { signed: tx.kind === 'income' })}
                </Text>
              </Pressable>
            );
          })}
          {hasMore ? (
            <Pressable accessibilityRole="button" onPress={onLoadMore}>
              <Text style={styles.more}>继续下拉加载更多…</Text>
            </Pressable>
          ) : totalCount > 10 ? (
            <Text style={styles.more}>已显示全部 {totalCount} 条</Text>
          ) : null}
        </>
      ) : (
        <EmptyState icon="trophy-outline" message="暂无排行数据" />
      )}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.text,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    marginBottom: space(3),
    padding: space(4),
  },
  category: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  index: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    width: 24,
  },
  info: {
    flex: 1,
    marginHorizontal: space(2),
  },
  meta: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  more: {
    color: colors.primary,
    fontSize: fontSize.xs,
    marginTop: space(3),
    textAlign: 'center',
  },
  row: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
    paddingVertical: space(1.5),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: space(3),
  },
}));
