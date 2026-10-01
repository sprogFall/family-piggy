import { useEffect, useRef } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { makeStyles, fontSize, space } from '@/theme';

export interface WheelPickerOption<T extends string | number> {
  label: string;
  value: T;
}

interface Props<T extends string | number> {
  options: WheelPickerOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ITEMS;

const selectedIndexIn = <T extends string | number>(
  options: WheelPickerOption<T>[],
  value: T,
): number => {
  const index = options.findIndex((option) => option.value === value);
  return index < 0 ? 0 : index;
};

/** 移动端滚轮选择器：FlatList 吸附到中间项，适合频率 / 日期等少量离散值 */
export function WheelPicker<T extends string | number>({
  options,
  value,
  onChange,
  testID,
}: Props<T>) {
  const styles = useStyles();
  const listRef = useRef<FlatList<WheelPickerOption<T>> | null>(null);
  const valueRef = useRef(value);
  const selectedIndex = selectedIndexIn(options, value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (options.length === 0) return;
    try {
      listRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
    } catch {
      // 首次挂载时列表可能尚未完成测量，initialScrollIndex 会兜底，失败可忽略
    }
  }, [options.length, selectedIndex]);

  const selectIndex = (index: number) => {
    const next = options[Math.max(0, Math.min(index, options.length - 1))];
    if (!next || next.value === valueRef.current) return;
    valueRef.current = next.value;
    onChange(next.value);
    try {
      listRef.current?.scrollToIndex({ index, animated: true });
    } catch {
      // 忽略测量未完成时的滚动失败，下一次渲染仍会显示选中值
    }
  };

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (options.length === 0) return;
    const rawIndex = Math.round(event.nativeEvent.contentOffset.y / WHEEL_ITEM_HEIGHT);
    selectIndex(rawIndex);
  };

  return (
    <View style={[styles.container, { height: WHEEL_HEIGHT }]}>
      <View pointerEvents="none" style={styles.selectionFrame} />
      <FlatList
        testID={testID}
        ref={listRef}
        data={options}
        keyExtractor={(item) => String(item.value)}
        showsVerticalScrollIndicator={false}
        bounces={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={selectedIndex}
        getItemLayout={(_data, index) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        initialNumToRender={options.length}
        onScrollToIndexFailed={({ index }) => {
          listRef.current?.scrollToOffset({
            offset: index * WHEEL_ITEM_HEIGHT,
            animated: false,
          });
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        contentContainerStyle={styles.content}
        renderItem={({ item, index }) => {
          const active = index === selectedIndex;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              style={styles.item}
              onPress={() => selectIndex(index)}
            >
              <Text style={[styles.itemText, active ? styles.itemTextActive : null]}>
                {item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    paddingVertical: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
  },
  item: {
    alignItems: 'center',
    height: WHEEL_ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: space(2),
  },
  itemText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  itemTextActive: {
    color: colors.text,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  selectionFrame: {
    backgroundColor: colors.primaryLight,
    borderBottomColor: colors.primary,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.primary,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: WHEEL_ITEM_HEIGHT,
    left: space(2),
    position: 'absolute',
    right: space(2),
    top: (WHEEL_HEIGHT - WHEEL_ITEM_HEIGHT) / 2,
    zIndex: 0,
  },
}));
