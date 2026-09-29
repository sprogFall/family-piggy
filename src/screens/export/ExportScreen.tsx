import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppHeader } from '@/components/ui/AppHeader';
import { MonthPickerSheet } from '@/components/ui/MonthPickerSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { currentMonth, monthKey, monthLabel, type MonthRef } from '@/domain/dates';
import {
  useActiveFamilyMembers,
  useActiveLedger,
  useCategoryOf,
  useTagNameOf,
} from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/stores/auth.store';
import { useTagStore } from '@/stores/tag.store';
import { selectMonthTransactions, useTransactionStore } from '@/stores/transaction.store';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';
import {
  EXPORT_FORMAT_LABEL,
  exportTransactions,
  type ExportFormat,
} from '@/services/export.service';

type Props = NativeStackScreenProps<RootStackParamList, 'Export'>;

export const ExportScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const [month, setMonth] = useState<MonthRef>(currentMonth());
  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [exporting, setExporting] = useState(false);

  const ledger = useActiveLedger();
  const categoryOf = useCategoryOf();
  const tagNameOf = useTagNameOf();
  const familyMembers = useActiveFamilyMembers();
  const profile = useAuthStore((state) => state.profile);
  const sessionUserId = useAuthStore((state) => state.session?.user.id ?? null);
  const loadTags = useTagStore((state) => state.load);
  const transactions = useTransactionStore((state) =>
    selectMonthTransactions(state, ledger?.id, month),
  );
  const loadMonth = useTransactionStore((state) => state.loadMonth);

  useFocusEffect(
    useCallback(() => {
      if (!ledger) return;
      void loadMonth(ledger.id, month);
      void loadTags(ledger.id).catch(() => undefined);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ledger?.id, monthKey(month)]),
  );

  const recorderNameOf = useCallback(
    (createdBy: string): string => {
      if (ledger?.type !== 'family') return '';
      const member = familyMembers.find((item) => item.userId === createdBy);
      if (member) return member.nickname;
      if (createdBy === sessionUserId) return profile?.nickname ?? '我';
      return '未知成员';
    },
    [ledger?.type, familyMembers, profile?.nickname, sessionUserId],
  );

  const handleExport = async () => {
    if (!ledger) {
      showAlert('提示', '请先选择账本');
      return;
    }
    setExporting(true);
    try {
      await exportTransactions(
        transactions,
        (id) => categoryOf(id)?.name ?? '未知分类',
        (id) => tagNameOf(id),
        recorderNameOf,
        { ledgerName: ledger.name, month, format },
      );
      showAlert('导出成功', '文件已生成，可在系统分享面板中选择保存位置');
    } catch (error) {
      showAlert('导出失败', error instanceof Error ? error.message : '请稍后再试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppHeader title="导出数据" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <OptionRow
            label="导出月份"
            value={monthLabel(month)}
            onPress={() => setShowMonthPicker(true)}
          />
          <OptionRow label="导出账本" value={ledger?.name ?? '未选择'} />
          <OptionRow
            label="导出格式"
            value={EXPORT_FORMAT_LABEL[format]}
            onPress={() => setFormat((prev) => (prev === 'xlsx' ? 'csv' : 'xlsx'))}
          />
        </View>

        <PrimaryButton title="导出" onPress={() => void handleExport()} loading={exporting} />

        <Text style={styles.tip}>
          导出内容为所选账本当月全部流水（Excel / CSV），生成后通过系统分享面板发送或保存。
        </Text>
      </ScrollView>

      <MonthPickerSheet
        visible={showMonthPicker}
        onClose={() => setShowMonthPicker(false)}
        value={month}
        onSelect={setMonth}
      />
    </View>
  );
};

const OptionRow = ({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) => {
  const styles = useStyles();
  const colors = useColors();
  const content = (
    <>
      <Text style={styles.optionLabel}>{label}</Text>
      <Text style={styles.optionValue}>{value}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} /> : null}
    </>
  );
  return onPress ? (
    <Pressable style={styles.optionRow} onPress={onPress}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.optionRow}>{content}</View>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(5),
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(4),
  },
  optionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 52,
    paddingHorizontal: space(3),
  },
  optionValue: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginRight: space(2),
  },
  tip: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: space(4),
  },
}));
