import {
  AXIS_LABEL_LINE_HEIGHT,
  TRAIL_PAD,
  estimateLabelWidth,
  rotatedLabelLayout,
  trendAxisLayout,
  trendAxisTicks,
  xAxisHeight,
} from './trendAxis';

const dayKeys = (startISO: string, count: number): string[] => {
  const [y, m, d] = startISO.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(y, m - 1, d + i);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
};

const monthKeys = (startYear: number, startMonth: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => {
    const total = startMonth - 1 + i;
    const year = startYear + Math.floor(total / 12);
    const month = (total % 12) + 1;
    return `${year}-${String(month).padStart(2, '0')}`;
  });

/** 与图表一致:n 个点均匀铺满 plotWidth,相邻点间距 = plotWidth / (n - 1) */
const texts = (keys: string[], plotWidth: number): string[] =>
  trendAxisTicks(keys, keys.length > 1 ? plotWidth / (keys.length - 1) : 0).map((tick) => tick.text);

describe('trendAxisTicks', () => {
  it('空数据不产生刻度', () => {
    expect(trendAxisTicks([], 50)).toEqual([]);
  });

  it('间距未知或单点数据只保留起点', () => {
    expect(texts(dayKeys('2024-02-01', 5), 0)).toEqual(['2月1日']);
    expect(trendAxisTicks(['2024-02-01'], 0)).toEqual([{ index: 0, text: '2月1日' }]);
  });

  it('同一月内只显示日,起点保留完整的月日', () => {
    expect(texts(dayKeys('2024-02-01', 5), 300)).toEqual(['2月1日', '2日', '3日', '4日', '5日']);
  });

  it('区间跨月时在月初边界只显示新的月份', () => {
    expect(texts(dayKeys('2024-02-27', 6), 300)).toEqual(['2月27日', '28日', '29日', '3月', '2日', '3日']);
  });

  it('跨年时起点与 1 月边界都显示年份', () => {
    expect(texts(dayKeys('2024-12-30', 4), 300)).toEqual(['2024年12月30日', '31日', '2025年1月', '2日']);
  });

  it('刻度过密时按 1日 5日 10日 这类日历步长显示,相邻刻度不重叠', () => {
    // 30 天挤在 170px 内,相邻间距约 5.9px:步长 1/2 都会重叠,取 5 才满足最小间距
    expect(texts(dayKeys('2024-03-01', 30), 170)).toEqual([
      '3月1日',
      '5日',
      '10日',
      '15日',
      '20日',
      '25日',
      '30日',
    ]);
  });

  it('月初边界附近的刻度被剔除,起点与边界优先保留', () => {
    // 3/29 ~ 4/3 相邻间距 10px:边界 4/1 与起点足够远保留,其余步长刻度都挤在边界旁被剔除
    expect(texts(dayKeys('2024-03-29', 6), 50)).toEqual(['3月29日', '4月']);
  });

  it('起点与月初边界过近时保留起点,丢弃边界', () => {
    expect(texts(dayKeys('2024-03-31', 4), 30)).toEqual(['3月31日', '2日']);
  });

  it('月份粒度下同一年不显示年,跨年时在 1 月显示年份', () => {
    expect(texts(monthKeys(2024, 1, 4), 300)).toEqual(['1月', '2月', '3月', '4月']);
    expect(texts(monthKeys(2024, 11, 4), 300)).toEqual(['2024年11月', '12月', '2025年1月', '2月']);
  });

  it('月份过多时按 1月 5月 9月 这类步长交替显示,跨年边界带年份', () => {
    // 24 个月挤在 130px 内,步长 4 对齐到 1/5/9 月
    expect(texts(monthKeys(2024, 1, 24), 130)).toEqual([
      '2024年1月',
      '5月',
      '9月',
      '2025年1月',
      '5月',
      '9月',
    ]);
  });

  it('刻度索引指向原始数据点', () => {
    const ticks = trendAxisTicks(dayKeys('2024-02-27', 6), 60);
    expect(ticks.map((tick) => tick.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('estimateLabelWidth', () => {
  it('中文按全角、数字按半角估算宽度', () => {
    expect(estimateLabelWidth('年', 11)).toBe(11);
    expect(estimateLabelWidth('12', 10)).toBe(11);
  });
});

describe('rotatedLabelLayout', () => {
  /** 按 -45° 旋转后标签外接框:边长 (w+h)·√½,右缘贴齐刻度,上缘贴齐横轴顶部 */
  const boundingBox = (tickX: number, w: number) => {
    const { left, top } = rotatedLabelLayout(tickX, w);
    const h = AXIS_LABEL_LINE_HEIGHT;
    const centerX = left + w / 2;
    const centerY = top + h / 2;
    const half = ((w + h) / 2) * Math.SQRT1_2;
    return { right: centerX + half, top: centerY - half, bottom: centerY + half };
  };

  it('外接框右缘贴齐刻度、上缘贴齐横轴顶部', () => {
    const box = boundingBox(120, 40);
    expect(box.right).toBeCloseTo(120, 6);
    expect(box.top).toBeCloseTo(0, 6);
  });

  it('横轴高度恰好容纳旋转后的外接框', () => {
    const box = boundingBox(120, 40);
    expect(xAxisHeight(40)).toBeGreaterThanOrEqual(Math.ceil(box.bottom));
  });
});

describe('trendAxisLayout', () => {
  it('输出的刻度携带像素位置、宽度与旋转后的左上角,横轴高度覆盖所有标签', () => {
    const keys = dayKeys('2024-03-01', 3);
    const layout = trendAxisLayout(keys, [0, 100, 200], 11);

    expect(layout.ticks.map((tick) => tick.text)).toEqual(['3月1日', '2日', '3日']);
    expect(layout.ticks.map((tick) => tick.index)).toEqual([0, 1, 2]);
    layout.ticks.forEach((tick, i) => {
      expect(tick.width).toBe(estimateLabelWidth(tick.text, 11) + TRAIL_PAD);
      expect(tick.left).toBeCloseTo(rotatedLabelLayout([0, 100, 200][i], tick.width).left, 6);
    });
    const maxWidth = Math.max(...layout.ticks.map((tick) => tick.width));
    expect(layout.height).toBe(xAxisHeight(maxWidth));
  });

  it('没有刻度时高度为 0', () => {
    expect(trendAxisLayout([], [], 11)).toEqual({ height: 0, ticks: [] });
  });

  it('像素间距由相邻 x 位置推导,而非容器宽度', () => {
    // 间距 10px < 最小间距 20px:31日 紧贴起点被剔除,边界 4月 保留
    const keys = dayKeys('2024-03-30', 4);
    const layout = trendAxisLayout(keys, [0, 10, 20, 30], 11);
    expect(layout.ticks.map((tick) => tick.text)).toEqual(['3月30日', '4月']);
  });
});
