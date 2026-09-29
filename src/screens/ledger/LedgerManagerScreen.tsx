import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppHeader } from '@/components/ui/AppHeader';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { PromptModal } from '@/components/ui/PromptModal';
import { validateLedgerName } from '@/domain/validation';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useLedgerStore } from '@/stores/ledger.store';
import type { Ledger } from '@/types/domain';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LedgerManager'>;

type ModalMode = 'create' | 'rename' | null;

export const LedgerManagerScreen = ({ navigation }: Props) => {
  const styles = useStyles();
  const colors = useColors();
  const ledgers = useLedgerStore((state) => state.ledgers);
  const activeLedgerId = useLedgerStore((state) => state.activeLedgerId);
  const createPersonalLedger = useLedgerStore((state) => state.createPersonalLedger);
  const renameLedger = useLedgerStore((state) => state.renameLedger);
  const removeLedger = useLedgerStore((state) => state.removeLedger);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editing, setEditing] = useState<Ledger | null>(null);
  const [busy, setBusy] = useState(false);

  const personalLedgers = ledgers.filter((ledger) => ledger.type === 'personal');

  const handleSubmit = async (name: string) => {
    const error = validateLedgerName(name);
    if (error) {
      showAlert('提示', error);
      return;
    }
    setBusy(true);
    try {
      if (modalMode === 'create') {
        await createPersonalLedger(name.trim());
      } else if (modalMode === 'rename' && editing) {
        await renameLedger(editing.id, name.trim());
      }
      setModalMode(null);
      setEditing(null);
    } catch (submitError) {
      showAlert('保存失败', submitError instanceof Error ? submitError.message : '请稍后再试');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (ledger: Ledger) => {
    if (personalLedgers.length <= 1) {
      showAlert('提示', '至少保留一个个人账单');
      return;
    }
    showAlert('删除个人账单', `删除「${ledger.name}」后，该账单下的流水将无法访问，确定删除吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          setBusy(true);
          void removeLedger(ledger.id)
            .catch((removeError) =>
              showAlert('删除失败', removeError instanceof Error ? removeError.message : '请稍后再试'),
            )
            .finally(() => setBusy(false));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AppHeader title="账单管理" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>仅管理个人账单；家庭账单请在家庭管理中操作</Text>
        <View style={styles.card}>
          {personalLedgers.map((ledger) => (
            <View key={ledger.id} style={styles.row}>
              <View style={styles.nameWrap}>
                <Text style={styles.name} numberOfLines={1}>
                  {ledger.name}
                </Text>
                {ledger.id === activeLedgerId ? <Text style={styles.current}>当前使用</Text> : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`重命名 ${ledger.name}`}
                hitSlop={8}
                onPress={() => {
                  setEditing(ledger);
                  setModalMode('rename');
                }}
              >
                <Ionicons name="pencil" size={18} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`删除 ${ledger.name}`}
                hitSlop={8}
                onPress={() => confirmRemove(ledger)}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>

        <PrimaryButton
          title="＋ 新增个人账单"
          disabled={busy}
          onPress={() => {
            setEditing(null);
            setModalMode('create');
          }}
        />
      </ScrollView>

      <PromptModal
        visible={modalMode !== null}
        onClose={() => {
          setModalMode(null);
          setEditing(null);
        }}
        title={modalMode === 'rename' ? '修改账单名称' : '新增个人账单'}
        initialValue={editing?.name ?? ''}
        placeholder="账单名称（1-12 个字符）"
        submitLabel="保存"
        maxLength={12}
        onSubmit={(name) => void handleSubmit(name)}
      />
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: space(4),
    overflow: 'hidden',
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    padding: space(4),
  },
  current: {
    color: colors.primary,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: space(3),
  },
  name: {
    color: colors.text,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  nameWrap: {
    flex: 1,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space(4),
    minHeight: 56,
    paddingHorizontal: space(4),
  },
}));
