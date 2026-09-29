/** 账单图片：仅作为 UI / 上传层草稿，数据库最终只保存最多 3 个公开 URL。 */

export const MAX_TRANSACTION_IMAGES = 3;

export interface TransactionImageDraft {
  id: string;
  uri: string;
  /** true 表示 editing 时已保存到 Storage 的远程图片，false 表示本次待上传的本地图片 */
  remote: boolean;
  mimeType?: string | null;
}

/** 根据当前已选张数计算还能添加几张 */
export const availableTransactionImageSlots = (currentCount: number): number => {
  if (currentCount <= 0) return MAX_TRANSACTION_IMAGES;
  return Math.max(0, MAX_TRANSACTION_IMAGES - currentCount);
};

/** 是否还能添加图片 */
export const canAddTransactionImage = (currentCount: number): boolean =>
  availableTransactionImageSlots(currentCount) > 0;

/** 把 editing 的远程 URL 列表转成可编辑草稿（id 仅用于列表 key） */
export const transactionImageDraftsOf = (urls: string[]): TransactionImageDraft[] =>
  urls.slice(0, MAX_TRANSACTION_IMAGES).map((uri, index) => ({
    id: `remote-${index}`,
    uri,
    remote: true,
  }));
