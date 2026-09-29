import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
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
    if (draggingId !== null) onReorder(itemsRef.current);
    setDraggingId(null);
  };

  const handleLongPress = (categoryId: string) => {
    const fromIndex = itemsRef.current.findIndex((item) => item.id === categoryId);
    if (fromIndex < 0) return;
    originItemsRef.current = itemsRef.current;
    fromIndexRef.current = fromIndex;
    toIndexRef.current = fromIndex;
    suppressPressRef.current = true;
    setTimeout(() => {
      suppressPressRef.current = false;
    }, 500);
    setDraggingId(categoryId);
  };

  const handleDragMove = (dy: number) => {
    if (draggingId === null) return;
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
    if (suppressPressRef.current || draggingId !== null) {
      suppressPressRef.current = false;
      if (draggingId !== null) finishDrag();
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
          dragging={draggingId === category.id}
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
  dragging: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
}

const DraggableCategoryRow = ({
  category,
  dragging,
  onPress,
  onLongPress,
  onDragMove,
  onDragEnd,
}: RowProps) => {
  const styles = useStyles();
  const colors = useColors();
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: () => dragging,
        onMoveShouldSetPanResponder: () => dragging,
        onPanResponderMove: (_event, gesture) => onDragMove(gesture.dy),
        onPanResponderRelease: onDragEnd,
        onPanResponderTerminate: onDragEnd,
      }),
    [dragging, onDragEnd, onDragMove],
  );

  return (
    <View
      style={[styles.row, dragging ? styles.rowDragging : null]}
      {...panResponder.panHandlers}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${category.name}，长按拖拽排序`}
        onPress={onPress}
        onLongPress={onLongPress}
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
  rowContent: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: ROW_HEIGHT,
    paddingHorizontal: space(3),
  },
  rowDragging: {
    backgroundColor: colors.primaryLight,
    elevation: 3,
  },
}));
