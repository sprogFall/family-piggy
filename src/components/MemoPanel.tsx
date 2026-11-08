import { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MemoList } from '@/components/MemoList';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { TextField } from '@/components/ui/TextField';
import { showAlert } from '@/lib/alert';
import { getErrorMessage } from '@/lib/errors';
import { useLedgerStore } from '@/stores/ledger.store';
import { selectMemoItems, useMemoStore } from '@/stores/memo.store';
import { fontSize, makeStyles, radius, space } from '@/theme';
import type { MemoItem, MemoScope } from '@/types/domain';

type Importance = MemoItem['importance'];
const IMPORTANCE: { value: Importance; label: string }[] = [{ value: 'high', label: '重要' }, { value: 'medium', label: '一般' }, { value: 'low', label: '较低' }];

export const MemoPanel = () => {
  const styles = useStyles();
  const families = useLedgerStore((state) => state.families);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const scope = useMemo<MemoScope>(() => familyId ? { type: 'family', familyId } : { type: 'personal' }, [familyId]);
  const items = useMemoStore((state) => selectMemoItems(state, scope));
  const load = useMemoStore((state) => state.load);
  const subscribe = useMemoStore((state) => state.subscribe);
  const create = useMemoStore((state) => state.create);
  const update = useMemoStore((state) => state.update);
  const remove = useMemoStore((state) => state.remove);
  const reorder = useMemoStore((state) => state.reorder);
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<MemoItem | null>(null);
  const [content, setContent] = useState('');
  const [importance, setImportance] = useState<Importance>('medium');
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setLoadError(false);
    void load(scope).catch(() => { if (active) setLoadError(true); });
    const unsubscribe = subscribe(scope);
    return () => { active = false; unsubscribe(); };
  }, [scope, load, subscribe, retry]);
  useEffect(() => { if (familyId && !families.some(({ family }) => family.id === familyId)) setFamilyId(null); }, [families, familyId]);
  const open = (item: MemoItem | null) => {
    setEditing(item); setContent(item?.content ?? ''); setImportance(item?.importance ?? 'medium'); setVisible(true);
  };
  const handleError = (error: unknown) => showAlert('操作失败', getErrorMessage(error));
  const save = () => {
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    const request = editing ? update(scope, editing.id, { content: trimmed, importance }) : create(scope, { content: trimmed, importance });
    void request.then(() => setVisible(false)).catch(handleError).finally(() => setBusy(false));
  };
  return <View style={styles.card}>
    <View style={styles.heading}><Text style={styles.title}>备忘录</Text><Pressable accessibilityRole="button" accessibilityLabel="添加备忘录" onPress={() => open(null)}><Text style={styles.link}>＋ 添加</Text></Pressable></View>
    <View style={styles.scopes}>
      <Pressable accessibilityRole="button" accessibilityLabel="选择个人" accessibilityState={{ selected: familyId === null }} onPress={() => setFamilyId(null)}><Text style={[styles.scope, familyId === null && styles.selected]}>个人</Text></Pressable>
      {families.map(({ family }) => <Pressable key={family.id} accessibilityRole="button" accessibilityLabel={`选择家庭${family.name}`} accessibilityState={{ selected: familyId === family.id }} onPress={() => setFamilyId(family.id)}><Text style={[styles.scope, familyId === family.id && styles.selected]}>{family.name}</Text></Pressable>)}
    </View>
    <Text style={styles.hint}>{familyId ? '家庭成员共享，任一成员完成即同步完成' : '仅自己可见和维护'} · 长按拖动排序，左滑删除，右滑完成</Text>
    {loadError ? <Pressable accessibilityRole="button" accessibilityLabel="重试加载备忘录" onPress={() => setRetry((value) => value + 1)}><Text style={styles.link}>加载失败，点击重试</Text></Pressable> : null}
    {items.length ? <MemoList items={items} onEdit={open} onToggle={(item, isCompleted) => { void update(scope, item.id, { isCompleted }).catch(handleError); }} onDelete={(item) => { void remove(scope, item.id).catch(handleError); }} onReorder={(ordered) => { void reorder(scope, ordered.map((item) => item.id)).catch(handleError); }} /> : <Text style={styles.empty}>暂无备忘录</Text>}
    <BottomSheet visible={visible} onClose={() => setVisible(false)} title={editing ? '编辑备忘录' : '添加备忘录'}>
      <TextField accessibilityLabel="备忘录内容" value={content} onChangeText={setContent} placeholder="输入备忘录内容" multiline />
      <Text style={styles.label}>重要程度</Text>
      <View style={styles.scopes}>{IMPORTANCE.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={`重要程度${option.label}`} accessibilityState={{ selected: importance === option.value }} onPress={() => setImportance(option.value)}><Text style={[styles.scope, importance === option.value && styles.selected]}>{option.label}</Text></Pressable>)}</View>
      <PrimaryButton title="保存" disabled={!content.trim()} loading={busy} onPress={save} />
    </BottomSheet>
  </View>;
};
const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space(4) },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  link: { color: colors.primary, fontSize: fontSize.sm },
  scopes: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2), marginVertical: space(3) },
  scope: { color: colors.textSecondary, backgroundColor: colors.bg, overflow: 'hidden', borderRadius: radius.round, paddingHorizontal: space(3), paddingVertical: space(1) },
  selected: { color: colors.primary, backgroundColor: colors.primaryLight },
  hint: { color: colors.textSecondary, fontSize: fontSize.xs },
  empty: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', padding: space(4) },
  label: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: space(3) },
}));
