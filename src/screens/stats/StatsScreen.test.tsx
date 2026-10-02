jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useFocusEffect: jest.fn() };
});

jest.mock('@/hooks/useActiveLedgerData', () => ({
  useActiveLedger: () => ({
    id: 'l1',
    name: '家庭账本',
    type: 'family',
    ownerId: 'u1',
    familyId: 'f1',
    monthlyBudget: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
  }),
  useCategoryOf: () =>
    (id: string) =>
      id === 'c2'
        ? { id: 'c2', ledgerId: 'l1', name: '工资', icon: 'wallet', kind: 'income', sortOrder: 2 }
        : { id: 'c1', ledgerId: 'l1', name: '餐饮', icon: 'restaurant', kind: 'expense', sortOrder: 1 },
  useActiveFamilyMembers: () => [
    {
      familyId: 'f1',
      userId: 'u2',
      role: 'member',
      nickname: '小明',
      avatarUrl: null,
      joinedAt: '2024-01-01T00:00:00.000Z',
    },
  ],
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { periodFromPreset } from '@/domain/period';
import { useTransactionStore } from '@/stores/transaction.store';
import type { Transaction } from '@/types/domain';

import { StatsScreen } from './StatsScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { navigate: jest.fn() };
const route = {} as never;

const transaction = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 500,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date().toISOString(),
  createdBy: 'u1',
  ...partial,
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <StatsScreen navigation={navigation as never} route={route} />
    </SafeAreaProvider>,
  );

describe('StatsScreen', () => {
  beforeEach(() => {
    navigation.navigate.mockClear();
    const period = periodFromPreset('thisMonth');
    useTransactionStore.setState({
      buckets: {},
      periodBuckets: {
        [`l1::period::${period.key}`]: {
          status: 'ready',
          transactions: [
            transaction({ id: 't1', amount: 500, categoryId: 'c1', createdBy: 'u1' }),
            transaction({
              id: 't2',
              amount: 1000,
              categoryId: 'c2',
              kind: 'income',
              createdBy: 'u2',
            }),
          ],
          start: period.start,
          end: period.end,
        },
      },
    });
  });

  it('默认展示本月统计、趋势、分布与排行', () => {
    renderScreen();

    expect(screen.getByText('统计')).toBeTruthy();
    expect(screen.getByLabelText('选择统计时间周期')).toBeTruthy();
    expect(screen.getByText('本月收支')).toBeTruthy();
    expect(screen.getByText('收支趋势')).toBeTruthy();
    expect(screen.getByText('收支分类分布')).toBeTruthy();
    expect(screen.getByText('支出排行（金额倒序）')).toBeTruthy();
    expect(screen.getByText('共 1 笔')).toBeTruthy();
  });

  it('家庭账本可按成员筛选并立即过滤', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('按成员筛选'));
    expect(screen.getAllByText('全部成员').length).toBeGreaterThan(0);
    expect(screen.getAllByText('小明').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('小明'));
    expect(screen.getByText('小明')).toBeTruthy();
  });

  it('时间周期支持快捷选择并回填到筛选按钮', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('选择统计时间周期'));
    expect(screen.getByText('时间周期')).toBeTruthy();

    fireEvent.press(screen.getByText('今年'));
    fireEvent.press(screen.getByRole('button', { name: '确定时间周期' }));

    expect(screen.getByText('今年')).toBeTruthy();
  });

  it('点击排行项进入账单详情', () => {
    renderScreen();

    fireEvent.press(screen.getByLabelText('查看第 1 名账单详情'));

    expect(navigation.navigate).toHaveBeenCalledWith('TransactionPreview', { transactionId: 't1' });
  });

  it('点击分类分布项带当前周期 / 成员条件进入分类明细', () => {
    renderScreen();
    const period = periodFromPreset('thisMonth');

    fireEvent.press(screen.getByLabelText('查看餐饮分类明细'));

    expect(navigation.navigate).toHaveBeenCalledWith('CategoryTransactions', {
      categoryId: 'c1',
      categoryName: '餐饮',
      periodKey: period.key,
      periodLabel: '本月',
      start: period.start,
      end: period.end,
      currency: 'CNY',
      memberId: null,
    });
  });
});
