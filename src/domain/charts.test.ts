import { arcPath, donutArcs, lineGeometry, polar } from './charts';

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

describe('lineGeometry', () => {
  it('两点映射到 viewBox 角落', () => {
    const { points, coords } = lineGeometry([0, 100], 100, 100, 10);
    expect(points).toBe('10,90 90,10');
    expect(coords).toEqual([
      { x: 10, y: 90 },
      { x: 90, y: 10 },
    ]);
  });

  it('全零数据不至于除零，基线在底部', () => {
    const { coords } = lineGeometry([0, 0], 100, 100, 10);
    expect(coords.every((c) => c.y === 90)).toBe(true);
  });

  it('area 是闭合路径', () => {
    const { area } = lineGeometry([5, 10], 100, 100, 10);
    expect(area.startsWith('M 10 90')).toBe(true);
    expect(area.endsWith('Z')).toBe(true);
  });
});
