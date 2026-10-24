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
  tagNames: ['午餐'],
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

  it('可报销流水展示右滑报销操作并按目标状态回调', () => {
    const onReimburse = jest.fn();
    render(
      <SwipeableTransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onReimburse={onReimburse}
      />,
    );

    // tx 当前未报销，操作区应提示「报销」
    fireEvent.press(screen.getByLabelText('报销'));
    expect(onReimburse).toHaveBeenCalledWith(true);
  });

  it('已报销流水展示取消报销并按目标状态回调', () => {
    const onReimburse = jest.fn();
    render(
      <SwipeableTransactionRow
        transaction={{ ...tx, attributes: { reimbursement: true, reimbursed: true } }}
        categoryName="餐饮"
        iconKey="restaurant"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onReimburse={onReimburse}
      />,
    );

    fireEvent.press(screen.getByLabelText('取消报销'));
    expect(onReimburse).toHaveBeenCalledWith(false);
  });

  it('不可报销时不展示右滑报销操作', () => {
    render(
      <SwipeableTransactionRow
        transaction={{ ...tx, attributes: { reimbursement: false } }}
        categoryName="餐饮"
        iconKey="restaurant"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onReimburse={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('报销')).toBeNull();
  });

  it('收入即使带报销标记也不展示右滑报销操作', () => {
    render(
      <SwipeableTransactionRow
        transaction={{ ...tx, kind: 'income', attributes: { reimbursement: true } }}
        categoryName="工资"
        iconKey="cash"
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onReimburse={jest.fn()}
      />,
    );

    expect(screen.queryByLabelText('报销')).toBeNull();
  });

  /**
 * 注：滑动手势的位移夹取与落点判定（报销阈值、左滑展开、从哪一侧开始）
 * 均由 domain/swipe-actions 的纯函数覆盖——jest 合成环境下 PanResponder 的
 * dx / vx 恒为 0，无法通过 fireEvent 造出真实位移，故不在此重复断言。
 */
});
