/**
 * 调色板：浅色 / 深色两套设计令牌。
 *
 * - 深色配色参考微信深色模式：页面底 `#111111`、卡片 `#1E1E1E`、正文 `#EDEDED`，
 *   不用纯黑纯白，长时间阅读的对比更柔和；品牌绿在深浅两套中保持一致。
 * - 两套配色由 `ThemeColors` 接口约束，令牌必须一一对应（`palette.test.ts` 额外校验）。
 * - `white` 专指「彩色底上的文字 / 图标」（绿色按钮、绿色卡片），深浅两套都保持纯白，
 *   不代表「卡片底色」——卡片底色一律用 `card`。
 */

export interface ThemeColors {
  /** 品牌主色（按钮、选中态、收入金额） */
  readonly primary: string;
  /** 主色加深：用于彩色底上的次级元素（如头像上的相机徽章） */
  readonly primaryDark: string;
  /** 主色浅底：选中态 / 图标底板 */
  readonly primaryLight: string;
  /** 主色禁用态（按钮不可点） */
  readonly primaryDisabled: string;
  /** 页面底色 */
  readonly bg: string;
  /** 卡片底色 */
  readonly card: string;
  /** 分隔线 */
  readonly border: string;
  /** 正文文字 */
  readonly text: string;
  /** 次要文字 */
  readonly textSecondary: string;
  /** 三级文字（占位符、弱提示） */
  readonly textTertiary: string;
  /** 收入金额 */
  readonly income: string;
  /** 支出金额 */
  readonly expense: string;
  /** 危险操作 / 删除 */
  readonly danger: string;
  /** 彩色底上的文字与图标（纯白，深浅一致） */
  readonly white: string;
  /** 浮窗（Toast）背景 */
  readonly toastBg: string;
  /** 按压态水波纹（Android），限定在控件内，避免溢出到相邻元素 */
  readonly ripple: string;
  /** 弹层遮罩 */
  readonly scrim: string;
  /** 信息类浅底（如「加入家庭」图标底板） */
  readonly infoLight: string;
}

/** 浅色（默认主题） */
export const LIGHT_COLORS: ThemeColors = {
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
  toastBg: 'rgba(26,26,26,0.86)',
  ripple: 'rgba(0, 181, 120, 0.12)',
  scrim: 'rgba(0,0,0,0.4)',
  infoLight: '#E8F1FD',
};

/** 深色（微信风格：深灰底 + 深灰卡片 + 微亮正文） */
export const DARK_COLORS: ThemeColors = {
  primary: '#00B578',
  primaryDark: '#00945F',
  primaryLight: '#123326',
  primaryDisabled: '#1F4A3A',
  bg: '#111111',
  card: '#1E1E1E',
  border: '#2C2C2C',
  text: '#EDEDED',
  textSecondary: '#9A9A9A',
  textTertiary: '#6B6B6B',
  income: '#2FD48F',
  expense: '#EDEDED',
  danger: '#FA5151',
  white: '#FFFFFF',
  toastBg: 'rgba(58,58,58,0.94)',
  ripple: 'rgba(0, 181, 120, 0.24)',
  scrim: 'rgba(0,0,0,0.65)',
  infoLight: '#16273D',
};
