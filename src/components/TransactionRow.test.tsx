import { render, screen } from '@testing-library/react-native';

import type { Transaction } from '@/types/domain';

import { TransactionRow } from './TransactionRow';

const tx: Transaction = {
  id: 't1',
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 236800,
  currency: 'CNY',
  tagIds: ['g1'],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date(2024, 4, 20, 14, 30).toISOString(),
  createdBy: 'u1',
};

describe('TransactionRow', () => {
  it('渲染分类名与标签', () => {
    render(
      <TransactionRow transaction={tx} categoryName="餐饮" iconKey="restaurant" tagNames={['和朋友聚餐']} />,
    );
    expect(screen.getByText('餐饮')).toBeTruthy();
    expect(screen.getByText('#和朋友聚餐')).toBeTruthy();
    expect(screen.getByText('¥2,368.00')).toBeTruthy();
  });

  it('未打标签时不展示标签文案', () => {
    render(<TransactionRow transaction={{ ...tx, tagIds: [] }} categoryName="餐饮" iconKey="restaurant" />);
    expect(screen.getByText('餐饮')).toBeTruthy();
    expect(screen.queryByText(/^#/)).toBeNull();
  });

  it('收入金额带 + 号，展示时间与标签', () => {
    render(
      <TransactionRow
        transaction={{ ...tx, kind: 'income', amount: 380000, tagIds: ['g2'] }}
        categoryName="工资"
        iconKey="cash"
        tagNames={['月薪']}
        showTime
      />,
    );
    expect(screen.getByText('+¥3,800.00')).toBeTruthy();
    expect(screen.getByText('14:30 · #月薪')).toBeTruthy();
  });

  it('多个标签按顺序拼在副标题中', () => {
    render(
      <TransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        tagNames={['午餐', '晚餐']}
        showTime
      />,
    );
    expect(screen.getByText('14:30 · #午餐 #晚餐')).toBeTruthy();
  });

  it('金额按流水自身币种展示符号', () => {
    render(
      <TransactionRow
        transaction={{ ...tx, currency: 'USD', amount: 1200 }}
        categoryName="餐饮"
        iconKey="restaurant"
      />,
    );
    expect(screen.getByText('$12.00')).toBeTruthy();
  });

  it('家庭账本在时间与标签后追加记录人标注', () => {
    render(
      <TransactionRow
        transaction={tx}
        categoryName="餐饮"
        iconKey="restaurant"
        tagNames={['聚餐']}
        showTime
        createdByName="我"
      />,
    );
    expect(screen.getByText('14:30 · #聚餐 · 我')).toBeTruthy();
  });

  it('备注、报销类型与图片和标签分开展示', () => {
    render(
      <TransactionRow
        transaction={{
          ...tx,
          note: '和客户吃饭',
          attributes: { reimbursement: true },
          images: ['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg'],
        }}
        categoryName="餐饮"
        iconKey="restaurant"
        tagNames={['聚餐']}
        showTime
      />,
    );
    expect(screen.getByText('14:30 · #聚餐 · 和客户吃饭 · 可报销')).toBeTruthy();
    expect(screen.getByLabelText('账单图片 1')).toBeTruthy();
    expect(screen.getByLabelText('账单图片 2')).toBeTruthy();
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
