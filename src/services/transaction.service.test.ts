import { supabase } from '@/lib/supabase';
import { createQueryChain, createRealtimeChannel, queryError } from '@/test/supabase-mock';

import { subscribeTransactions, transactionService } from './transaction.service';

const fromMock = supabase.from as unknown as jest.Mock;
const channelMock = supabase.channel as unknown as jest.Mock;
const removeChannelMock = supabase.removeChannel as unknown as jest.Mock;

const row = {
  id: 't1',
  ledger_id: 'l1',
  category_id: 'c1',
  kind: 'expense',
  amount: '1230',
  note: '午饭',
  occurred_at: '2024-05-20T04:00:00.000Z',
  created_by: 'u1',
};

describe('transactionService', () => {
  afterEach(() => {
    fromMock.mockReset();
    channelMock.mockReset();
    removeChannelMock.mockReset();
  });

  it('listMonth 使用 [start, end) 范围查询并映射 bigint 金额', async () => {
    const chain = createQueryChain({ data: [row], error: null });
    fromMock.mockReturnValue(chain);
    const txs = await transactionService.listMonth('l1', '2024-05-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z');
    expect(chain.eq).toHaveBeenCalledWith('ledger_id', 'l1');
    expect(chain.gte).toHaveBeenCalledWith('occurred_at', '2024-05-01T00:00:00.000Z');
    expect(chain.lt).toHaveBeenCalledWith('occurred_at', '2024-06-01T00:00:00.000Z');
    expect(txs[0].amount).toBe(1230);
  });

  it('create 携带创建人', async () => {
    const chain = createQueryChain({ data: row, error: null });
    fromMock.mockReturnValue(chain);
    await transactionService.create(
      {
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'expense',
        amount: 1230,
        note: '午饭',
        occurredAt: '2024-05-20T04:00:00.000Z',
      },
      'u1',
    );
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ created_by: 'u1', amount: 1230 }),
    );
  });

  it('update 只映射传入字段', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await transactionService.update('t1', { amount: 100, note: null });
    expect(chain.update).toHaveBeenCalledWith({ amount: 100, note: null });
  });

  it('失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(transactionService.remove('t1')).rejects.toThrow('删除账单失败');
  });
});

describe('subscribeTransactions', () => {
  it('订阅带 ledger 过滤的实时通道并返回取消函数', () => {
    const channel = createRealtimeChannel();
    channelMock.mockReturnValue(channel);

    const onUpsert = jest.fn();
    const cleanup = subscribeTransactions('l1', { onUpsert });

    expect(channelMock).toHaveBeenCalledWith('transactions-l1');
    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ filter: 'ledger_id=eq.l1', table: 'transactions' }),
      expect.any(Function),
    );
    expect(channel.subscribe).toHaveBeenCalled();

    const handler = channel.on.mock.calls[0][2];
    handler({
      eventType: 'INSERT',
      new: row,
    });
    expect(onUpsert).toHaveBeenCalledWith(expect.objectContaining({ id: 't1', amount: 1230 }));

    expect(typeof cleanup).toBe('function');
    cleanup();
    expect(removeChannelMock).toHaveBeenCalledWith(channel);
  });
});
