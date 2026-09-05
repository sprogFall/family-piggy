import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AmountKeypad } from '@/components/ui/AmountKeypad';
import { CategoryGrid } from '@/components/ui/CategoryGrid';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { dateLabelOf } from '@/domain/dates';
import { parseAmountToCents } from '@/domain/money';
import { useActiveLedger, useActiveCategories } from '@/hooks/useActiveLedgerData';
import type { RootStackParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import { useTransactionStore } from '@/stores/transaction.store';
import type { TxKind } from '@/types/domain';
import { colors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

const KIND_TABS = [
  { key: 'expense' as const, label: '支出' },
  { key: 'income' as const, label: '收入' },
];

export const AddTransactionScreen = ({ navigation }: Props) => {
  const [kind, setKind] = useState<TxKind>('expense');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  const loadCategories = useCategoryStore((state) => state.load);
  const addTransaction = useTransactionStore((state) => state.add);

  useFocusEffect(
    useCallback(() => {
      if (ledger) void loadCategories(ledger.id);
    }, [ledger?.id]),
  );

  const kindCategories = categories.filter((category) => category.kind === kind);

  const changeKind = (next: TxKind) => {
    setKind(next);
    setCategoryId(null);
  };

  const submit = async () => {
    const cents = parseAmountToCents(amount);
    if (!ledger) {
      Alert.alert('提示', '请先选择账本');
      return;
    }
    if (!categoryId) {
      Alert.alert('提示', '请选择分类');
      return;
    }
    if (cents === null) {
      Alert.alert('提示', '请输入正确的金额');
      return;
    }
    setSubmitting(true);
    try {
      await addTransaction({
        ledgerId: ledger.id,
        categoryId,
        kind,
        amount: cents,
        note: note.trim() === '' ? null : note.trim(),
        occurredAt: date.toISOString(),
      });
      Alert.alert('记账成功');
      navigation.goBack();
    } catch (error) {
      Alert.alert('记账失败', error instanceof Error ? error.message : '请稍后再试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>记一笔</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabsCard}>
        <SegmentedTabs items={KIND_TABS} value={kind} onChange={changeKind} />
      </View>

      <View style={styles.body}>
        <CategoryGrid
          categories={kindCategories}
          selectedId={categoryId}
          onSelect={(category) => setCategoryId(category.id)}
        />
      </View>

      <View style={styles.bottom}>
        <View style={styles.metaRow}>
          <Pressable style={styles.dateChip} onPress={() => setShowPicker(true)}>
            <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
            <Text style={styles.dateText}>{dateLabelOf(date.toISOString())}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.noteBox}>
            <Text style={styles.noteLabel}>备注:</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="点击填写"
              placeholderTextColor={colors.textTertiary}
              value={note}
              maxLength={30}
              onChangeText={setNote}
            />
          </View>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountSymbol}>¥</Text>
          <Text style={styles.amountValue}>{amount === '' ? '0.00' : amount}</Text>
        </View>

        {showPicker ? (
          <RNDateTimePicker
            value={date}
            mode="date"
            onChange={(_event, selected) => {
              setShowPicker(false);
              if (selected) setDate(selected);
            }}
          />
        ) : null}

        <AmountKeypad
          value={amount}
          onChange={setAmount}
          onSubmit={() => void submit()}
          submitDisabled={submitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  amountRow: {
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingBottom: space(2),
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  amountSymbol: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginRight: space(1),
  },
  amountValue: {
    color: colors.text,
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'right',
  },
  body: {
    flex: 1,
  },
  bottom: {
    backgroundColor: colors.card,
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  dateChip: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    flexDirection: 'row',
    gap: space(1),
    paddingHorizontal: space(2),
    paddingVertical: space(1.5),
  },
  dateText: {
    color: colors.text,
    fontSize: fontSize.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: space(2),
    paddingHorizontal: space(4),
    paddingTop: space(3),
  },
  noteBox: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  noteInput: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  noteLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(1),
  },
  tabsCard: {
    backgroundColor: colors.card,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
