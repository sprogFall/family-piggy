import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { AppHeader } from '@/components/ui/AppHeader';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { formatMoney } from '@/domain/money';
import { formatRecurringSchedule } from '@/domain/recurring';
import { useActiveCategories, useActiveLedger } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { transactionImageService } from '@/services/transaction-image.service';
import {
  selectRecurringRules,
  useRecurringRuleStore,
} from '@/stores/recurring-rule.store';
import type { RecurringRule } from '@/types/domain';
import { KIND_LABEL } from '@/types/domain';
import { fontSize, makeStyles, space, useColors, radius } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'RecurringRuleManager'>;

export const RecurringRuleManagerScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  const rules = useRecurringRuleStore((state) => selectRecurringRules(state, ledger?.id));
  const load = useRecurringRuleStore((state) => state.load);
  const remove = useRecurringRuleStore((state) => state.remove);

  useFocusEffect(
    useCallback(() => {
      if (!ledger) return;
      void load(ledger.id).catch((error: unknown) =>
        showAlert('加载失败', error instanceof Error ? error.message : '请稍后再试'),
      );
    }, [ledger?.id, load]),
  );

  const confirmRemove = (rule: RecurringRule) => {
    const schedule = formatRecurringSchedule(rule.schedule);
    showAlert('删除定时记账', `删除「${schedule}」后不会再自动生成流水，已生成账单不受影响。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void remove(rule.id, rule.ledgerId)
            .then(() => {
              if (rule.images.length > 0) {
                void transactionImageService.remove(rule.images).catch(() => undefined);
              }
            })
            .catch((error: unknown) =>
              showAlert('删除失败', error instanceof Error ? error.message : '请稍后再试'),
            );
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="定时记账" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.hint}>到期后自动记入当前账本，不会提前生成流水。</Text>

        {rules.length === 0 ? (
          <EmptyState icon="repeat-outline" message="还没有定时记账" />
        ) : (
          <View style={styles.list}>
            {rules.map((rule) => {
              const category = categories.find((item) => item.id === rule.categoryId);
              const schedule = formatRecurringSchedule(rule.schedule);
              const income = rule.kind === 'income';
              return (
                <View key={rule.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.schedulePill}>
                      <Ionicons name="repeat" size={14} color={colors.primary} />
                      <Text style={styles.scheduleText}>{schedule}</Text>
                    </View>
                    <Text style={[styles.amount, income ? styles.income : null]}>
                      {formatMoney(rule.amount, rule.currency, { signed: income })}
                    </Text>
                  </View>

                  <View style={styles.cardBody}>
                    <CategoryIcon iconKey={category?.icon ?? 'ellipsis-horizontal'} size={38} />
                    <View style={styles.center}>
                      <Text style={styles.name} numberOfLines={1}>
                        {category?.name ?? '已删除分类'}
                      </Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {KIND_LABEL[rule.kind]}
                        {rule.note ? ` · ${rule.note}` : ''}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`编辑 ${schedule}`}
                      hitSlop={8}
                      onPress={() =>
                        navigation.navigate('AddTransaction', { recurringRuleId: rule.id })
                      }
                    >
                      <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`删除 ${schedule}`}
                      hitSlop={8}
                      onPress={() => confirmRemove(rule)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <PrimaryButton
          title="＋ 新增定时记账"
          onPress={() => navigation.navigate('AddTransaction', { startRecurring: true })}
        />
      </ScrollView>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  amount: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space(3),
  },
  cardBody: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(3),
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: space(3),
    padding: space(4),
    paddingBottom: space(8),
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
  },
  income: {
    color: colors.income,
  },
  list: {
    gap: space(3),
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  schedulePill: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.round,
    flexDirection: 'row',
    gap: space(1),
    paddingHorizontal: space(2),
    paddingVertical: space(1),
  },
  scheduleText: {
    color: colors.primaryDark,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
}));
