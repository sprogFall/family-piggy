import { useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

import { TransactionRow } from '@/components/TransactionRow';
import type { Transaction } from '@/types/domain';
import { fontSize, makeStyles, space } from '@/theme';

const ACTION_BUTTON_WIDTH = 72;
const ACTIONS_WIDTH = ACTION_BUTTON_WIDTH * 2;

interface Props {
  transaction: Transaction;
  categoryName: string;
  iconKey: string;
  tagNames?: string[];
  showTime?: boolean;
  createdByName?: string | null;
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** 左滑露出「编辑 / 删除」操作；点击行仍走 onPress（预览页）。 */
export const SwipeableTransactionRow = ({
  transaction,
  categoryName,
  iconKey,
  tagNames = [],
  showTime = false,
  createdByName = null,
  onPress,
  onEdit,
  onDelete,
}: Props) => {
  const styles = useStyles();
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const gestureStartRef = useRef(0);

  const settle = (open: boolean) => {
    openRef.current = open;
    Animated.spring(translateX, {
      toValue: open ? -ACTIONS_WIDTH : 0,
      useNativeDriver: false,
      bounciness: 0,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        gestureStartRef.current = openRef.current ? -ACTIONS_WIDTH : 0;
      },
      onPanResponderMove: (_event, gesture) => {
        const next = Math.min(0, Math.max(-ACTIONS_WIDTH, gestureStartRef.current + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_event, gesture) => {
        const end = gestureStartRef.current + gesture.dx;
        const shouldOpen = end < -ACTIONS_WIDTH * 0.35 || gesture.vx < -0.35;
        openRef.current = shouldOpen;
        Animated.spring(translateX, {
          toValue: shouldOpen ? -ACTIONS_WIDTH : 0,
          useNativeDriver: false,
          bounciness: 0,
        }).start();
      },
      onPanResponderTerminate: () => settle(openRef.current),
    }),
  ).current;

  const handleRowPress = () => {
    if (openRef.current) {
      settle(false);
      return;
    }
    onPress?.();
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="编辑"
          style={[styles.action, styles.editAction]}
          onPress={() => {
            settle(false);
            onEdit();
          }}
        >
          <Text style={styles.actionText}>编辑</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="删除"
          style={[styles.action, styles.deleteAction]}
          onPress={() => {
            settle(false);
            onDelete();
          }}
        >
          <Text style={styles.actionText}>删除</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[styles.foreground, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TransactionRow
          transaction={transaction}
          categoryName={categoryName}
          iconKey={iconKey}
          tagNames={tagNames}
          showTime={showTime}
          createdByName={createdByName}
          onPress={handleRowPress}
        />
      </Animated.View>
    </View>
  );
};

const useStyles = makeStyles((colors) => ({
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ACTION_BUTTON_WIDTH,
  },
  actions: {
    bottom: 0,
    flexDirection: 'row',
    position: 'absolute',
    right: 0,
    top: 0,
  },
  actionText: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: colors.danger,
  },
  editAction: {
    backgroundColor: colors.primary,
  },
  foreground: {
    backgroundColor: colors.card,
  },
  wrapper: {
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
}));
