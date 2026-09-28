import { render, screen } from '@testing-library/react-native';

import type { Transaction } from '@/types/domain';

import { TransactionRow } from './TransactionRow';

const tx: Transaction = {
  id: 't1',
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 236800,
  note: '和朋友聚餐',
  occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
  createdBy: 'u1',
};

describe('TransactionRow', () => {
  it('渲染分类名、备注与支出金额', () => {
    render(<TransactionRow transaction={tx} categoryName="餐饮" iconKey="restaurant" />);
    expect(screen.getByText('餐饮')).toBeTruthy();
    expect(screen.getByText('和朋友聚餐')).toBeTruthy();
    expect(screen.getByText('2,368.00')).toBeTruthy();
  });

  it('收入金额带 + 号且不展示备注', () => {
    render(
      <TransactionRow
        transaction={{ ...tx, kind: 'income', amount: 380000, note: null }}
        categoryName="工资"
        iconKey="cash"
        showTime
      />,
    );
    expect(screen.getByText('+3,800.00')).toBeTruthy();
    expect(screen.getByText('14:30')).toBeTruthy();
  });

  it('家庭账本在时间后追加记录人标注', () => {
    render(
      <TransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        showTime
        createdByName="我"
      />,
    );
    expect(screen.getByText('14:30 · 我')).toBeTruthy();
  });

  it('他人记录展示成员昵称', () => {
    render(
      <TransactionRow
        transaction={{ ...tx, createdBy: 'u2' }}
        categoryName="餐饮"
        iconKey="restaurant"
        showTime
        createdByName="李四"
      />,
    );
    expect(screen.getByText('14:30 · 李四')).toBeTruthy();
  });

  it('个人账本（未传记录人）不展示标注', () => {
    render(<TransactionRow transaction={tx} categoryName="餐饮" iconKey="restaurant" showTime />);
    expect(screen.getByText('14:30')).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
