/**
 * 流水记录人展示名的纯规则：家庭账本中区分「谁记的」。
 * 展示名优先取成员昵称；取不到时返回 null，由调用方决定是否隐藏。
 */

/**
 * 计算记录人展示名：
 * - 有昵称 → 昵称
 * - 昵称缺失（成员资料未加载 / 已退出家庭）→ null
 * - createdBy 为空 → null
 */
export const creatorLabel = (
  createdBy: string,
  nickname: string | null | undefined,
): string | null => {
  if (!createdBy) return null;
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : null;
};
