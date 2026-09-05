/** 设计令牌：所有颜色 / 间距 / 字号统一从这里取 */

export const colors = {
  primary: '#00B578',
  primaryDark: '#00945F',
  primaryLight: '#E6F7F0',
  primaryDisabled: '#A8DFC6',
  bg: '#F7F8FA',
  card: '#FFFFFF',
  border: '#EFEFEF',
  text: '#1A1A1A',
  textSecondary: '#999999',
  textTertiary: '#CCCCCC',
  income: '#00B578',
  expense: '#1A1A1A',
  danger: '#FA5151',
  white: '#FFFFFF',
} as const;

/** 折线 / 占比图调色板 */
export const CHART_PALETTE = [
  '#00B578',
  '#4A90E2',
  '#F5A623',
  '#F76B6B',
  '#9B59B6',
  '#26C6DA',
  '#FF8A65',
  '#7E57C2',
  '#90A4AE',
] as const;

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  round: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
} as const;

export const space = (n: number): number => n * 4;

export const TABBAR_HEIGHT = 58;
