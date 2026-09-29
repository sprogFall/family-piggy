import { Image, Pressable, Text, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { timeLabelOf } from '@/domain/dates';
import { MAX_TRANSACTION_IMAGES } from '@/domain/transaction-images';
import { formatMoney } from '@/domain/money';
import type { Transaction } from '@/types/domain';
import { makeStyles, fontSize, space } from '@/theme';

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
  const styles = useStyles();
  const isIncome = transaction.kind === 'income';
  const sub = [
    showTime ? timeLabelOf(transaction.occurredAt) : '',
    tagName ? `#${tagName}` : '',
    transaction.note,
    transaction.attributes.reimbursement ? '可报销' : '',
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
      <Text style={[styles.amount, isIncome ? styles.income : null]}>
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
  thumb: {
    borderRadius: 4,
    height: 28,
    width: 28,
  },
}));
