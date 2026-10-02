import {
  arcPath,
  barRects,
  donutArcs,
  donutCenterBox,
  lineGeometry,
  lineGeometryRange,
  nearestPointIndex,
  polar,
  seriesBounds,
  tooltipPlacement,
  trendDayLabel,
} from './charts';

describe('donutArcs', () => {
  it('按比例分配角度', () => {
    const arcs = donutArcs([3, 1]);
    expect(arcs).toHaveLength(2);
    expect(arcs[0]).toEqual({ startDeg: 0, endDeg: 270 });
    expect(arcs[1]).toEqual({ startDeg: 270, endDeg: 360 });
  });

  it('单一值返回整圆', () => {
    const arcs = donutArcs([10]);
    expect(arcs).toEqual([{ startDeg: 0, endDeg: 359.99 }]);
  });

  it('空/全零返回空数组', () => {
    expect(donutArcs([])).toEqual([]);
    expect(donutArcs([0, 0])).toEqual([]);
  });
});

describe('polar', () => {
  it('0° 在正上方，90° 在右侧', () => {
    expect(polar(100, 100, 50, 0)).toEqual({ x: 100, y: 50 });
    expect(polar(100, 100, 50, 90)).toEqual({ x: 150, y: 100 });
  });
});

describe('arcPath', () => {
  it('扇区路径以 M 开头以 Z 结尾，含大弧标志', () => {
    const path = arcPath(100, 100, 80, 58, 0, 270);
    expect(path.startsWith('M 100 20')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
    expect(path).toContain('A 80 80 0 1 1');
  });

  it('整圆拆成两段路径', () => {
    const path = arcPath(100, 100, 80, 58, 0, 359.99);
    expect(path.match(/M /g)?.length).toBe(2);
  });
});

describe('donutCenterBox', () => {
  it('容器小于内孔且上下左右留白相等（居中）', () => {
    const box = donutCenterBox(140, 22);
    expect(box.size).toBeCloseTo(87.2, 5);
    expect(box.offset).toBeCloseTo(26.4, 5);
    // 上下/左右留白相等，容器正好居中于整图
    expect(box.offset * 2 + box.size).toBeCloseTo(140, 5);
  });

  it('容器不大于内孔直径（文字不压环）', () => {
    const box = donutCenterBox(140, 22);
    expect(box.size).toBeLessThan(140 - 22 * 2);
    expect(box.offset).toBeGreaterThan(0);
  });
});

describe('lineGeometry', () => {
  it('两点映射到 viewBox 角落', () => {
    const { points, coords } = lineGeometry([0, 100], 100, 100, 10, 100);
    expect(points).toBe('10,90 90,10');
    expect(coords).toEqual([
      { x: 10, y: 90 },
      { x: 90, y: 10 },
    ]);
  });

  it('按调用方给定的纵轴上限归一化（多序列共享刻度方可横向比较）', () => {
    const expense = lineGeometry([50], 100, 100, 10, 100);
    const income = lineGeometry([100], 100, 100, 10, 100);
    expect(expense.coords[0].y).toBeGreaterThan(income.coords[0].y);
    // 上限即峰值时贴顶
    expect(income.coords[0].y).toBe(10);
  });

  it('上限非正时退化为 1，不至于除零', () => {
    const { coords } = lineGeometry([0, 0], 100, 100, 10, 0);
    expect(coords.every((c) => c.y === 90)).toBe(true);
  });

  it('area 是闭合路径', () => {
    const { area } = lineGeometry([5, 10], 100, 100, 10, 10);
    expect(area.startsWith('M 10 90')).toBe(true);
    expect(area.endsWith('Z')).toBe(true);
  });
});

describe('nearestPointIndex', () => {
  const VIEW_WIDTH = 320;
  const PADDING = 18;

  it('无数据返回 -1', () => {
    expect(nearestPointIndex(100, 0, 300, VIEW_WIDTH, PADDING)).toBe(-1);
  });

  it('只有一个点时恒为 0', () => {
    expect(nearestPointIndex(0, 1, 300, VIEW_WIDTH, PADDING)).toBe(0);
    expect(nearestPointIndex(299, 1, 300, VIEW_WIDTH, PADDING)).toBe(0);
  });

  it('按容器实际宽度换算 viewBox 坐标后取最近下标', () => {
    // 31 天，容器 300px、viewBox 320px、左右各 18 内边距
    expect(nearestPointIndex(0, 31, 300, VIEW_WIDTH, PADDING)).toBe(0);
    expect(nearestPointIndex(300, 31, 300, VIEW_WIDTH, PADDING)).toBe(30);
    // 容器中点 -> 第 16 天（下标 15）
    expect(nearestPointIndex(150, 31, 300, VIEW_WIDTH, PADDING)).toBe(15);
    // 同一个 viewBox 点在不同容器宽度下落到同一下标（横向被拉伸）
    expect(nearestPointIndex(75, 31, 150, VIEW_WIDTH, PADDING)).toBe(15);
  });

  it('容器宽度为 0（onLayout 未量到）时退化为 1:1 换算', () => {
    expect(nearestPointIndex(160, 31, 0, VIEW_WIDTH, PADDING)).toBe(15);
  });

  it('越界触摸收敛到首尾', () => {
    expect(nearestPointIndex(-40, 31, 300, VIEW_WIDTH, PADDING)).toBe(0);
    expect(nearestPointIndex(9999, 31, 300, VIEW_WIDTH, PADDING)).toBe(30);
  });
});

describe('tooltipPlacement', () => {
  const base = {
    viewWidth: 320,
    viewHeight: 120,
    containerWidth: 300,
    containerHeight: 120,
    tooltipWidth: 120,
    tooltipHeight: 60,
    gap: 8,
  };

  it('中间点：水平以数据点居中，垂直放在数据点上方', () => {
    const { left, top } = tooltipPlacement({ ...base, point: { x: 160, y: 100 } });
    // 160 * 300 / 320 = 150，再各减半个浮层宽度
    expect(left).toBe(90);
    expect(top).toBe(32);
  });

  it('贴近左右边界时收敛，浮层不超出容器', () => {
    expect(tooltipPlacement({ ...base, point: { x: 0, y: 10 } }).left).toBe(0);
    expect(tooltipPlacement({ ...base, point: { x: 320, y: 10 } }).left).toBe(300 - 120);
  });

  it('上方空间不足时落到数据点下方并夹在容器内', () => {
    const { top } = tooltipPlacement({ ...base, point: { x: 160, y: 10 } });
    expect(top).toBe(10 + 8);
  });

  it('浮层比容器还大时贴左上角，不产生负偏移', () => {
    expect(tooltipPlacement({ ...base, containerWidth: 100, point: { x: 160, y: 10 } }).left).toBe(0);
    expect(
      tooltipPlacement({ ...base, tooltipHeight: 200, point: { x: 160, y: 100 } }).top,
    ).toBe(0);
  });

  it('未量到容器尺寸时退化为 viewBox 1:1 定位', () => {
    const { left, top } = tooltipPlacement({
      ...base,
      containerWidth: 0,
      containerHeight: 0,
      point: { x: 160, y: 100 },
    });
    expect(left).toBe(160 - 60);
    expect(top).toBe(32);
  });
});

describe('trendDayLabel', () => {
  it('生成浮层日期文案', () => {
    expect(trendDayLabel(8, 3)).toBe('8月3日');
    expect(trendDayLabel(12, 31)).toBe('12月31日');
  });
});

describe('seriesBounds / lineGeometryRange', () => {
  it('多序列范围始终包含 0', () => {
    expect(seriesBounds([[10, 20], [5, 30]])).toEqual({ min: 0, max: 30 });
    expect(seriesBounds([[-10, -20]])).toEqual({ min: -20, max: 0 });
    expect(seriesBounds([[]])).toEqual({ min: 0, max: 1 });
  });

  it('带正负值的折线按统一范围映射到基线两侧', () => {
    const { coords } = lineGeometryRange([-50, 50], 100, 100, 10, -50, 50);
    expect(coords).toEqual([
      { x: 10, y: 90 },
      { x: 90, y: 10 },
    ]);
  });
});

describe('barRects', () => {
  it('正值从基线向上、负值从基线向下，基线在 0 值处', () => {
    const bars = barRects([50, -50], 100, 100, 10, -50, 50);
    expect(bars[0]).toMatchObject({ y: 10, baselineY: 50, height: 40 });
    expect(bars[1]).toMatchObject({ y: 50, baselineY: 50, height: 40 });
  });

  it('多组柱子在同一数据点横向并排', () => {
    const first = barRects([100, 100], 100, 100, 10, 0, 100, 0, 2);
    const second = barRects([100, 100], 100, 100, 10, 0, 100, 1, 2);
    expect(second[0].x).toBeGreaterThan(first[0].x);
    expect(second[0].width).toBe(first[0].width);
  });

  it('空数据返回空数组', () => {
    expect(barRects([], 100, 100, 10, 0, 100)).toEqual([]);
  });
});
