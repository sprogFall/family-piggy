import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Transaction } from '@/types/domain';

import { SwipeableTransactionRow } from './SwipeableTransactionRow';

const tx: Transaction = {
  id: 't1',
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 236800,
  currency: 'CNY',
  tagId: 'g1',
  note: '和客户吃饭',
  attributes: { reimbursement: true },
  images: [],
  occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
  createdBy: 'u1',
};

describe('SwipeableTransactionRow', () => {
  it('点击整行打开预览回调', () => {
    const onPress = jest.fn();
    render(
      <SwipeableTransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        onPress={onPress}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('餐饮'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('左滑操作区的编辑 / 删除可回调', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(
      <SwipeableTransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );

    fireEvent.press(screen.getByLabelText('编辑'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('删除'));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
