import {
  MAX_TRANSACTION_IMAGES,
  availableTransactionImageSlots,
  canAddTransactionImage,
  transactionImageDraftsOf,
} from './transaction-images';

describe('transaction-images', () => {
  it('每笔最多 3 张', () => {
    expect(MAX_TRANSACTION_IMAGES).toBe(3);
    expect(availableTransactionImageSlots(0)).toBe(3);
    expect(availableTransactionImageSlots(2)).toBe(1);
    expect(availableTransactionImageSlots(3)).toBe(0);
    expect(availableTransactionImageSlots(9)).toBe(0);
    expect(canAddTransactionImage(2)).toBe(true);
    expect(canAddTransactionImage(3)).toBe(false);
  });

  it('远程图片草稿按顺序生成稳定 id 并截断到上限', () => {
    expect(transactionImageDraftsOf(['a', 'b', 'c', 'd'])).toEqual([
      { id: 'remote-0', uri: 'a', remote: true },
      { id: 'remote-1', uri: 'b', remote: true },
      { id: 'remote-2', uri: 'c', remote: true },
    ]);
  });
});
