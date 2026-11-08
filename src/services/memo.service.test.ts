import { supabase } from '@/lib/supabase';
import { createQueryChain, createRealtimeChannel, queryError } from '@/test/supabase-mock';
import { memoService, subscribeMemos } from './memo.service';

const from = supabase.from as unknown as jest.Mock;
const rpc = supabase.rpc as unknown as jest.Mock;
const row = { id: '1', family_id: null, owner_id: 'u1', content: '买菜', importance: 'high', is_completed: false, sort_order: null, created_at: 'a', updated_at: 'a' };

afterEach(() => jest.clearAllMocks());
it('maps personal items and filters owner and family', async () => {
  const chain = createQueryChain({ data: [row], error: null }); from.mockReturnValue(chain);
  expect(await memoService.list({ type: 'personal' }, 'u1')).toEqual([{ id: '1', scope: { type: 'personal' }, ownerId: 'u1', content: '买菜', importance: 'high', isCompleted: false, sortOrder: null, createdAt: 'a', updatedAt: 'a' }]);
  expect(chain.eq).toHaveBeenCalledWith('owner_id', 'u1');
  expect(chain.is).toHaveBeenCalledWith('family_id', null);
});
it('loads all pages in deterministic order', async () => {
  const first = createQueryChain({ data: Array.from({ length: 1000 }, (_, i) => ({ ...row, id: String(i) })), error: null });
  const second = createQueryChain({ data: [{ ...row, id: 'last' }], error: null });
  from.mockReturnValueOnce(first).mockReturnValueOnce(second);
  const result = await memoService.list({ type: 'personal' }, 'u1');
  expect(result).toHaveLength(1001);
  expect(first.order).toHaveBeenCalledWith('id', { ascending: true });
  expect(first.range).toHaveBeenCalledWith(0, 999);
  expect(second.range).toHaveBeenCalledWith(1000, 1999);
});
it('persists ordering atomically through RPC', async () => {
  rpc.mockResolvedValue({ error: null });
  await memoService.reorder({ type: 'family', familyId: 'f1' }, ['b', 'a']);
  expect(rpc).toHaveBeenCalledWith('reorder_memos', { p_family_id: 'f1', p_ids: ['b', 'a'] });
});
it('subscribes with unique topics and handles deletes without unsupported filter', () => {
  const channel = createRealtimeChannel();
  const channelMock = supabase.channel as unknown as jest.Mock;
  channelMock.mockReturnValue(channel);
  const remove = supabase.removeChannel as unknown as jest.Mock;
  remove.mockResolvedValue(undefined);
  const callback = jest.fn();
  const dispose = subscribeMemos({ type: 'family', familyId: 'f1' }, 'u1', callback);
  subscribeMemos({ type: 'family', familyId: 'f1' }, 'u1', callback);
  expect(channelMock.mock.calls[0][0]).not.toEqual(channelMock.mock.calls[1][0]);
  expect(channel.on).toHaveBeenCalledWith('postgres_changes', expect.objectContaining({ event: 'DELETE', table: 'memos' }), expect.any(Function));
  channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
  expect(callback).toHaveBeenCalledTimes(1);
  channel.subscribe.mock.calls[0][0]('SUBSCRIBED');
  expect(callback).toHaveBeenCalledTimes(2);
  channel.on.mock.calls[0][2]({});
  expect(callback).toHaveBeenCalledTimes(3);
  dispose();
  expect(remove).toHaveBeenCalledWith(channel);
});
it('rejects updates and deletes when no accessible row matches', async () => {
  const chain = createQueryChain(queryError('no rows')); from.mockReturnValue(chain);
  await expect(memoService.update('missing', { isCompleted: true })).rejects.toThrow('修改备忘录失败');
  await expect(memoService.remove('missing')).rejects.toThrow('删除备忘录失败');
  expect(chain.single).toHaveBeenCalledTimes(2);
});
it('reports service errors', async () => {
  from.mockReturnValue(createQueryChain(queryError('x')));
  await expect(memoService.list({ type: 'family', familyId: 'f' }, 'u')).rejects.toThrow('加载备忘录失败');
});
