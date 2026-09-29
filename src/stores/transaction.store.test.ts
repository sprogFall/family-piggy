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

jest.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ session: { user: { id: 'u1' } } }) },
}));

import { transactionService } from '@/services/transaction.service';
import type { Transaction } from '@/types/domain';

import {
  selectMonthTransactions,
  selectTransactionById,
  selectYearTransactions,
  useTransactionStore,
} from './transaction.store';

const txMock = transactionService as jest.Mocked<typeof transactionService>;

const tx = (id: string, day: number, overrides: Partial<Transaction> = {}): Transaction => ({
  id,
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100,
  currency: 'CNY',
  tagIds: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: new Date(2024, 4, day, 10, 0).toISOString(),
  createdBy: 'u1',
  ...overrides,
});

const MAY = { year: 2024, month: 5 };

describe('useTransactionStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionStore.setState({ buckets: {} });
  });

  it('loadMonth 拉取并写入桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    const state = useTransactionStore.getState();
    expect(state.buckets['l1::2024-05']).toEqual({
      status: 'ready',
      transactions: [tx('t1', 20)],
    });
  });

  it('loadMonth 失败置 error 桶', async () => {
    txMock.listMonth.mockRejectedValue(new Error('offline'));
    await useTransactionStore.getState().loadMonth('l1', MAY);
    expect(useTransactionStore.getState().buckets['l1::2024-05'].status).toBe('error');
  });

  it('add 写入服务并同步到桶内', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    txMock.create.mockResolvedValue(tx('t2', 21, { amount: 500 }));
    await useTransactionStore.getState().loadMonth('l1', MAY);
    const created = await useTransactionStore.getState().add({
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 500,
      currency: 'USD',
      tagIds: [],
      note: '',
      attributes: { reimbursement: false },
      images: [],
      occurredAt: new Date(2024, 4, 21, 10, 0).toISOString(),
    });
    expect(created.id).toBe('t2');
    const list = selectMonthTransactions(useTransactionStore.getState(), 'l1', MAY);
    expect(list.map((t) => t.id)).toEqual(['t2', 't1']);
  });

  it('remove 同步移除桶内数据', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    txMock.remove.mockResolvedValue(undefined);
    await useTransactionStore.getState().remove('t1', 'l1');
    expect(selectMonthTransactions(useTransactionStore.getState(), 'l1', MAY)).toEqual([]);
  });

  it('upsertLocal 只插入时间匹配的月份桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    useTransactionStore.getState().upsertLocal('l1', tx('t9', 15));
    expect(selectMonthTransactions(useTransactionStore.getState(), 'l1', MAY).map((t) => t.id)).toEqual([
      't1',
      't9',
    ]);
  });

  it('upsertLocal 不插入其他月份桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    useTransactionStore.getState().upsertLocal('l1', tx('t9', 1, { occurredAt: new Date(2024, 5, 1, 8).toISOString() }));
    expect(selectMonthTransactions(useTransactionStore.getState(), 'l1', MAY).map((t) => t.id)).toEqual(['t1']);
  });

  it('update 修改后重拉该账本所有已加载月份', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    txMock.update.mockResolvedValue(undefined);
    await useTransactionStore.getState().update('t1', 'l1', { amount: 999 });
    expect(txMock.update).toHaveBeenCalledWith('t1', { amount: 999 });
    expect(txMock.listMonth).toHaveBeenCalledTimes(2);
  });

  it('subscribe 委托 realtime 服务', () => {
    const { subscribeTransactions } = jest.requireMock('@/services/transaction.service') as {
      subscribeTransactions: jest.Mock;
    };
    const cleanup = useTransactionStore.getState().subscribe('l1');
    expect(subscribeTransactions).toHaveBeenCalledWith('l1', expect.anything());
    expect(typeof cleanup).toBe('function');
  });

  it('reset 清空桶', () => {
    useTransactionStore.setState({ buckets: { 'l1::2024-05': { status: 'ready', transactions: [] } } });
    useTransactionStore.getState().reset();
    expect(useTransactionStore.getState().buckets).toEqual({});
  });

  it('selectTransactionById 跨桶查找，未找到/无 id 返回 undefined', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);

    expect(selectTransactionById(useTransactionStore.getState(), 't1')?.id).toBe('t1');
    expect(selectTransactionById(useTransactionStore.getState(), 'missing')).toBeUndefined();
    expect(selectTransactionById(useTransactionStore.getState(), null)).toBeUndefined();
  });

  it('selectMonthTransactions 未加载/无账本时返回稳定引用（zustand v5 快照稳定性）', () => {
    const state = useTransactionStore.getState();
    expect(selectMonthTransactions(state, 'l1', MAY)).toBe(
      selectMonthTransactions(state, 'l1', MAY),
    );
    expect(selectMonthTransactions(state, null, MAY)).toBe(
      selectMonthTransactions(state, undefined, MAY),
    );
  });
});

describe('年份统计', () => {
  it('loadYear 拉取整年范围并写入年桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadYear('l1', 2024);
    expect(txMock.listMonth).toHaveBeenCalledWith(
      'l1',
      new Date(2024, 0, 1, 0, 0, 0, 0).toISOString(),
      new Date(2025, 0, 1, 0, 0, 0, 0).toISOString(),
    );
    expect(selectYearTransactions(useTransactionStore.getState(), 'l1', 2024).map((t) => t.id)).toEqual([
      't1',
    ]);
  });
});
