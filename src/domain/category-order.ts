/** 分类拖拽排序的纯函数：将 from 位置的元素移动到 to 位置。 */
export const moveItem = <T>(items: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || from >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item === undefined) return next;
  const target = Math.max(0, Math.min(to, next.length));
  next.splice(target, 0, item);
  return next;
};

/** 把草稿顺序归一化为服务端实际存在的分类 ID 顺序：删除的忽略，新增的排到末尾。 */
export const mergeCategoryOrder = (serverIds: string[], draftIds: string[]): string[] => {
  const serverSet = new Set(serverIds);
  const draftSet = new Set(draftIds);
  return [
    ...draftIds.filter((id) => serverSet.has(id)),
    ...serverIds.filter((id) => !draftSet.has(id)),
  ];
};

/** 两个 ID 顺序是否完全一致 */
export const isSameCategoryOrder = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);
