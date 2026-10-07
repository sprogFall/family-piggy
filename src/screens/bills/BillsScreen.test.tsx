jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useFocusEffect: jest.fn() };
});

jest.mock('@/services/transaction.service', () => ({
  transactionService: {
    listMonth: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  subscribeTransactions: jest.fn(() => jest.fn()),
}));

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
  ],
  useActiveFamilyMembers: () => [],
  useCreatorLabel: () => () => null,
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { currentMonth, monthKey } from '@/domain/dates';
import { transactionService } from '@/services/transaction.service';
import { useTransactionStore } from '@/stores/transaction.store';
import type { Transaction } from '@/types/domain';

import { BillsScreen } from './BillsScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { navigate: jest.fn() };
const MONTH = currentMonth();
const BUCKET_KEY = `l1::${monthKey(MONTH)}`;

const txMock = transactionService as jest.Mocked<typeof transactionService>;

const transaction = (partial: Partial<Transaction> & { id: string }): Transaction => ({
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 1230,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date(MONTH.year, MONTH.month - 1, 20, 10, 0).toISOString(),
  createdBy: 'u1',
  ...partial,
});

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <BillsScreen navigation={navigation as never} route={{} as never} />
    </SafeAreaProvider>,
  );

describe('BillsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({ buckets: {}, periodBuckets: {} });
  });

  it('加载失败且无缓存时展示失败兜底与重试，而不是「本月暂无账单」', () => {
    useTransactionStore.setState({
      buckets: { [BUCKET_KEY]: { status: 'error', transactions: [] } },
      periodBuckets: {},
    });

    renderScreen();

    expect(screen.getByText('账单加载失败，请检查网络后重试')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).toBeTruthy();
    expect(screen.queryByText('本月暂无账单，点击下方 + 记一笔')).toBeNull();
  });

  it('刷新失败但仍有缓存时保留账单列表并提示重试', () => {
    useTransactionStore.setState({
      buckets: {
        [BUCKET_KEY]: {
          status: 'error',
          transactions: [transaction({ id: 't1' })],
        },
      },
      periodBuckets: {},
    });

    renderScreen();

    expect(screen.getByText('刷新失败，当前展示的是本地缓存')).toBeTruthy();
    expect(screen.getByText('餐饮')).toBeTruthy();
  });

  it('点击重试会重新拉取并恢复正常列表', async () => {
    useTransactionStore.setState({
      buckets: { [BUCKET_KEY]: { status: 'error', transactions: [] } },
      periodBuckets: {},
    });
    txMock.listMonth.mockResolvedValue([transaction({ id: 't1' })]);

    renderScreen();
    fireEvent.press(screen.getByRole('button', { name: '重试' }));

    await waitFor(() => expect(screen.getByText('餐饮')).toBeTruthy());
    expect(txMock.listMonth).toHaveBeenCalledWith('l1', expect.any(String), expect.any(String));
    expect(useTransactionStore.getState().buckets[BUCKET_KEY].status).toBe('ready');
  });
});
