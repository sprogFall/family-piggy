import { Text, View } from 'react-native';

import { formatMoney } from '@/domain/money';
import type { DayGroup } from '@/domain/statement';
import type { Category, Transaction } from '@/types/domain';
import { makeStyles, fontSize, space } from '@/theme';

import { SwipeableTransactionRow } from './SwipeableTransactionRow';
import { TransactionRow } from './TransactionRow';

interface Props {
  group: DayGroup;
  categories: Category[];
  onRowPress?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  /** 记录人标注（家庭账本由调用方提供；返回 null 则不展示） */
  creatorNameOf?: (transaction: Transaction) => string | null;
  /** 只读模式：不展示左滑编辑 / 删除，仅保留点击预览 */
  readOnly?: boolean;
}

export const DaySection = ({
  group,
  categories,
  onRowPress,
  onEdit,
  onDelete,
  creatorNameOf,
  readOnly = false,
}: Props) => {
  const styles = useStyles();
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.day}>{group.label}</Text>
        <View style={styles.headerRight}>
          {group.expense > 0 ? (
            <Text style={styles.sum}>支出 {formatMoney(group.expense, group.currency)}</Text>
          ) : null}
          {group.income > 0 ? (
            <Text style={[styles.sum, styles.income]}>
              收入 {formatMoney(group.income, group.currency)}
            </Text>
          ) : null}
        </View>
      </View>
      {group.transactions.map((tx) => {
        const category = categoryById.get(tx.categoryId);
        const commonProps = {
          transaction: tx,
          categoryName: category?.name ?? '未知分类',
          iconKey: category?.icon ?? 'ellipsis-horizontal',
          tagNames: tx.tagNames,
          showTime: true,
          createdByName: creatorNameOf?.(tx) ?? null,
          onPress: () => onRowPress?.(tx),
        };
        return readOnly ? (
          <TransactionRow key={tx.id} {...commonProps} />
        ) : (
          <SwipeableTransactionRow
            key={tx.id}
            {...commonProps}
            onEdit={() => onEdit?.(tx)}
            onDelete={() => onDelete?.(tx)}
          />
        );
      })}
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
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
}));
