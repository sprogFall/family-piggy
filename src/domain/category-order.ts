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
