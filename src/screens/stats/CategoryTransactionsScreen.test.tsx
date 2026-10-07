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
  useActiveCategories: () => [
    { id: 'c1', ledgerId: 'l1', name: '餐饮', icon: 'restaurant', kind: 'expense', sortOrder: 1 },
    { id: 'c2', ledgerId: 'l1', name: '交通', icon: 'car', kind: 'expense', sortOrder: 2 },
  ],
  useCreatorLabel: () => (createdBy: string) => (createdBy === 'u2' ? '小明' : null),
}));

import { fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTransactionStore } from '@/stores/transaction.store';
import type { Transaction } from '@/types/domain';

import { CategoryTransactionsScreen } from './CategoryTransactionsScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const START = new Date(2024, 4, 1, 0, 0, 0, 0).toISOString();
const END = new Date(2024, 5, 1, 0, 0, 0, 0).toISOString();
const PERIOD_KEY = `${START}_${END}`;

const transaction = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date(2024, 4, 20, 10, 0).toISOString(),
  createdBy: 'u1',
  ...partial,
});

const route = (memberId: string | null = null) =>
  ({
    key: 'CategoryTransactions-test',
    name: 'CategoryTransactions',
    params: {
      categoryId: 'c1',
      categoryName: '餐饮',
      periodKey: PERIOD_KEY,
      periodLabel: '2024年5月',
      start: START,
      end: END,
      currency: 'CNY',
      memberId,
    },
  }) as never;

const renderScreen = (memberId: string | null = null) =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <CategoryTransactionsScreen navigation={navigation as never} route={route(memberId)} />
    </SafeAreaProvider>,
  );

describe('CategoryTransactionsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({
      buckets: {},
      periodBuckets: {
        [`l1::period::${PERIOD_KEY}`]: {
          status: 'ready',
          start: START,
          end: END,
          transactions: [
            transaction({ id: 't1', occurredAt: new Date(2024, 4, 20, 10).toISOString() }),
            transaction({
              id: 't2',
              occurredAt: new Date(2024, 4, 21, 10).toISOString(),
              createdBy: 'u2',
              amount: 200,
            }),
            transaction({
              id: 't3',
              categoryId: 'c2',
              occurredAt: new Date(2024, 4, 22, 10).toISOString(),
              amount: 300,
            }),
            transaction({
              id: 't4',
              currency: 'USD',
              occurredAt: new Date(2024, 4, 23, 10).toISOString(),
              amount: 999,
            }),
          ],
        },
      },
    });
  });

  it('只展示当前周期、币种与分类下的明细，按日期倒序点击进入预览', () => {
    renderScreen();

    expect(screen.getByText('餐饮明细')).toBeTruthy();
    expect(screen.getAllByText('餐饮')).toHaveLength(2);
    expect(screen.queryByText('交通')).toBeNull();
    expect(screen.getByText('2 笔 · ¥3.00')).toBeTruthy();
    expect(screen.queryByLabelText('编辑')).toBeNull();
    expect(screen.queryByLabelText('删除')).toBeNull();

    fireEvent.press(screen.getAllByText('餐饮')[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('TransactionPreview', { transactionId: 't2' });
  });

  it('按成员筛选后只展示该成员记录，并显示记录人', () => {
    renderScreen('u2');

    expect(screen.getAllByText('餐饮')).toHaveLength(1);
    expect(screen.getByText('10:00 · 小明')).toBeTruthy();
    expect(screen.getByText('1 笔 · ¥2.00')).toBeTruthy();
  });

  it('周期桶加载失败且无缓存时展示失败兜底与重试，而不是「暂无明细」', () => {
    useTransactionStore.setState({
      buckets: {},
      periodBuckets: {
        [`l1::period::${PERIOD_KEY}`]: { status: 'error', start: START, end: END, transactions: [] },
      },
    });

    renderScreen();

    expect(screen.getByText('分类明细加载失败，请检查网络后重试')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    expect(screen.queryByText('当前统计条件下暂无该分类明细')).toBeNull();
  });

  it('刷新失败但仍有缓存时保留旧数据并提示重试', () => {
    useTransactionStore.setState({
      buckets: {},
      periodBuckets: {
        [`l1::period::${PERIOD_KEY}`]: {
          status: 'error',
          start: START,
          end: END,
          transactions: [
            transaction({ id: 't1', occurredAt: new Date(2024, 4, 20, 10).toISOString() }),
          ],
        },
      },
    });

    renderScreen();

    expect(screen.getByText('刷新失败，当前展示的是本地缓存')).toBeTruthy();
    expect(screen.getAllByText('餐饮').length).toBeGreaterThan(0);
  });
});
