import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { DraggableCategoryList } from '@/components/DraggableCategoryList';
import { CategoryIcon } from '@/components/ui/CategoryIcon';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import {
  isSameCategoryOrder,
  mergeCategoryOrder,
} from '@/domain/category-order';
import { validateCategoryName } from '@/domain/validation';
import { useActiveLedger, useActiveCategories } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { useCategoryStore } from '@/stores/category.store';
import type { Category, TxKind } from '@/types/domain';
import { makeStyles, useColors, fontSize, radius, space } from '@/theme';
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
  const styles = useStyles();
  const colors = useColors();
  const [kind, setKind] = useState<TxKind>('expense');
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [draftOrders, setDraftOrders] = useState<Partial<Record<TxKind, string[]>>>({});
  const [savingOrder, setSavingOrder] = useState(false);
  const allowLeaveRef = useRef(false);

  const ledger = useActiveLedger();
  const allCategories = useActiveCategories();
  const load = useCategoryStore((state) => state.load);
  const create = useCategoryStore((state) => state.create);
  const update = useCategoryStore((state) => state.update);
  const remove = useCategoryStore((state) => state.remove);

  const serverIdsOf = useCallback(
    (targetKind: TxKind): string[] =>
      allCategories.filter((category) => category.kind === targetKind).map((category) => category.id),
    [allCategories],
  );

  const categories = useMemo(() => {
    const base = allCategories.filter((category) => category.kind === kind);
    const draft = draftOrders[kind];
    if (!draft) return base;
    const byId = new Map(base.map((category) => [category.id, category]));
    return mergeCategoryOrder(
      base.map((category) => category.id),
      draft,
    )
      .map((id) => byId.get(id))
      .filter((category): category is Category => category !== undefined);
  }, [allCategories, draftOrders, kind]);

  const hasUnsavedOrder = useMemo(
    () =>
      (['expense', 'income'] as TxKind[]).some((targetKind) => {
        const draft = draftOrders[targetKind];
        if (!draft) return false;
        const serverIds = serverIdsOf(targetKind);
        return !isSameCategoryOrder(mergeCategoryOrder(serverIds, draft), serverIds);
      }),
    [draftOrders, serverIdsOf],
  );

  useFocusEffect(
    useCallback(() => {
      if (ledger) void load(ledger.id);
    }, [ledger?.id]),
  );

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (!hasUnsavedOrder || allowLeaveRef.current) return;
        event.preventDefault();
        showAlert('提示', '分类排序还未保存，确定退出吗？', [
          { text: '继续排序', style: 'cancel' },
          {
            text: '退出',
            style: 'destructive',
            onPress: () => {
              allowLeaveRef.current = true;
              navigation.dispatch(event.data.action);
            },
          },
        ]);
      }),
    [hasUnsavedOrder, navigation],
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
        const maxSort = allCategories
          .filter((category) => category.kind === editing.kind)
          .reduce((max, category) => Math.max(max, category.sortOrder), 0);
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

  const handleReorder = (nextCategories: Category[]) => {
    setDraftOrders((current) => ({
      ...current,
      [kind]: nextCategories.map((category) => category.id),
    }));
  };

  const handleSaveOrder = async () => {
    if (!ledger || savingOrder) return;
    setSavingOrder(true);
    try {
      for (const targetKind of ['expense', 'income'] as TxKind[]) {
        const draft = draftOrders[targetKind];
        if (!draft) continue;
        const serverIds = serverIdsOf(targetKind);
        const nextIds = mergeCategoryOrder(serverIds, draft);
        if (isSameCategoryOrder(nextIds, serverIds)) continue;

        for (let index = 0; index < nextIds.length; index++) {
          const sortOrder = index + 1;
          const category = allCategories.find((item) => item.id === nextIds[index]);
          if (category && category.sortOrder !== sortOrder) {
            await update(category.id, ledger.id, { sortOrder });
          }
        }
      }
      setDraftOrders({});
    } catch (error) {
      showAlert('排序保存失败', error instanceof Error ? error.message : '请稍后再试');
      await load(ledger.id).catch(() => undefined);
      setDraftOrders({});
    } finally {
      setSavingOrder(false);
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
        <DraggableCategoryList
          categories={categories}
          onPress={(category) => setEditing({ category, kind: category.kind })}
          onReorder={handleReorder}
        />
      </ScrollView>

      <View style={styles.footer}>
        {hasUnsavedOrder ? (
          <PrimaryButton
            title="保存排序"
            onPress={() => void handleSaveOrder()}
            loading={savingOrder}
          />
        ) : null}
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
  const styles = useStyles();
  const colors = useColors();
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

const useStyles = makeStyles((colors) => ({
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
    gap: space(2),
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
    backgroundColor: colors.scrim,
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
  saveButton: {
    flex: 2,
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
