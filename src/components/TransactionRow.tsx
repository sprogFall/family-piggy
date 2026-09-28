import { Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { timeLabelOf } from '@/domain/dates';
import { formatCents } from '@/domain/money';
import type { Transaction } from '@/types/domain';
import { createStyles, colors, fontSize, space } from '@/theme';

interface Props {
  transaction: Transaction;
  categoryName: string;
  /** 分类图标 key（存于 Category.icon） */
  iconKey: string;
  /** 标签名；未打标签传 null（标签在记账时随流水记录，可复用） */
  tagName?: string | null;
  showTime?: boolean;
  /** 记录人标注（家庭账本「谁记的」）；null / 未传表示不展示 */
  createdByName?: string | null;
  onPress?: () => void;
}

export const TransactionRow = ({
  transaction,
  categoryName,
  iconKey,
  tagName = null,
  showTime = false,
  createdByName = null,
  onPress,
}: Props) => {
  const isIncome = transaction.kind === 'income';
  const sub = [
    showTime ? timeLabelOf(transaction.occurredAt) : '',
    tagName ? `#${tagName}` : '',
    createdByName ?? '',
  ]
    .filter((part) => part !== '')
    .join(' · ');
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <CategoryIcon iconKey={iconKey} size={38} />
      <View style={styles.center}>
        <Text style={styles.name} numberOfLines={1}>
          {categoryName}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      </View>
      <Text style={[styles.amount, isIncome ? styles.income : null]}>
        {formatCents(transaction.amount, { signed: isIncome })}
      </Text>
    </Pressable>
  );
};

const styles = createStyles({
  amount: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    marginHorizontal: space(3),
  },
  income: {
    color: colors.income,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: space(2),
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
});
