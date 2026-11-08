import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';
import { moveItem } from '@/domain/category-order';
import { showAlert } from '@/lib/alert';
import { fontSize, makeStyles, space } from '@/theme';
import type { MemoItem } from '@/types/domain';

const ROW_HEIGHT = 64;
const SWIPE_THRESHOLD = 60;
const LABELS = { high: '重要', medium: '一般', low: '较低' } as const;
interface Props {
  items: MemoItem[];
  onEdit: (item: MemoItem) => void;
  onToggle: (item: MemoItem, completed: boolean) => void;
  onDelete: (item: MemoItem) => void;
  onReorder: (items: MemoItem[]) => void;
}

export const MemoList = ({ items, onEdit, onToggle, onDelete, onReorder }: Props) => {
  const [draft, setDraft] = useState(items);
  const draftRef = useRef(items);
  const origin = useRef(items);
  const from = useRef(-1);
  const dragging = useRef(false);
  const heights = useRef<Record<string, number>>({});
  useEffect(() => { if (!dragging.current) { setDraft(items); draftRef.current = items; } }, [items]);
  const begin = (id: string) => {
    from.current = draftRef.current.findIndex((item) => item.id === id);
    origin.current = draftRef.current;
    dragging.current = from.current >= 0;
  };
  const move = (dy: number) => {
    if (!dragging.current) return;
    let target = from.current;
    let distance = Math.abs(dy);
    const direction = dy < 0 ? -1 : 1;
    while (target + direction >= 0 && target + direction < origin.current.length) {
      const next = target + direction;
      const height = heights.current[origin.current[next].id] ?? ROW_HEIGHT;
      if (distance < height / 2) break;
      distance -= height;
      target = next;
    }
    draftRef.current = moveItem(origin.current, from.current, target);
    setDraft(draftRef.current);
  };
  const finish = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (draftRef.current.some((item, index) => item.id !== origin.current[index]?.id)) onReorder(draftRef.current);
    draftRef.current = items;
    setDraft(items);
  };
  return <View>{draft.map((item) => <MemoRow key={item.id} item={item} onEdit={() => onEdit(item)} onToggle={() => onToggle(item, !item.isCompleted)} onDelete={() => showAlert('删除备忘录', `确定删除「${item.content}」吗？`, [{ text: '取消', style: 'cancel' }, { text: '删除', style: 'destructive', onPress: () => onDelete(item) }])} onBegin={() => begin(item.id)} onMove={move} onFinish={finish} onHeight={(height) => { heights.current[item.id] = height; }} />)}</View>;
};

interface RowProps { item: MemoItem; onEdit: () => void; onToggle: () => void; onDelete: () => void; onBegin: () => void; onMove: (dy: number) => void; onFinish: () => void; onHeight: (height: number) => void }
const MemoRow = (props: RowProps) => {
  const styles = useStyles();
  const latest = useRef(props); latest.current = props;
  const drag = useRef(false);
  const captured = useRef(false);
  const responder = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_e, g) => drag.current || (Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy)),
    onPanResponderGrant: () => { captured.current = true; },
    onPanResponderMove: (_e, g) => { if (drag.current) latest.current.onMove(g.dy); },
    onPanResponderRelease: (_e, g) => {
      if (drag.current) latest.current.onFinish();
      else if (g.dx >= SWIPE_THRESHOLD) latest.current.onToggle();
      else if (g.dx <= -SWIPE_THRESHOLD) latest.current.onDelete();
      drag.current = false;
      captured.current = false;
    },
    onPanResponderTerminate: () => { if (drag.current) latest.current.onFinish(); drag.current = false; captured.current = false; },
  })).current;
  const { item } = props;
  return <View testID={`memo-row-${item.id}`} onLayout={(event) => props.onHeight(event.nativeEvent.layout.height)} style={styles.row} {...responder.panHandlers}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.isCompleted ? '取消完成' : '完成'}${item.content}`} onPress={props.onToggle}><Text style={styles.check}>{item.isCompleted ? '☑' : '○'}</Text></Pressable>
    <Pressable style={styles.content} accessibilityRole="button" accessibilityLabel={`编辑${item.content}`} onPress={props.onEdit} onLongPress={() => { drag.current = true; props.onBegin(); }} onPressOut={() => { if (drag.current && !captured.current) { drag.current = false; props.onFinish(); } }} delayLongPress={250}>
      <Text style={[styles.text, item.isCompleted && styles.completed]}>{item.content}</Text>
      <Text style={[styles.importance, styles[item.importance]]}>{LABELS[item.importance]}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`删除${item.content}`} onPress={props.onDelete}><Text style={styles.delete}>删除</Text></Pressable>
  </View>;
};
const useStyles = makeStyles((colors) => ({
  row: { minHeight: ROW_HEIGHT, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, gap: space(2) },
  content: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space(2) },
  text: { color: colors.text, fontSize: fontSize.md, flex: 1 },
  completed: { color: colors.textSecondary, textDecorationLine: 'line-through' },
  check: { color: colors.primary, fontSize: fontSize.xl },
  importance: { fontSize: fontSize.xs },
  high: { color: colors.danger }, medium: { color: colors.primary }, low: { color: colors.textSecondary },
  delete: { color: colors.danger, fontSize: fontSize.sm },
}));
