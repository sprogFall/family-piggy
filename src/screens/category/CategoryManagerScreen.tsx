import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { validateCategoryName } from '@/domain/validation';
import { useActiveLedger, useActiveCategories } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import type { Category, TxKind } from '@/types/domain';
import { createStyles, colors, fontSize, radius, space } from '@/theme';
import { ICON_CHOICES } from '@/theme/icons';

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryManager'>;

const KIND_TABS = [
  { key: 'expense' as const, label: '支出' },
  { key: 'income' as const, label: '收入' },
];

interface EditTarget {
  category: Category | null;
  kind: TxKind;
}

export const CategoryManagerScreen = ({ navigation }: Props) => {
  const [kind, setKind] = useState<TxKind>('expense');
  const [editing, setEditing] = useState<EditTarget | null>(null);

  const ledger = useActiveLedger();
  const categories = useActiveCategories().filter((category) => category.kind === kind);
  const load = useCategoryStore((state) => state.load);
  const create = useCategoryStore((state) => state.create);
  const update = useCategoryStore((state) => state.update);
  const remove = useCategoryStore((state) => state.remove);

  useFocusEffect(
    useCallback(() => {
      if (ledger) void load(ledger.id);
    }, [ledger?.id]),
  );

  const openCreate = () => {
    if (!ledger) {
      showAlert('提示', '请先选择账本');
      return;
    }
    setEditing({ category: null, kind });
  };

  const handleSave = async (name: string, icon: string) => {
    if (!editing || !ledger) return;
    const nameError = validateCategoryName(name);
    if (nameError) {
      showAlert('提示', nameError);
      return;
    }
    try {
      if (editing.category) {
        await update(editing.category.id, ledger.id, { name, icon });
      } else {
        const maxSort = categories.reduce((max, c) => Math.max(max, c.sortOrder), 0);
        await create({
          ledgerId: ledger.id,
          name,
          icon,
          kind: editing.kind,
          sortOrder: maxSort + 1,
        });
      }
      setEditing(null);
    } catch (error) {
      showAlert('保存失败', error instanceof Error ? error.message : '请稍后再试');
    }
  };

  const handleDelete = (category: Category) => {
    if (!ledger) return;
    showAlert('删除分类', `确定删除「${category.name}」吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void remove(category.id, ledger.id);
          setEditing(null);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>分类管理</Text>
        <View style={{ width: 24 }} />
      </View>

      <SegmentedTabs items={KIND_TABS} value={kind} onChange={setKind} />

      <ScrollView style={styles.list}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={styles.row}
            onPress={() => setEditing({ category, kind: category.kind })}
          >
            <CategoryIcon iconKey={category.icon} size={38} />
            <Text style={styles.name}>{category.name}</Text>
            <Ionicons name="pencil" size={16} color={colors.textTertiary} />
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="＋ 新增分类" onPress={openCreate} />
      </View>

      <CategoryEditModal
        target={editing}
        onClose={() => setEditing(null)}
        onSave={(name, icon) => void handleSave(name, icon)}
        onDelete={handleDelete}
      />
    </View>
  );
};

interface EditModalProps {
  target: EditTarget | null;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
  onDelete: (category: Category) => void;
}

const CategoryEditModal = ({ target, onClose, onSave, onDelete }: EditModalProps) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('ellipsis-horizontal');
  const visible = target !== null;
  const category = target?.category ?? null;

  // 打开时同步初值
  const [lastKey, setLastKey] = useState<string | null>(null);
  const openKey = target ? `${target.category?.id ?? 'new'}-${target.kind}` : null;
  if (openKey && openKey !== lastKey) {
    setLastKey(openKey);
    setName(category?.name ?? '');
    setIcon(category?.icon ?? 'ellipsis-horizontal');
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>{category ? '编辑分类' : '新增分类'}</Text>
          <TextInput
            style={styles.input}
            value={name}
            placeholder="分类名（1-6 个字符）"
            placeholderTextColor={colors.textTertiary}
            maxLength={6}
            onChangeText={setName}
          />
          <View style={styles.iconGrid}>
            {ICON_CHOICES.map((choice) => (
              <Pressable key={choice} onPress={() => setIcon(choice)} style={styles.iconItem}>
                <CategoryIcon iconKey={choice} size={40} selected={icon === choice} />
              </Pressable>
            ))}
          </View>
          <View style={styles.modalActions}>
            {category ? (
              <Pressable
                style={styles.deleteButton}
                onPress={() => category && onDelete(category)}
              >
                <Text style={styles.deleteText}>删除分类</Text>
              </Pressable>
            ) : null}
            <PrimaryButton title="保存" style={styles.saveButton} onPress={() => onSave(name.trim(), icon)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = createStyles({
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  deleteButton: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  deleteText: {
    color: colors.danger,
    fontSize: fontSize.md,
  },
  footer: {
    padding: space(4),
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: space(3),
  },
  iconItem: {
    alignItems: 'center',
    paddingVertical: space(1),
    width: '20%',
  },
  input: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    fontSize: fontSize.md,
    minHeight: 44,
    paddingHorizontal: space(3),
  },
  list: {
    flex: 1,
  },
  mask: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space(8),
  },
  modalActions: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: space(4),
  },
  modalCard: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    maxHeight: '80%',
    padding: space(5),
  },
  modalTitle: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: space(4),
    textAlign: 'center',
  },
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    marginHorizontal: space(3),
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.card,
    flexDirection: 'row',
    marginBottom: StyleSheet.hairlineWidth,
    paddingHorizontal: space(3),
    paddingVertical: space(2.5),
  },
  saveButton: {
    flex: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
