import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import RNDateTimePicker from '@react-native-community/datetimepicker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountKeypad } from '@/components/ui/AmountKeypad';
import { AmountPanel } from '@/components/ui/AmountPanel';
import { CategoryGrid } from '@/components/ui/CategoryGrid';
import { CurrencyPickerSheet } from '@/components/ui/CurrencyPickerSheet';
import { RecurringScheduleSheet } from '@/components/ui/RecurringScheduleSheet';
import { SegmentedTabs } from '@/components/ui/SegmentedTabs';
import { TagSelector } from '@/components/ui/TagSelector';
import {
  TransactionExtrasFields,
  initialTransactionImageDrafts,
} from '@/components/ui/TransactionExtrasFields';
import { evaluateAmountExpression } from '@/domain/amount-input';
import type { CurrencyCode } from '@/domain/currency';
import { entryDateLabel } from '@/domain/dates';
import { formatCents, parseAmountToCents } from '@/domain/money';
import {
  deviceTimeZone,
  formatRecurringSchedule,
  isSameRecurringSchedule,
  nextRunDate,
  validateRecurringSchedule,
} from '@/domain/recurring';
import type { TransactionImageDraft } from '@/domain/transaction-images';
import { useActiveLedger, useActiveCategories, useActiveTags } from '@/hooks/useActiveLedgerData';
import { showAlert } from '@/lib/alert';
import type { RootStackParamList } from '@/navigation/types';
import { transactionImageService } from '@/services/transaction-image.service';
import { useAuthStore } from '@/stores/auth.store';
import { useCategoryStore } from '@/stores/category.store';
import {
  selectRecurringRuleById,
  useRecurringRuleStore,
} from '@/stores/recurring-rule.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useTagStore } from '@/stores/tag.store';
import { useToastStore } from '@/stores/toast.store';
import { selectTransactionById, useTransactionStore } from '@/stores/transaction.store';
import type { RecurringSchedule, Tag, TxKind } from '@/types/domain';
import { fontSize, makeStyles, space, useColors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTransaction'>;

const KIND_TABS = [
  { key: 'expense' as const, label: '支出' },
  { key: 'income' as const, label: '收入' },
];

export const AddTransactionScreen = ({ navigation, route }: Props) => {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const colors = useColors();
  /** 编辑模式：从账单列表携带 transactionId 进入 */
  const editing = useTransactionStore((state) =>
    selectTransactionById(state, route.params?.transactionId),
  );
  const editingRule = useRecurringRuleStore((state) =>
    selectRecurringRuleById(state, route.params?.recurringRuleId),
  );
  const isEditingRule = Boolean(editingRule);
  const sessionUserId = useAuthStore((state) => state.session?.user.id);

  const [kind, setKind] = useState<TxKind>(editingRule?.kind ?? editing?.kind ?? 'expense');
  const [categoryId, setCategoryId] = useState<string | null>(
    editingRule?.categoryId ?? editing?.categoryId ?? null,
  );
  const [amount, setAmount] = useState(
    editingRule
      ? formatCents(editingRule.amount, { thousands: false })
      : editing
        ? formatCents(editing.amount, { thousands: false })
        : '',
  );
  const [tagNames, setTagNames] = useState<string[]>(editingRule?.tagNames ?? editing?.tagNames ?? []);
  const [note, setNote] = useState(editingRule?.note ?? editing?.note ?? '');
  const [reimbursement, setReimbursement] = useState(
    editingRule?.attributes.reimbursement ?? editing?.attributes.reimbursement ?? false,
  );
  const [images, setImages] = useState<TransactionImageDraft[]>(() =>
    initialTransactionImageDrafts(editingRule?.images ?? editing?.images ?? []),
  );
  const [date, setDate] = useState(editing ? new Date(editing.occurredAt) : new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recurringEnabled, setRecurringEnabled] = useState(
    route.params?.startRecurring === true || Boolean(route.params?.recurringRuleId),
  );
  const [schedule, setSchedule] = useState<RecurringSchedule | null>(editingRule?.schedule ?? null);
  const [showScheduleSheet, setShowScheduleSheet] = useState(route.params?.startRecurring === true);
  /** 金额键盘默认展开；备注输入获得焦点时隐藏，点击金额区域再唤起 */
  const [keypadVisible, setKeypadVisible] = useState(true);

  const ledger = useActiveLedger();
  const categories = useActiveCategories();
  /** 标签隶属于分类：未选分类时不展示、也不能新增 */
  const tags = useActiveTags(categoryId);
  const selectedTagIds = useMemo(
    () =>
      tagNames
        .map((name) => tags.find((tag) => tag.name === name)?.id)
        .filter((id): id is string => id !== undefined),
    [tagNames, tags],
  );
  const loadCategories = useCategoryStore((state) => state.load);
  const loadTags = useTagStore((state) => state.load);
  const ensureTag = useTagStore((state) => state.ensure);
  const removeTag = useTagStore((state) => state.remove);
  const addTransaction = useTransactionStore((state) => state.add);
  const updateTransaction = useTransactionStore((state) => state.update);
  const removeTransaction = useTransactionStore((state) => state.remove);
  const addRecurringRule = useRecurringRuleStore((state) => state.create);
  const updateRecurringRule = useRecurringRuleStore((state) => state.update);
  const showToast = useToastStore((state) => state.show);
  const defaultCurrency = useSettingsStore((state) => state.currency);
  const rememberCurrency = useSettingsStore((state) => state.setCurrency);
  const [currency, setCurrency] = useState<CurrencyCode>(
    editingRule?.currency ?? editing?.currency ?? defaultCurrency,
  );

  useFocusEffect(
    useCallback(() => {
      if (!ledger) return;
      void loadCategories(ledger.id);
      void loadTags(ledger.id).catch(() => undefined);
    }, [ledger?.id]),
  );

  // 带 transactionId / recurringRuleId 进入但数据不在缓存中：直接返回
  useEffect(() => {
    if (route.params?.transactionId && !editing) {
      showAlert('提示', '账单不存在或已删除');
      navigation.goBack();
    }
    if (route.params?.recurringRuleId && !editingRule) {
      showAlert('提示', '定时记账不存在或已删除');
      navigation.goBack();
    }
    // 仅在挂载时判断一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 编辑定时记账：缓存中的规则晚于页面到达时回填一次
  useEffect(() => {
    if (!editingRule) return;
    setKind(editingRule.kind);
    setCategoryId(editingRule.categoryId);
    setAmount(formatCents(editingRule.amount, { thousands: false }));
    setTagNames(editingRule.tagNames);
    setNote(editingRule.note);
    setReimbursement(editingRule.attributes.reimbursement);
    setImages(initialTransactionImageDrafts(editingRule.images));
    setCurrency(editingRule.currency);
    setSchedule(editingRule.schedule);
    setRecurringEnabled(true);
    // 仅在规则 ID 变化时回填，避免覆盖用户正在编辑的字段
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingRule?.id]);

  const kindCategories = categories.filter((category) => category.kind === kind);
  const isRecurringMode = recurringEnabled || isEditingRule;
  const recurringScheduleLabel = schedule ? formatRecurringSchedule(schedule) : null;

  const changeKind = (next: TxKind) => {
    setKind(next);
    setCategoryId(null);
    // 标签隶属于分类，切换类型后原分类与标签都不再适用
    setTagNames([]);
  };

  const changeCategory = (nextId: string) => {
    setCategoryId(nextId);
    // 每个分类有自己的标签集合，换分类后清空已选标签
    setTagNames([]);
  };

  const changeCurrency = (next: CurrencyCode) => {
    setCurrency(next);
    // 记住本次选择，下次记账默认沿用
    rememberCurrency(next);
  };

  const createTag = (name: string) => {
    if (!ledger || !categoryId) return;
    void ensureTag({ ledgerId: ledger.id, categoryId, name })
      .then((tag) =>
        setTagNames((current) => (current.includes(tag.name) ? current : [...current, tag.name])),
      )
      .catch((error: unknown) =>
        showAlert('标签保存失败', error instanceof Error ? error.message : '请稍后再试'),
      );
  };

  const confirmRemoveTag = (tag: Tag) => {
    if (!ledger) return;
    const ledgerId = ledger.id;
    showAlert('删除标签', `删除后已记账单不受影响，只是之后不能再复用「${tag.name}」，确定删除吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void removeTag(tag.id, ledgerId)
            .then(() => setTagNames((current) => current.filter((name) => name !== tag.name)))
            .catch((error: unknown) =>
              showAlert('删除失败', error instanceof Error ? error.message : '请稍后再试'),
            );
        },
      },
    ]);
  };

  const submit = async () => {
    const evaluatedAmount = evaluateAmountExpression(amount);
    const cents = evaluatedAmount === null ? null : parseAmountToCents(evaluatedAmount);
    if (!ledger) {
      showAlert('提示', '请先选择账本');
      return;
    }
    if (!categoryId) {
      showAlert('提示', '请选择分类');
      return;
    }
    if (cents === null) {
      showAlert('提示', '请输入正确的金额');
      return;
    }

    if (isRecurringMode) {
      const scheduleError = validateRecurringSchedule(schedule);
      if (scheduleError) {
        showAlert('提示', scheduleError);
        setShowScheduleSheet(true);
        return;
      }
    }

    const ledgerId = ledger.id;
    setSubmitting(true);
    let uploadedImageUrls: string[] = [];

    try {
      let imageUrls = images
        .filter((image) => image.remote)
        .map((image) => image.uri);
      const localImages = images.filter((image) => !image.remote);

      if (localImages.length > 0) {
        if (!sessionUserId) throw new Error('未登录');
        uploadedImageUrls = await transactionImageService.upload(
          ledgerId,
          sessionUserId,
          localImages.map((image) => ({
            uri: image.uri,
            mimeType: image.mimeType ?? null,
          })),
        );
        const uploadedQueue = [...uploadedImageUrls];
        imageUrls = images.flatMap((image) => {
          if (image.remote) return [image.uri];
          const uploaded = uploadedQueue.shift();
          return uploaded ? [uploaded] : [];
        });
      }

      if (isRecurringMode && schedule) {
        const rulePayload = {
          categoryId,
          kind,
          amount: cents,
          currency,
          tagNames,
          note: note.trim(),
          attributes: { ...(editingRule?.attributes ?? {}), reimbursement },
          images: imageUrls,
          schedule,
          timeZone: editingRule?.timeZone ?? deviceTimeZone(),
          nextRunOn:
            editingRule && isSameRecurringSchedule(editingRule.schedule, schedule)
              ? editingRule.nextRunOn
              : nextRunDate(schedule),
        };

        if (editingRule) {
          await updateRecurringRule(editingRule.id, ledgerId, rulePayload);
        } else {
          await addRecurringRule({ ledgerId, ...rulePayload });
        }

        const removedRuleImages = (editingRule?.images ?? []).filter(
          (url) => !imageUrls.includes(url),
        );
        if (removedRuleImages.length > 0) {
          void transactionImageService.remove(removedRuleImages).catch(() => undefined);
        }

        showToast(editingRule ? '定时记账已保存' : '定时记账已创建');
        navigation.goBack();
        return;
      }

      const payload = {
        categoryId,
        kind,
        amount: cents,
        currency,
        tagNames,
        note: note.trim(),
        // 编辑时保留数据库里预留的其它记账类型字段，只覆盖当前 UI 支持的报销
        attributes: { ...(editing?.attributes ?? {}), reimbursement },
        images: imageUrls,
        occurredAt: date.toISOString(),
      };

      if (editing) {
        await updateTransaction(editing.id, ledgerId, payload);
      } else {
        await addTransaction({ ledgerId, ...payload });
      }

      const removedImages = (editing?.images ?? []).filter((url) => !imageUrls.includes(url));
      if (removedImages.length > 0) {
        void transactionImageService.remove(removedImages).catch(() => undefined);
      }

      showToast(editing ? '已保存' : '记账成功');
      navigation.goBack();
    } catch (error) {
      if (uploadedImageUrls.length > 0) {
        void transactionImageService.remove(uploadedImageUrls).catch(() => undefined);
      }
      showAlert(
        isRecurringMode ? '定时记账失败' : editing ? '保存失败' : '记账失败',
        error instanceof Error ? error.message : '请稍后再试',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = () => {
    if (!editing || !ledger) return;
    const ledgerId = ledger.id;
    const savedImages = editing.images;
    showAlert('删除账单', '删除后不可恢复，确定删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          void removeTransaction(editing.id, ledgerId)
            .then(() => {
              if (savedImages.length > 0) {
                void transactionImageService.remove(savedImages).catch(() => undefined);
              }
              navigation.goBack();
            })
            .catch((error: unknown) =>
              showAlert('删除失败', error instanceof Error ? error.message : '请稍后再试'),
            );
        },
      },
    ]);
  };

  const changeRecurring = (next: boolean) => {
    if (editingRule) {
      setShowScheduleSheet(true);
      return;
    }
    setRecurringEnabled(next);
    if (next) {
      setShowScheduleSheet(true);
      return;
    }
    setSchedule(null);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space(3) }]}>
        <Pressable hitSlop={12} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={26} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>
          {editingRule ? '编辑定时记账' : editing ? '编辑账单' : '记一笔'}
        </Text>
        {editing ? (
          <Pressable hitSlop={12} onPress={confirmRemove}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        ) : (
          <View style={{ width: 26 }} />
        )}
      </View>

      {/* 顶部：左侧币种 + 金额，右侧日期，位于支出/收入之上，便于先确认币种、数额与时间 */}
      <AmountPanel
        currency={currency}
        amount={amount}
        result={evaluateAmountExpression(amount)}
        dateLabel={
          isRecurringMode
            ? (recurringScheduleLabel ?? '选择定时时间')
            : entryDateLabel(date.toISOString())
        }
        onPressCurrency={() => setShowCurrencyPicker(true)}
        onPressDate={() => (isRecurringMode ? setShowScheduleSheet(true) : setShowPicker(true))}
        onPressAmount={() => {
          Keyboard.dismiss();
          setKeypadVisible(true);
        }}
      />

      <View style={styles.tabsCard}>
        <SegmentedTabs items={KIND_TABS} value={kind} onChange={changeKind} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <CategoryGrid
          categories={kindCategories}
          selectedId={categoryId}
          onSelect={(category) => changeCategory(category.id)}
        />
        {categoryId ? (
          <TagSelector
            tags={tags}
            selectedIds={selectedTagIds}
            onToggle={(tagId) => {
              const tag = tags.find((item) => item.id === tagId);
              if (!tag) return;
              setTagNames((current) =>
                current.includes(tag.name)
                  ? current.filter((name) => name !== tag.name)
                  : [...current, tag.name],
              );
            }}
            onCreate={createTag}
            onRemove={confirmRemoveTag}
          />
        ) : (
          <Text style={styles.tagHint}>选择分类后可为该分类添加标签</Text>
        )}

        <TransactionExtrasFields
          note={note}
          onNoteChange={setNote}
          reimbursement={reimbursement}
          onReimbursementChange={setReimbursement}
          recurring={isRecurringMode}
          onRecurringChange={editing ? undefined : changeRecurring}
          recurringScheduleLabel={recurringScheduleLabel}
          images={images}
          onImagesChange={setImages}
          onNoteFocus={() => setKeypadVisible(false)}
          onNoteBlur={() => setKeypadVisible(true)}
        />
      </ScrollView>

      <View style={styles.bottom}>
        {showPicker && !isRecurringMode ? (
          <RNDateTimePicker
            value={date}
            mode="date"
            onChange={(_event, selected) => {
              setShowPicker(false);
              if (selected) setDate(selected);
            }}
          />
        ) : null}

        <CurrencyPickerSheet
          visible={showCurrencyPicker}
          onClose={() => setShowCurrencyPicker(false)}
          value={currency}
          onSelect={changeCurrency}
        />

        <RecurringScheduleSheet
          visible={showScheduleSheet}
          value={schedule}
          onClose={() => {
            setShowScheduleSheet(false);
            if (!schedule && !editingRule) setRecurringEnabled(false);
          }}
          onConfirm={(next) => {
            setSchedule(next);
            setRecurringEnabled(true);
            setShowScheduleSheet(false);
          }}
        />
        {keypadVisible ? (
          <AmountKeypad
            value={amount}
            onChange={setAmount}
            onSubmit={() => void submit()}
            submitDisabled={submitting}
            submitLabel={editing || editingRule ? '保存' : '完成'}
          />
        ) : null}
      </View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: space(2),
  },
  bottom: {
    backgroundColor: colors.card,
  },
  container: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: space(3),
    paddingHorizontal: space(4),
  },
  tabsCard: {
    backgroundColor: colors.card,
  },
  tagHint: {
    color: colors.textTertiary,
    fontSize: fontSize.sm,
    paddingHorizontal: space(4),
    paddingVertical: space(3),
  },
  title: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
}));
