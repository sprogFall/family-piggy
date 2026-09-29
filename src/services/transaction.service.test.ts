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
  currency: 'USD',
  tag_id: 'g1',
  note: '出差',
  attributes: { reimbursement: true },
  images: ['https://cdn/img.jpg'],
  occurred_at: '2024-05-20T04:00:00.000Z',
  created_by: 'u1',
};

describe('transactionService', () => {
  afterEach(() => {
    fromMock.mockReset();
    channelMock.mockReset();
    // removeChannel 的实现来自 jest.setup 的全局 mock，mockReset 会把它抹掉，故只清调用记录
    removeChannelMock.mockClear();
  });

  it('listMonth 使用 [start, end) 范围查询并映射 bigint 金额', async () => {
    const chain = createQueryChain({ data: [row], error: null });
    fromMock.mockReturnValue(chain);
    const txs = await transactionService.listMonth('l1', '2024-05-01T00:00:00.000Z', '2024-06-01T00:00:00.000Z');
    expect(chain.eq).toHaveBeenCalledWith('ledger_id', 'l1');
    expect(chain.gte).toHaveBeenCalledWith('occurred_at', '2024-05-01T00:00:00.000Z');
    expect(chain.lt).toHaveBeenCalledWith('occurred_at', '2024-06-01T00:00:00.000Z');
    expect(txs[0].amount).toBe(1230);
    expect(txs[0].currency).toBe('USD');
    expect(txs[0].note).toBe('出差');
    expect(txs[0].attributes.reimbursement).toBe(true);
    expect(txs[0].images).toEqual(['https://cdn/img.jpg']);
  });

  it('库中币种缺失或非法时回落 CNY', async () => {
    const chain = createQueryChain({ data: [{ ...row, currency: null }], error: null });
    fromMock.mockReturnValue(chain);
    const txs = await transactionService.listMonth(
      'l1',
      '2024-05-01T00:00:00.000Z',
      '2024-06-01T00:00:00.000Z',
    );
    expect(txs[0].currency).toBe('CNY');
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
        currency: 'JPY',
        tagId: 'g1',
        note: '出差',
        attributes: { reimbursement: true },
        images: ['https://cdn/img.jpg'],
        occurredAt: '2024-05-20T04:00:00.000Z',
      },
      'u1',
    );
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: 'u1',
        amount: 1230,
        currency: 'JPY',
        note: '出差',
        attributes: { reimbursement: true },
        images: ['https://cdn/img.jpg'],
      }),
    );
  });

  it('update 只映射传入字段', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await transactionService.update('t1', {
      amount: 100,
      tagId: null,
      currency: 'EUR',
      note: '改成可报销',
      attributes: { reimbursement: true },
      images: ['https://cdn/img.jpg'],
    });
    expect(chain.update).toHaveBeenCalledWith({
      amount: 100,
      tag_id: null,
      currency: 'EUR',
      note: '改成可报销',
      attributes: { reimbursement: true },
      images: ['https://cdn/img.jpg'],
    });
  });

  it('失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(transactionService.remove('t1')).rejects.toThrow('删除账单失败');
  });
});

describe('subscribeTransactions', () => {
  afterEach(() => {
    channelMock.mockReset();
    removeChannelMock.mockClear();
  });

  it('订阅带 ledger 过滤的实时通道并返回取消函数', () => {
    const channel = createRealtimeChannel();
    channelMock.mockReturnValue(channel);

    const onUpsert = jest.fn();
    const cleanup = subscribeTransactions('l1', { onUpsert });

    expect(channelMock).toHaveBeenCalledWith(expect.stringMatching(/^transactions-l1-/));
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

  it('同一账本重复订阅使用不同 topic，避免命中未移除的已 subscribe 通道', () => {
    // 复刻 supabase-js RealtimeClient.channel 行为：按 topic 复用已有 channel，
    // 且 join 之后再 on 会同步抛错（正是切 Tab 闪退的根因）
    const registry = new Map<string, Record<string, unknown>>();
    channelMock.mockImplementation((topic: string) => {
      const existing = registry.get(topic);
      if (existing) return existing;
      const channel: Record<string, unknown> = {};
      let joined = false;
      channel.on = jest.fn(() => {
        if (joined) {
          throw new Error(
            `cannot add \`postgres_changes\` callbacks for realtime:${topic} after \`subscribe()\`.`,
          );
        }
        return channel;
      });
      channel.subscribe = jest.fn(() => {
        joined = true;
        return { unsubscribe: jest.fn() };
      });
      registry.set(topic, channel);
      return channel;
    });

    subscribeTransactions('l1', { onUpsert: jest.fn() });
    // 上一次订阅的 removeChannel 尚未完成（异步）时再次订阅
    expect(() => subscribeTransactions('l1', { onUpsert: jest.fn() })).not.toThrow();

    const topics = channelMock.mock.calls.map((call) => call[0]);
    expect(topics).toHaveLength(2);
    expect(topics[0]).not.toBe(topics[1]);
  });
});
