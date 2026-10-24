import { useRef } from 'react';
import { Animated, PanResponder, Pressable, Text, View } from 'react-native';

import { TransactionRow } from '@/components/TransactionRow';
import { canMarkReimbursed, isReimbursed } from '@/domain/reimbursement';
import {
  clampOffset,
  EDIT_ACTIONS_WIDTH,
  offsetOfSide,
  resolveSwipeSettle,
  REIMBURSE_ACTION_WIDTH,
  type SwipeSide,
} from '@/domain/swipe-actions';
import type { Transaction } from '@/types/domain';
import { fontSize, makeStyles, space } from '@/theme';

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
  /** 右滑确认报销 / 取消报销，参数为目标状态；不传则不提供右滑操作 */
  onReimburse?: (reimbursed: boolean) => void;
}

/**
 * 双向滑动操作：
 * - 左滑露出「编辑 / 删除」；
 * - 右滑露出「报销 / 取消报销」，仅对可报销的支出开放。
 *
 * 点击行仍走 onPress（预览页）；任一方向已展开时点击先收起，避免误触。
 */
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
  onReimburse,
}: Props) => {
  const styles = useStyles();
  const translateX = useRef(new Animated.Value(0)).current;
  /** 'left' 表示左滑露出操作区，'right' 表示右滑露出报销，null 表示收起 */
  const openSideRef = useRef<SwipeSide>(null);
  /** 本次手势开始时的静止位移，作为 dx 的基准 */
  const gestureStartRef = useRef(0);

  // 只有可报销的支出能右滑：收入即使带标记也不参与；已报销的仍可右滑取消
  const reimbursed = isReimbursed(transaction);
  const canReimburse = onReimburse !== undefined && canMarkReimbursed(transaction);

  /**
   * PanResponder 只在首次渲染创建一次（useRef），回调里读到的会是过期闭包，
   * 因此把参与手势判定的最新值同步到 ref，供手势回调读取。
   */
  const canReimburseRef = useRef(canReimburse);
  canReimburseRef.current = canReimburse;
  const reimbursedRef = useRef(reimbursed);
  reimbursedRef.current = reimbursed;
  const onReimburseRef = useRef(onReimburse);
  onReimburseRef.current = onReimburse;
  /** 手势开始瞬间的展开状态：用于判定本次手势是否从收起态开始 */
  const gestureStartSideRef = useRef<SwipeSide>(null);

  const settle = (side: SwipeSide) => {
    openSideRef.current = side;
    Animated.spring(translateX, {
      toValue: offsetOfSide(side, canReimburse),
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
        gestureStartSideRef.current = openSideRef.current;
        gestureStartRef.current = offsetOfSide(openSideRef.current, canReimburseRef.current);
      },
      onPanResponderMove: (_event, gesture) => {
        translateX.setValue(
          clampOffset(gestureStartRef.current + gesture.dx, canReimburseRef.current),
        );
      },
      onPanResponderRelease: (_event, gesture) => {
        const { side, reimburse } = resolveSwipeSettle({
          gesture: { dx: gesture.dx, vx: gesture.vx },
          startSide: gestureStartSideRef.current,
          canReimburse: canReimburseRef.current,
        });
        settle(side);
        if (reimburse) onReimburseRef.current?.(!reimbursedRef.current);
      },
      onPanResponderTerminate: () => settle(openSideRef.current),
    }),
  ).current;

  const handleRowPress = () => {
    if (openSideRef.current !== null) {
      settle(null);
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
            settle(null);
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
            settle(null);
            onDelete();
          }}
        >
          <Text style={styles.actionText}>删除</Text>
        </Pressable>
      </View>

      {canReimburse ? (
        <View style={styles.reimburseActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reimbursed ? '取消报销' : '报销'}
            style={[styles.action, styles.reimburseAction]}
            onPress={() => {
              settle(null);
              onReimburse?.(!reimbursed);
            }}
          >
            <Text style={styles.actionText}>{reimbursed ? '取消报销' : '报销'}</Text>
          </Pressable>
        </View>
      ) : null}

      <Animated.View
        testID="swipeable-foreground"
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
    width: EDIT_ACTIONS_WIDTH / 2,
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
  reimburseAction: {
    backgroundColor: colors.primaryDark,
    width: REIMBURSE_ACTION_WIDTH,
  },
  reimburseActions: {
    bottom: 0,
    flexDirection: 'row',
    left: 0,
    position: 'absolute',
    top: 0,
  },
  wrapper: {
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
}));