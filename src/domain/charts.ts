/**
 * 图表几何纯函数：供 react-native-svg 组件消费，独立可测。
 */

export interface Arc {
  startDeg: number;
  endDeg: number;
}

/**
 * 根据数值序列生成环形图扇区角度（顺时针，0° 在正上方）。
 * 和为 0 返回空数组；单一非零值返回整圆。
 */
export const donutArcs = (values: number[]): Arc[] => {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return [];
  const arcs: Arc[] = [];
  let cursor = 0;
  for (const value of values) {
    if (value <= 0) continue;
    const span = (value / total) * 360;
    // 单一扇区时留 0.01° 避免部分渲染器整圆不绘制
    const end = values.filter((v) => v > 0).length === 1 ? 359.99 : cursor + span;
    arcs.push({ startDeg: cursor, endDeg: end });
    cursor += span;
  }
  return arcs;
};

/** 中心文案容器与内孔边缘的留白，按环壁厚的比例计算 */
const CENTER_BOX_INSET_RATIO = 0.2;

export interface DonutCenterBox {
  /** 文案容器边长 */
  size: number;
  /** 容器相对整图左上角的偏移（上下左右一致，保证严格居中） */
  offset: number;
}

/**
 * 环形图中心文案容器的边长与偏移。
 * 容器必须由组件显式设置 left / top：绝对定位元素若省略偏移量会退回静态位置
 * （容器顶部），导致文案明显偏上。
 */
export const donutCenterBox = (size: number, thickness: number): DonutCenterBox => {
  const innerDiameter = size - thickness * 2;
  const inset = thickness * CENTER_BOX_INSET_RATIO;
  const box = innerDiameter - inset * 2;
  return { size: box, offset: (size - box) / 2 };
};

