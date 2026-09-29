import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, Text, View } from 'react-native';

import { moveItem } from '@/domain/category-order';
import type { Category } from '@/types/domain';
import { makeStyles, useColors, fontSize, space } from '@/theme';

import { CategoryIcon } from './ui/CategoryIcon';

const ROW_HEIGHT = 60;

interface Props {
  categories: Category[];
  onPress: (category: Category) => void;
  onReorder: (categories: Category[]) => void;
}

/** 分类管理列表：长按某行后上下拖动排序，松手后回写 sort_order */
export const DraggableCategoryList = ({ categories, onPress, onReorder }: Props) => {
  const styles = useStyles();
  const [items, setItems] = useState(categories);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const draggingIdRef = useRef<string | null>(null);
  const originItemsRef = useRef(categories);
  const fromIndexRef = useRef(0);
  const toIndexRef = useRef(0);
  const suppressPressRef = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    if (draggingId === null) {
      setItems(categories);
      itemsRef.current = categories;
    }
  }, [categories, draggingId]);

  const finishDrag = () => {
    if (draggingIdRef.current !== null) onReorder(itemsRef.current);
    draggingIdRef.current = null;
    setDraggingId(null);
  };

  const handleLongPress = (categoryId: string) => {
    const fromIndex = itemsRef.current.findIndex((item) => item.id === categoryId);
    if (fromIndex < 0) return;
    originItemsRef.current = itemsRef.current;
    fromIndexRef.current = fromIndex;
    toIndexRef.current = fromIndex;
    draggingIdRef.current = categoryId;
    suppressPressRef.current = true;
    setTimeout(() => {
      suppressPressRef.current = false;
    }, 500);
    setDraggingId(categoryId);
  };

  const handleDragMove = (dy: number) => {
    if (draggingIdRef.current === null) return;
    const toIndex = Math.max(
      0,
      Math.min(
        itemsRef.current.length - 1,
        fromIndexRef.current + Math.round(dy / ROW_HEIGHT),
      ),
    );
    if (toIndex === toIndexRef.current) return;
    toIndexRef.current = toIndex;
    const next = moveItem(originItemsRef.current, fromIndexRef.current, toIndex);
    itemsRef.current = next;
    setItems(next);
  };

  const handlePress = (category: Category) => {
    if (suppressPressRef.current || draggingIdRef.current !== null) {
      suppressPressRef.current = false;
      if (draggingIdRef.current !== null) finishDrag();
      return;
    }
    onPress(category);
  };

  if (items.length === 0) return null;

  return (
    <View>
      {items.map((category) => (
        <DraggableCategoryRow
          key={category.id}
          category={category}
          onPress={() => handlePress(category)}
          onLongPress={() => handleLongPress(category.id)}
          onDragMove={handleDragMove}
          onDragEnd={finishDrag}
        />
      ))}
    </View>
  );
};

interface RowProps {
  category: Category;
  onPress: () => void;
  onLongPress: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}

const DraggableCategoryRow = ({
  category,
  onPress,
  onLongPress,
  onDragMove,
  onDragEnd,
}: RowProps) => {
  const styles = useStyles();
  const colors = useColors();
  /** 长按后同步置 true；PanResponder 通过 ref 读取，避免依赖 state 重渲染丢失手势 */
  const dragActiveRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const onPressRef = useRef(onPress);
  const onLongPressRef = useRef(onLongPress);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  onPressRef.current = onPress;
  onLongPressRef.current = onLongPress;
  onDragMoveRef.current = onDragMove;
  onDragEndRef.current = onDragEnd;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: () => dragActiveRef.current,
      onMoveShouldSetPanResponder: () => dragActiveRef.current,
      onPanResponderMove: (_event, gesture) => {
        if (dragActiveRef.current) onDragMoveRef.current(gesture.dy);
      },
      onPanResponderRelease: () => {
        if (dragActiveRef.current) onDragEndRef.current();
        dragActiveRef.current = false;
        setDragging(false);
      },
      onPanResponderTerminate: () => {
        if (dragActiveRef.current) onDragEndRef.current();
        dragActiveRef.current = false;
        setDragging(false);
      },
    }),
  ).current;

  return (
    <View style={[styles.row, dragging ? styles.rowDragging : null]} {...panResponder.panHandlers}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${category.name}，长按拖拽排序`}
        onPress={() => onPressRef.current()}
        onLongPress={() => {
          dragActiveRef.current = true;
          setDragging(true);
          onLongPressRef.current();
        }}
        delayLongPress={250}
        style={styles.rowContent}
      >
        <CategoryIcon iconKey={category.icon} size={38} />
        <Text style={styles.name}>{category.name}</Text>
        <Ionicons name="reorder-three" size={20} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  name: {
    color: colors.text,
    flex: 1,
    fontSize: fontSize.md,
    marginHorizontal: space(3),
  },
  row: {
    backgroundColor: colors.card,
    marginBottom: 1,
  },
  rowDragging: {
    backgroundColor: colors.primaryLight,
    elevation: 3,
  },
  rowContent: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    paddingHorizontal: space(3),
  },
}));
