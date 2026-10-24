/**
 * 双向滑动操作的纯决策逻辑：把「松手后停在哪一侧」从 PanResponder 手势回调里抽出来，
 * 便于单测覆盖阈值与边界（组件只负责把 gestureState 传进来并执行动画）。
 */

/** 左滑露出的「编辑 / 删除」操作区宽度 */
export const EDIT_ACTIONS_WIDTH = 144;
/** 右滑露出的「报销」操作区宽度 */
export const REIMBURSE_ACTION_WIDTH = 88;

/** 触发左滑展开的比例与速度阈值 */
const OPEN_RATIO = 0.35;
const OPEN_VELOCITY = -0.35;
/** 右滑触发报销的比例阈值：拖过四成即可确认 */
const REIMBURSE_RATIO = 0.4;

export type SwipeSide = 'left' | 'right' | null;

export interface SwipeGesture {
  /** 相对手势起点的累计位移，向右为正 */
  dx: number;
  /** 水平速度，向右为正 */
  vx: number;
}

export interface SwipeSettleInput {
  gesture: SwipeGesture;
  /** 手势开始时已展开的一侧（0 位移的基准） */
  startSide: SwipeSide;
  /** 是否允许右滑报销；不允许时右侧不参与判定 */
  canReimburse: boolean;
}

export interface SwipeSettleResult {
  /** 松手后应停留的一侧；null 表示收起 */
  side: SwipeSide;
  /** 是否应触发报销切换（仅在右滑越过阈值时为 true） */
  reimburse: boolean;
}

/** 某一侧展开时的静止位移 */
export const offsetOfSide = (side: SwipeSide, canReimburse: boolean): number => {
  if (side === 'left') return -EDIT_ACTIONS_WIDTH;
  if (side === 'right') return canReimburse ? REIMBURSE_ACTION_WIDTH : 0;
  return 0;
};

/**
 * 拖动过程中的位移夹取：左不越过操作区、右不越过报销区（不可报销时右侧锁死为 0）。
 */
export const clampOffset = (offset: number, canReimburse: boolean): number =>
  Math.min(canReimburse ? REIMBURSE_ACTION_WIDTH : 0, Math.max(-EDIT_ACTIONS_WIDTH, offset));

/**
 * 松手后的落点决策：
 * - 从收起态右滑越过报销阈值即触发报销并收起（无需点按钮）；
 * - 否则按位移比例或速度决定是否展开左侧操作区，其余情况收起。
 *
 * 报销只在「本次手势从收起态开始且位移为正」时触发：若左滑操作区已展开，
 * 用户往右拖多半只是想收起面板，此时若按绝对位移判定，手指划过中线就会误报销；
 * 若右滑面板已展开，继续右拖也不应重复切换（避免连点式的误操作）。
 */
export const resolveSwipeSettle = ({
  gesture,
  startSide,
  canReimburse,
}: SwipeSettleInput): SwipeSettleResult => {
  const end = offsetOfSide(startSide, canReimburse) + gesture.dx;

  const shouldReimburse =
    canReimburse &&
    startSide === null &&
    gesture.dx > 0 &&
    end > REIMBURSE_ACTION_WIDTH * REIMBURSE_RATIO;
  if (shouldReimburse) return { side: null, reimburse: true };

  const shouldOpenLeft =
    end < -EDIT_ACTIONS_WIDTH * OPEN_RATIO || gesture.vx < OPEN_VELOCITY;
  return { side: shouldOpenLeft ? 'left' : null, reimburse: false };
};