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

/** 折线图：values 映射到 viewBox 内坐标，含面积填充路径 */
export const lineGeometry = (
  values: number[],
  width: number,
  height: number,
  padding: number,
): LineChartGeometry => {
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const max = Math.max(1, ...values);
  const coords = values.map((v, i) => ({
    x: values.length === 1 ? width / 2 : padding + (innerW * i) / (values.length - 1),
    y: height - padding - (v / max) * innerH,
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
