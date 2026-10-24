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
import { dismissDialog, getDialogRequest } from '@/lib/alert';
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
    dismissDialog();
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

  it('每日分组标题在金额合计旁展示当天笔数', () => {
    useTransactionStore.setState({
      buckets: {
        [BUCKET_KEY]: {
          status: 'ready',
          transactions: [
            transaction({ id: 't1', amount: 1000 }),
            transaction({ id: 't2', amount: 230 }),
          ],
        },
      },
      periodBuckets: {},
    });

    renderScreen();

    expect(screen.getByText('2笔')).toBeTruthy();
    expect(screen.getByText('支 ¥12.30')).toBeTruthy();
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

  it('已报销的支出不计入总消费，并在金额上加删除线', () => {
    useTransactionStore.setState({
      buckets: {
        [BUCKET_KEY]: {
          status: 'ready',
          transactions: [
            transaction({ id: 't1', amount: 1230 }),
            transaction({
              id: 't2',
              amount: 5000,
              attributes: { reimbursement: true, reimbursed: true },
            }),
          ],
        },
      },
      periodBuckets: {},
    });

    renderScreen();

    // 支出合计只含未报销的 12.30（列表行里也有同样的金额，故取全部再断言）
    expect(screen.getAllByText('¥12.30')).toHaveLength(2);
    // 已报销的 5.00 仍展示但加删除线
    expect(screen.getByText('¥50.00')).toBeTruthy();
    expect(screen.getByText('已报销 ¥50.00 未计入支出与结余')).toBeTruthy();
    // 两笔都计入当天笔数
    expect(screen.getByText('2笔')).toBeTruthy();
  });

  it('可报销账单提供右滑报销入口，确认后写回已报销', async () => {
    useTransactionStore.setState({
      buckets: {
        [BUCKET_KEY]: {
          status: 'ready',
          transactions: [
            transaction({ id: 't1', amount: 1230, attributes: { reimbursement: true } }),
          ],
        },
      },
      periodBuckets: {},
    });
    txMock.update.mockResolvedValue(undefined);

    renderScreen();
    fireEvent.press(screen.getByLabelText('报销'));

    await waitFor(() =>
      expect(txMock.update).toHaveBeenCalledWith('t1', {
        attributes: { reimbursement: true, reimbursed: true },
      }),
    );
  });

  it('报销失败时提示错误且不改动本地金额', async () => {
    useTransactionStore.setState({
      buckets: {
        [BUCKET_KEY]: {
          status: 'ready',
          transactions: [
            transaction({ id: 't1', amount: 1230, attributes: { reimbursement: true } }),
          ],
        },
      },
      periodBuckets: {},
    });
    txMock.update.mockRejectedValue(new Error('修改账单失败'));

    renderScreen();
    fireEvent.press(screen.getByLabelText('报销'));

    await waitFor(() => expect(getDialogRequest()?.title).toBe('报销失败'));
    expect(useTransactionStore.getState().buckets[BUCKET_KEY].transactions[0].attributes).toEqual({
      reimbursement: true,
    });
  });
});