export const polar = (
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const fmt = (n: number): string => Number(n.toFixed(2)).toString();

/** 环形扇区 SVG 路径（外弧起 -> 外弧终 -> 内弧终 -> 内弧起） */
export const arcPath = (
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startDeg: number,
  endDeg: number,
): string => {
  // 接近整圆拆成两个 180°，否则单弧渲染器会画不出
  if (endDeg - startDeg >= 359.9) {
    const half = startDeg + (endDeg - startDeg) / 2;
    return [
      arcPath(cx, cy, rOuter, rInner, startDeg, half),
      arcPath(cx, cy, rOuter, rInner, half, endDeg),
    ].join(' ');
  }

  const o1 = polar(cx, cy, rOuter, startDeg);
  const o2 = polar(cx, cy, rOuter, endDeg);
  const i2 = polar(cx, cy, rInner, endDeg);
  const i1 = polar(cx, cy, rInner, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${fmt(o1.x)} ${fmt(o1.y)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${fmt(o2.x)} ${fmt(o2.y)}`,
    `L ${fmt(i2.x)} ${fmt(i2.y)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${fmt(i1.x)} ${fmt(i1.y)}`,
    'Z',
  ].join(' ');
};

export interface LineChartGeometry {
  points: string;
  area: string;
  /** 原始坐标，供绘制圆点 */
  coords: { x: number; y: number }[];
}

/**
 * 折线图：values 映射到 viewBox 内坐标，含面积填充路径。
 * 纵轴上限 `max` 由调用方给出（单位与 values 一致）：多条线共享同一上限才能横向比较，
 * 非正值按 1 处理避免除零。
 */
export const lineGeometry = (
  values: number[],
  width: number,
  height: number,
  padding: number,
  max: number,
): LineChartGeometry => {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const scale = max > 0 ? max : 1;
  const coords = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : padding + (innerW * i) / (values.length - 1),
    y: height - padding - (v / scale) * innerH,
  }));
  const points = coords.map((c) => `${fmt(c.x)},${fmt(c.y)}`).join(' ');
  const baseline = height - padding;
  const area =
    coords.length === 0
      ? ''
      : `M ${fmt(coords[0].x)} ${fmt(baseline)} ` +
        coords.map((c) => `L ${fmt(c.x)} ${fmt(c.y)}`).join(' ') +
        ` L ${fmt(coords[coords.length - 1].x)} ${fmt(baseline)} Z`;
  return { points, area, coords };
};

/**
 * 触摸交互：把容器内的触点 x（像素）换算到 viewBox 后，取最近的数据点下标。
 *
 * Svg 宽度为 100% 且 `preserveAspectRatio="none"`，横向会被拉伸到容器宽度，
 * 所以必须先按 onLayout 量到的容器宽度换算，不能按 viewBox 宽度直接取。
 * 无数据返回 -1；容器宽度未量到（<= 0）时退化为 1:1 换算。
 */
export const nearestPointIndex = (
  locationX: number,
  count: number,
  containerWidth: number,
  viewWidth: number,
  padding: number,
): number => {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const width = containerWidth > 0 ? containerWidth : viewWidth;
  const x = (locationX / width) * viewWidth;
  const innerWidth = viewWidth - padding * 2;
  const ratio = innerWidth > 0 ? (x - padding) / innerWidth : 0;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
};

/** 浮层与数据点的默认间距（viewBox 单位） */
const TOOLTIP_GAP = 8;

export interface TooltipLayout {
  /** 相对图表容器左上角的偏移 */
  left: number;
  top: number;
}

export interface TooltipPlacementInput {
  /** 选中数据点在 viewBox 中的坐标 */
  point: { x: number; y: number };
  viewWidth: number;
  viewHeight: number;
  /** onLayout 量到的图表容器尺寸 */
  containerWidth: number;
  containerHeight: number;
  tooltipWidth: number;
  tooltipHeight: number;
  /** 浮层与数据点的间距 */
  gap?: number;
}

/** 偏移量收敛到 [0, container - size]；容器尚未量到（<= 0）时不收敛 */
const clampOffset = (value: number, size: number, container: number): number => {
  if (container <= 0) return value;
  if (size >= container) return 0;
  return Math.min(Math.max(value, 0), container - size);
};

/**
 * 半透明浮层的绝对定位：水平以数据点居中并收敛在容器内，
 * 垂直优先放在数据点上方，上方空间不足时落到下方，始终不超出容器。
 */
export const tooltipPlacement = ({
  point,
  viewWidth,
  viewHeight,
  containerWidth,
  containerHeight,
  tooltipWidth,
  tooltipHeight,
  gap = TOOLTIP_GAP,
}: TooltipPlacementInput): TooltipLayout => {
  const anchorX =
    viewWidth > 0 && containerWidth > 0 ? (point.x * containerWidth) / viewWidth : point.x;
  const anchorY =
    viewHeight > 0 && containerHeight > 0 ? (point.y * containerHeight) / viewHeight : point.y;
  const above = anchorY - gap - tooltipHeight;
  return {
    left: clampOffset(anchorX - tooltipWidth / 2, tooltipWidth, containerWidth),
    top: clampOffset(above >= 0 ? above : anchorY + gap, tooltipHeight, containerHeight),
  };
};

/** 折线图浮层日期文案，如 (8, 3) -> "8月3日" */
export const trendDayLabel = (month: number, day: number): string => `${month}月${day}日`;

export interface BarRect {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 0 值所在的 y 坐标，负值柱向下画 */
  baselineY: number;
}

export interface SeriesBounds {
  min: number;
  max: number;
}

/** 多序列共用纵轴范围：始终包含 0，避免柱状图/结余线偏离基线 */
export const seriesBounds = (series: number[][]): SeriesBounds => {
  const values = series.flat();
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  return { min, max: max > min ? max : min + 1 };
};

/** 带正负值的折线几何：纵轴范围由调用方给出 */
export const lineGeometryRange = (
  values: number[],
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number,
): LineChartGeometry => {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const span = max > min ? max - min : 1;
  const coords = values.map((value, index) => ({
    x: values.length === 1 ? width / 2 : padding + (innerW * index) / (values.length - 1),
    y: padding + ((max - value) / span) * innerH,
  }));
  const points = coords.map((coord) => `${fmt(coord.x)},${fmt(coord.y)}`).join(' ');
  return { points, area: '', coords };
};

/**
 * 柱状图几何：支持正负值，同一数据点可横向并排多组柱子。
 * groupIndex / groupCount 用于「收支」这种多序列模式。
 */
export const barRects = (
  values: number[],
  width: number,
  height: number,
  padding: number,
  min: number,
  max: number,
  groupIndex = 0,
  groupCount = 1,
  groupGap = 2,
): BarRect[] => {
  if (values.length === 0 || groupCount <= 0) return [];
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const span = max > min ? max - min : 1;
  const slotWidth = innerW / values.length;
  const barWidth = Math.max(1, (slotWidth - groupGap * (groupCount - 1)) / groupCount);
  const baselineY = padding + ((max - 0) / span) * innerH;
  return values.map((value, index) => {
    const valueY = padding + ((max - value) / span) * innerH;
    const top = value >= 0 ? valueY : baselineY;
    const bottom = value >= 0 ? baselineY : valueY;
    return {
      x: padding + index * slotWidth + groupIndex * (barWidth + groupGap),
      y: top,
      width: barWidth,
      height: Math.max(0, bottom - top),
      baselineY,
    };
  });
};
