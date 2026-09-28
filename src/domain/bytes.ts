/** 字节数展示：下载进度与安装包大小统一走这里 */

const UNITS = ['B', 'KB', 'MB', 'GB'] as const;
const STEP = 1024;

export const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${UNITS[0]}`;

  let value = bytes;
  let unit = 0;
  while (value >= STEP && unit < UNITS.length - 1) {
    value /= STEP;
    unit += 1;
  }

  // 字节数不带小数，KB 及以上保留一位小数
  return unit === 0 ? `${Math.round(value)} ${UNITS[unit]}` : `${value.toFixed(1)} ${UNITS[unit]}`;
};
