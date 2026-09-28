/**
 * 流水记录人标注的纯规则：家庭账本中区分「谁记的」。
 * 展示名只在家庭账本使用，个人账本由调用方直接跳过（返回 null）。
 */

/** 本人记录时的展示名 */
export const SELF_LABEL = '我';

/**
 * 计算记录人展示名：
 * - 本人记的 → 「我」（无需昵称）
 * - 他人记的 → 成员昵称
 * - 昵称缺失（成员资料未加载 / 已退出家庭）→ null，由调用方决定是否隐藏
 */
export const creatorLabel = (
  createdBy: string,
  viewerId: string | null | undefined,
  nickname: string | null | undefined,
): string | null => {
  if (!createdBy) return null;
  if (viewerId && createdBy === viewerId) return SELF_LABEL;
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : null;
};
