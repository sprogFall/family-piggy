import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { dayLabelOf, timeLabelOf } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import {
  useActiveCategories,
  useActiveLedger,
  useCreatorLabel,
  useTagNameOf,
} from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import type { RootStackParamList } from '@/navigation/types';
import { transactionImageService } from '@/services/transaction-image.service';
import { selectTransactionById, useTransactionStore } from '@/stores/transaction.store';
import { KIND_LABEL } from '@/types/domain';
import { fontSize, makeStyles, radius, space, useColors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionPreview'>;

export const TransactionPreviewScreen = ({ navigation, route }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  const tagNameOf = useTagNameOf();
  const creatorLabelOf = useCreatorLabel();
  const transaction = useTransactionStore((state) =>
    selectTransactionById(state, route.params.transactionId),
  );
  const removeTransaction = useTransactionStore((state) => state.remove);
  const [removing, setRemoving] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!transaction && !removing && !missing) {
      setMissing(true);
      showAlert('提示', '账单不存在或已删除', [{ text: '返回', onPress: () => navigation.goBack() }]);
    }
  }, [missing, navigation, removing, transaction]);

  if (!transaction) {
    return <View style={styles.container} />;
  }

  const category = categories.find((item) => item.id === transaction.categoryId);
  const tagName = transaction.tagId ? tagNameOf(transaction.tagId) : '';
  const creatorName = creatorLabelOf(transaction.createdBy);
  const isIncome = transaction.kind === 'income';
  const typeLabel = transaction.attributes.reimbursement ? '报销' : '未报销';
  const detailDate = `${dayLabelOf(transaction.occurredAt)} ${timeLabelOf(transaction.occurredAt)}`;

  const confirmRemove = () => {
    if (!ledger || removing) return;
    const transactionId = transaction.id;
    const imageUrls = transaction.images;
    showAlert('删除账单', '删除后不可恢复，确定删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setRemoving(true);
          void removeTransaction(transactionId, ledger.id)
            .then(() => {
              if (imageUrls.length > 0) {
                void transactionImageService.remove(imageUrls).catch(() => undefined);
              }
              navigation.goBack();
            })
            .catch((error: unknown) => {
              setRemoving(false);
              showAlert('删除失败', getErrorMessage(error));
            });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space(3) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          hitSlop={12}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>账单预览</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={[styles.heroAmount, isIncome ? styles.income : null]}>
            {formatMoney(transaction.amount, transaction.currency, { signed: isIncome })}
          </Text>
          <Text style={styles.heroMeta}>
            {KIND_LABEL[transaction.kind]} · {category?.name ?? '未知分类'}
          </Text>
        </View>

        <View style={styles.card}>
          <DetailRow label="记账类型" value={typeLabel} />
          <DetailRow label="标签" value={tagName ? `#${tagName}` : '无'} />
          <DetailRow label="备注" value={transaction.note || '无'} />
          <DetailRow label="日期" value={detailDate} />
          {creatorName ? <DetailRow label="记录人" value={creatorName} /> : null}
        </View>

        {transaction.images.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>图片</Text>
            <View style={styles.images}>
              {transaction.images.map((uri, index) => (
                <Image
                  key={uri}
                  accessibilityLabel={`账单图片 ${index + 1}`}
                  source={{ uri }}
                  style={styles.image}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space(3) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="修改"
          disabled={removing}
          style={({ pressed }) => [
            styles.editButton,
            removing && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.navigate('AddTransaction', { transactionId: transaction.id })}
        >
          <Text style={styles.editButtonText}>修改</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="删除"
          disabled={removing}
          style={({ pressed }) => [
            styles.deleteButton,
            removing && styles.disabled,
            pressed && styles.pressed,
          ]}
          onPress={confirmRemove}
        >
          <Text style={styles.deleteButtonText}>删除</Text>
        </Pressable>
      </View>
    </View>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => {
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: space(4),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginHorizontal: space(4),
    marginTop: space(3),
    paddingHorizontal: space(4),
    paddingVertical: space(2),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    borderColor: colors.danger,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    width: 72,
  },
  detailRow: {
    flexDirection: 'row',
    gap: space(2),
    paddingVertical: space(2),
  },
  detailValue: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  disabled: {
    opacity: 0.5,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  editButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: space(3),
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: space(3),
    paddingHorizontal: space(4),
  },
  headerSpacer: {
    width: 26,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: space(4),
    paddingVertical: space(6),
  },
  heroAmount: {
    color: colors.text,
    fontSize: fontSize.xxl,
    fontWeight: '700',
  },
  heroMeta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: space(1),
  },
  image: {
    borderRadius: radius.md,
    height: 96,
    width: 96,
  },
  images: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space(2),
  },
  income: {
    color: colors.income,
  },
  pressed: {
    opacity: 0.8,
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginBottom: space(2),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
