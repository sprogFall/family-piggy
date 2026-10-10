/**
 * 启动快照的纯函数部分。
 *
 * 快照落盘前必须裁剪，否则本地存储会随使用时长无限增长；裁剪规则与存储无关，
 * 因此放在 domain 层，由 store 调用。
 */

/** 月份桶 key 形如 `<ledgerId>::<YYYY-MM>`，取出月份部分用于比较新旧 */
const monthOfBucketKey = (key: string): string => key.split('::')[1] ?? '';

/**
 * 每个账本只保留最近 `limit` 个月份的桶：`YYYY-MM` 可直接按字典序比较。
 *
 * 刻意按账本分组裁剪（而不是全局取前 N 个），否则账本多时先出现的账本会把其他账本的
 * 缓存全部挤掉，切账本时又要重新等网络。
 */
export const recentMonthBuckets = <T>(
  buckets: Record<string, T>,
  limit: number,
): Record<string, T> => {
  if (limit <= 0) return {};
  const keysByLedger = new Map<string, string[]>();
  for (const key of Object.keys(buckets)) {
    const ledgerId = key.split('::')[0];
    keysByLedger.set(ledgerId, [...(keysByLedger.get(ledgerId) ?? []), key]);
  }
  const kept: Record<string, T> = {};
  for (const keys of keysByLedger.values()) {
    const recent = [...keys]
      .sort((a, b) => monthOfBucketKey(b).localeCompare(monthOfBucketKey(a)))
      .slice(0, limit);
    for (const key of recent) kept[key] = buckets[key];
  }
  return kept;
};
