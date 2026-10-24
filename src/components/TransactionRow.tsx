import { Image, Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { timeLabelOf } from '@/domain/dates';
import { MAX_TRANSACTION_IMAGES } from '@/domain/transaction-images';
import { formatMoney } from '@/domain/money';
import { isReimbursed } from '@/domain/reimbursement';
import type { Transaction } from '@/types/domain';
import { makeStyles, fontSize, space } from '@/theme';

interface Props {
  transaction: Transaction;
  categoryName: string;
  /** 分类图标 key（存于 Category.icon） */
  iconKey: string;
  /** 标签名列表；未打标签传空数组（标签在记账时随流水记录，可复用） */
  tagNames?: string[];
  showTime?: boolean;
  /** 记录人标注（家庭账本「谁记的」）；null / 未传表示不展示 */
  createdByName?: string | null;
  onPress?: () => void;
}

export const TransactionRow = ({
  transaction,
  categoryName,
  iconKey,
  tagNames = [],
  showTime = false,
  createdByName = null,
  onPress,
}: Props) => {
  const styles = useStyles();
  const isIncome = transaction.kind === 'income';
  const reimbursed = isReimbursed(transaction);
  const sub = [
    showTime ? timeLabelOf(transaction.occurredAt) : '',
    transaction.note,
    reimbursed ? '已报销' : transaction.attributes.reimbursement ? '可报销' : '',
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
          {tagNames.length > 0 ? (
            <Text style={styles.inlineTags}>[{tagNames.join(',')}]</Text>
          ) : null}
        </Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
        {transaction.images.length > 0 ? (
          <View style={styles.images}>
            {transaction.images.slice(0, MAX_TRANSACTION_IMAGES).map((uri, index) => (
              <Image
                key={uri}
                accessibilityLabel={`账单图片 ${index + 1}`}
                source={{ uri }}
                style={styles.thumb}
              />
            ))}
          </View>
        ) : null}
      </View>
      <Text
        style={[
          styles.amount,
          isIncome ? styles.income : null,
          reimbursed ? styles.reimbursedAmount : null,
        ]}
      >
        {formatMoney(transaction.amount, transaction.currency, { signed: isIncome })}
      </Text>
    </Pressable>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    marginHorizontal: space(3),
  },
  images: {
    flexDirection: 'row',
    gap: space(1),
    marginTop: space(1),
  },
  income: {
    color: colors.income,
  },
  inlineTags: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
  },
  /** 已报销金额：加删除线并弱化，表示不再计入消费 */
  reimbursedAmount: {
    color: colors.textTertiary,
    textDecorationLine: 'line-through',
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
  thumb: {
    borderRadius: 4,
    height: 28,
    width: 28,
  },
}));
