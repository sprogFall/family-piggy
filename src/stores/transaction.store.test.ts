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
  selectPeriodBucket,
  selectPeriodTransactions,
  selectTransactionById,
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
  tagNames: [],
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
    useTransactionStore.setState({ buckets: {}, periodBuckets: {} });
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

  it('loadMonth 失败保留旧快照，不清空列表', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);

    txMock.listMonth.mockRejectedValue(new Error('offline'));
    await useTransactionStore.getState().loadMonth('l1', MAY);

    const bucket = useTransactionStore.getState().buckets['l1::2024-05'];
    expect(bucket.status).toBe('error');
    expect(bucket.transactions.map((t) => t.id)).toEqual(['t1']);
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
      tagNames: [],
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

  it('update 重拉失败时保留旧数据与编辑中的流水（不清空列表）', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20), tx('t2', 21)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);

    // 保存成功，但随后的重拉失败（网络抖动 / 超时）
    txMock.update.mockResolvedValue(undefined);
    txMock.listMonth.mockRejectedValue(new Error('offline'));
    await useTransactionStore.getState().update('t1', 'l1', { amount: 999 });

    const bucket = useTransactionStore.getState().buckets['l1::2024-05'];
    expect(bucket.status).toBe('error');
    // 关键回归：编辑的流水不能被本地无条件删除，其余流水也不能丢
    expect(bucket.transactions.map((t) => t.id).sort()).toEqual(['t1', 't2']);
  });

  it('update 把流水改到别的月份后，重拉会从旧月移除并写入新月', async () => {
    const JUNE = { year: 2024, month: 6 };
    txMock.listMonth.mockImplementation(async (_ledgerId, start) => {
      const iso = new Date(start).toISOString();
      const juneStart = new Date(2024, 5, 1, 0, 0, 0, 0).toISOString();
      // 修改后 t1 移到 6 月：5 月桶查不到它，6 月桶能查到
      return iso === juneStart ? [tx('t1', 15, { occurredAt: new Date(2024, 5, 15, 10).toISOString() })] : [];
    });
    // 先让 5 月桶有 t1
    txMock.listMonth.mockResolvedValueOnce([tx('t1', 20)]);
    await useTransactionStore.getState().loadMonth('l1', MAY);
    await useTransactionStore.getState().loadMonth('l1', JUNE);

    txMock.update.mockResolvedValue(undefined);
    await useTransactionStore.getState().update('t1', 'l1', { occurredAt: new Date(2024, 5, 15, 10).toISOString() });

    expect(selectMonthTransactions(useTransactionStore.getState(), 'l1', MAY)).toEqual([]);
    expect(selectMonthTransactions(useTransactionStore.getState(), 'l1', JUNE).map((t) => t.id)).toEqual(['t1']);
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
    useTransactionStore.setState({
      buckets: { 'l1::2024-05': { status: 'ready', transactions: [] } },
      periodBuckets: {},
    });
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

describe('任意周期统计', () => {
  const START = new Date(2024, 4, 1, 0, 0, 0, 0).toISOString();
  const END = new Date(2024, 5, 1, 0, 0, 0, 0).toISOString();
  const PERIOD_KEY = `${START}_${END}`;

  it('loadPeriod 拉取任意区间并写入周期桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);

    expect(txMock.listMonth).toHaveBeenCalledWith('l1', START, END);
    expect(selectPeriodBucket(useTransactionStore.getState(), 'l1', PERIOD_KEY)).toEqual({
      status: 'ready',
      transactions: [tx('t1', 20)],
      start: START,
      end: END,
    });
  });

  it('loadPeriod 失败置 error 桶', async () => {
    txMock.listMonth.mockRejectedValue(new Error('offline'));
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);
    expect(selectPeriodBucket(useTransactionStore.getState(), 'l1', PERIOD_KEY)?.status).toBe(
      'error',
    );
  });

  it('loadPeriod 失败保留旧快照，不清空列表', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);

    txMock.listMonth.mockRejectedValue(new Error('offline'));
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);

    const bucket = selectPeriodBucket(useTransactionStore.getState(), 'l1', PERIOD_KEY);
    expect(bucket?.status).toBe('error');
    expect(selectPeriodTransactions(useTransactionStore.getState(), 'l1', PERIOD_KEY).map((t) => t.id)).toEqual(['t1']);
  });

  it('upsertLocal 只插入时间区间匹配的周期桶', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);

    useTransactionStore.getState().upsertLocal('l1', tx('t9', 15));
    expect(selectPeriodTransactions(useTransactionStore.getState(), 'l1', PERIOD_KEY).map((t) => t.id)).toEqual([
      't1',
      't9',
    ]);

    useTransactionStore.getState().upsertLocal(
      'l1',
      tx('t10', 15, { occurredAt: new Date(2024, 5, 15, 8).toISOString() }),
    );
    expect(selectPeriodTransactions(useTransactionStore.getState(), 'l1', PERIOD_KEY).map((t) => t.id)).toEqual([
      't1',
      't9',
    ]);
  });

  it('deleteLocal 同步移除周期桶数据，空态选择器引用稳定', async () => {
    txMock.listMonth.mockResolvedValue([tx('t1', 20)]);
    await useTransactionStore.getState().loadPeriod('l1', PERIOD_KEY, START, END);
    useTransactionStore.getState().deleteLocal('l1', 't1');

    expect(selectPeriodTransactions(useTransactionStore.getState(), 'l1', PERIOD_KEY)).toEqual([]);

    const state = useTransactionStore.getState();
    expect(selectPeriodTransactions(state, 'missing', PERIOD_KEY)).toBe(
      selectPeriodTransactions(state, 'missing', PERIOD_KEY),
    );
  });
});
