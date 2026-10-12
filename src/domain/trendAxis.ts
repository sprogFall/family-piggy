/**
 * 收支趋势横轴刻度:按日历粒度决定显示哪些点、标签文案,保证旋转后的标签不重叠。
 * 输入 key 来自 statement.trendInRange:日粒度 YYYY-MM-DD,月粒度 YYYY-MM。
 */

/** 旋转 -45° 后相邻标签的最小水平间距(px),约等于行高 / sin45 */
export const AXIS_LABEL_MIN_GAP = 20;
/** 标签旋转角的余弦 / 正弦,-45° 时二者相等 */
const COS_45 = Math.SQRT1_2;
/** 标签行高,与 StatsTrendChart 的 xLabel 样式保持一致 */
export const AXIS_LABEL_LINE_HEIGHT = 14;

/** 标签宽度的余量,防止估算偏小导致旋转后被截断 */
export const TRAIL_PAD = 4;

/** 日粒度可选步长:相邻显示的日期差,优先选择小步长 */
const DAY_STEPS = [1, 2, 3, 5, 10, 15] as const;
/** 月粒度可选步长:相邻显示的月份差 */
const MONTH_STEPS = [1, 2, 3, 4, 6, 12] as const;

export interface AxisTick {
  /** 对应数据点下标 */
  index: number;
  text: string;
}

interface ParsedKey {
  year: number;
  month: number;
  day: number | null;
}

const parseKey = (key: string): ParsedKey => {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day: day ?? null };
};

/**
 * 按间距与粒度生成横轴刻度。
 * 1. 起点与月初(日粒度)/ 1 月(月粒度)为必显示的边界刻度,起点优先于边界;
 * 2. 依次尝试较小的日历步长,取第一个能让步长刻度全部保留的方案;
 * 3. 都不满足时只保留边界刻度,保证起点与边界可读。
 * spacing 为相邻数据点之间的像素距离。
 */
export const trendAxisTicks = (keys: string[], spacing: number): AxisTick[] => {
  if (keys.length === 0) return [];
  const parsed = keys.map(parseKey);
  const isDaily = parsed[0].day !== null;
  const multiYear = new Set(parsed.map((p) => p.year)).size > 1;
  const priority = parsed
    .map((_, index) => index)
    .filter((index) => index === 0 || isBoundary(parsed[index], isDaily));
  const steps = isDaily ? DAY_STEPS : MONTH_STEPS;

  const pick = (aligned: number[]) => {
    const kept: number[] = [];
    const fits = (index: number) => kept.every((k) => Math.abs(k - index) * spacing >= AXIS_LABEL_MIN_GAP);
    for (const index of priority) if (fits(index)) kept.push(index);
    let droppedAligned = false;
    for (const index of aligned) {
      if (priority.includes(index)) continue;
      if (fits(index)) kept.push(index);
      else droppedAligned = true;
    }
    return { kept: kept.sort((a, b) => a - b), droppedAligned };
  };

  for (const step of steps) {
    const aligned = parsed
      .map((_, index) => index)
      .filter((index) => isAligned(parsed[index], step, isDaily));
    const result = pick(aligned);
    if (!result.droppedAligned) {
      return result.kept.map((index) => ({ index, text: labelOf(parsed, index, isDaily, multiYear) }));
    }
  }
  return pick([]).kept.map((index) => ({ index, text: labelOf(parsed, index, isDaily, multiYear) }));
};

const isBoundary = (point: ParsedKey, isDaily: boolean): boolean =>
  isDaily ? point.day === 1 : point.month === 1;

/** 日步长对齐到每月的 5、10…;月步长以 1 月为起点对齐 1、5、9… */
const isAligned = (point: ParsedKey, step: number, isDaily: boolean): boolean =>
  isDaily ? (point.day ?? 0) % step === 0 : (point.month - 1) % step === 0;

const labelOf = (parsed: ParsedKey[], index: number, isDaily: boolean, multiYear: boolean): string => {
  const point = parsed[index];
  const isStart = index === 0;
  const showYear = isStart ? multiYear : point.month === 1 && (isDaily ? point.day === 1 : true);
  const yearPart = showYear ? `${point.year}年` : '';
  if (!isDaily) return `${yearPart}${point.month}月`;
  if (isStart) return `${yearPart}${point.month}月${point.day}日`;
  if (point.day === 1) return `${yearPart}${point.month}月`;
  return `${point.day}日`;
};

/**
 * 旋转 -45° 的标签布局。RN 的 transform 围绕盒子中心旋转,因此先算中心:
 * 旋转后的外接框右缘贴齐刻度 tickX,上缘贴齐横轴区域顶部 y=0。
 * 返回未旋转标签盒的左上角(left, top),直接用于绝对定位。
 */
export const rotatedLabelLayout = (
  tickX: number,
  labelWidth: number,
): { left: number; top: number } => {
  const w = labelWidth;
  const h = AXIS_LABEL_LINE_HEIGHT;
  const centerX = tickX - (w / 2) * COS_45 - (h / 2) * COS_45;
  const centerY = (w / 2) * COS_45 + (h / 2) * COS_45;
  return { left: centerX - w / 2, top: centerY - h / 2 };
};

/** 横轴区域高度:最长旋转标签的外接框高度(宽·sin45 + 行高·cos45) */
export const xAxisHeight = (maxLabelWidth: number): number =>
  Math.ceil(maxLabelWidth * COS_45 + AXIS_LABEL_LINE_HEIGHT * COS_45);

/** 估算标签宽度:全角字符(CJK 等)按 1 个字号,ASCII 按 0.55 个字号 */
export const estimateLabelWidth = (text: string, fontSizePx: number): number => {
  let width = 0;
  for (const ch of text) {
    width += ch.charCodeAt(0) <= 0xff ? fontSizePx * 0.55 : fontSizePx;
  }
  return Math.ceil(width);
};

export interface AxisLabelLayout extends AxisTick {
  /** 标签盒宽度(含余量) */
  width: number;
  /** 未旋转标签盒的左上角,已按 -45° 旋转对齐到刻度 */
  left: number;
  top: number;
}

export interface TrendAxisLayout {
  /** 横轴区域高度,0 表示无刻度 */
  height: number;
  ticks: AxisLabelLayout[];
}

/**
 * 横轴完整布局:刻度选择 + 标签宽度 + 旋转定位 + 区域高度。
 * xPositions 为各数据点在绘图区中的像素横坐标,相邻距离同时决定刻度是否重叠。
 */
export const trendAxisLayout = (
  keys: string[],
  xPositions: number[],
  fontSizePx: number,
): TrendAxisLayout => {
  const spacing = xPositions.length > 1 ? xPositions[1] - xPositions[0] : 0;
  const ticks = trendAxisTicks(keys, spacing);
  if (ticks.length === 0) return { height: 0, ticks: [] };
  const laid = ticks.map((tick) => {
    const width = estimateLabelWidth(tick.text, fontSizePx) + TRAIL_PAD;
    const { left, top } = rotatedLabelLayout(xPositions[tick.index] ?? 0, width);
    return { ...tick, width, left, top };
  });
  const maxWidth = Math.max(...laid.map((tick) => tick.width));
  return { height: xAxisHeight(maxWidth), ticks: laid };
};
