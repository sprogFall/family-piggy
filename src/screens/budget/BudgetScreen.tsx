import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { formatCents, parseAmountToCents } from '@/domain/money';
import { useActiveLedger } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useLedgerStore } from '@/stores/ledger.store';
import { createStyles, colors, fontSize, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Budget'>;

export const BudgetScreen = ({ navigation }: Props) => {
  const ledger = useActiveLedger();
  const setBudget = useLedgerStore((state) => state.setBudget);
  const [amount, setAmount] = useState(
    ledger && ledger.monthlyBudget > 0
      ? formatCents(ledger.monthlyBudget, { thousands: false })
      : '',
  );
  const [saving, setSaving] = useState(false);

  if (!ledger) {
    return (
      <View style={styles.container}>
        <AppHeader title="预算设置" onBack={() => navigation.goBack()} />
        <Text style={styles.empty}>请先选择账本</Text>
      </View>
    );
  }

  const handleSave = async () => {
    const cents = parseAmountToCents(amount);
    if (cents === null) {
      showAlert('提示', '请输入正确的预算金额');
      return;
    }
    setSaving(true);
    try {
      await setBudget(ledger.id, cents);
      showAlert('已保存', `本月预算 ${formatCents(cents)} 元`, [
        { text: '好的', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showAlert('保存失败', error instanceof Error ? error.message : '请稍后再试');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    showAlert('清除预算', '确定清除本月预算吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: () => {
          void setBudget(ledger.id, 0)
            .then(() => navigation.goBack())
            .catch((error: unknown) =>
              showAlert('操作失败', error instanceof Error ? error.message : '请稍后再试'),
            );
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="预算设置" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextField
          label={`${ledger.name} · 月度预算（元）`}
          placeholder="例如：3000"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <PrimaryButton title="保存预算" onPress={() => void handleSave()} loading={saving} />
        {ledger.monthlyBudget > 0 ? (
          <Pressable style={styles.clear} onPress={handleClear}>
            <Text style={styles.clearText}>清除预算（当前 {formatCents(ledger.monthlyBudget)} 元）</Text>
          </Pressable>
        ) : null}
        <Text style={styles.tip}>预算按自然月统计，首页汇总卡会展示本月使用进度。</Text>
      </ScrollView>
    </View>
  );
};

const styles = createStyles({
  clear: {
    alignItems: 'center',
    paddingVertical: space(3),
  },
  clearText: {
    color: colors.danger,
    fontSize: fontSize.sm,
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    gap: space(5),
    padding: space(4),
  },
  empty: {
    color: colors.textSecondary,
    padding: space(6),
    textAlign: 'center',
  },
  tip: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
