jest.mock('@/services/memo.service', () => ({ memoService: { list: jest.fn(), update: jest.fn() }, subscribeMemos: jest.fn() }));
jest.mock('@/stores/auth.store', () => ({ useAuthStore: { getState: () => ({ session: { user: { id: 'u1' } } }) } }));
import { memoService } from '@/services/memo.service';
import { useMemoStore, selectMemoItems } from './memo.store';
import type { MemoItem } from '@/types/domain';
const scope = { type: 'personal' } as const;
const item: MemoItem = { id: 'a', scope, ownerId: 'u1', content: 'a', importance: 'high', isCompleted: false, sortOrder: null, createdAt: 'a', updatedAt: 'a' };
const service = memoService as jest.Mocked<typeof memoService>;
it('does not overwrite a completed write with an older in-flight load', async () => {
  useMemoStore.getState().reset();
  let resolve!: (items: MemoItem[]) => void;
  service.list.mockResolvedValueOnce([item]).mockImplementationOnce(() => new Promise(r => { resolve = r; }));
  await useMemoStore.getState().load(scope);
  const loading = useMemoStore.getState().load(scope);
  await useMemoStore.getState().update(scope, 'a', { isCompleted: true });
  resolve([item]); await loading;
  expect(selectMemoItems(useMemoStore.getState(), scope)[0].isCompleted).toBe(true);
});
it('converges to server state when concurrent updates return out of order', async () => {
  useMemoStore.getState().reset();
  let finish!: () => void;
  service.list.mockResolvedValue([item]);
  await useMemoStore.getState().load(scope);
  service.update.mockImplementationOnce(() => new Promise<void>(r => { finish = r; })).mockResolvedValueOnce();
  const first = useMemoStore.getState().update(scope, 'a', { content: 'old' });
  await useMemoStore.getState().update(scope, 'a', { content: 'new' });
  service.list.mockResolvedValue([{ ...item, content: 'new' }]);
  finish(); await first;
  expect(selectMemoItems(useMemoStore.getState(), scope)[0].content).toBe('new');
});
it('keeps an older successful load if a newer request fails', async () => {
  useMemoStore.getState().reset();
  let resolve!: (items: MemoItem[]) => void;
  service.list.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockRejectedValueOnce(new Error('network'));
  const older = useMemoStore.getState().load(scope);
  await expect(useMemoStore.getState().load(scope)).rejects.toThrow('network');
  resolve([item]); await older;
  expect(selectMemoItems(useMemoStore.getState(), scope)).toEqual([item]);
});
it('ignores an older request that finishes last', async () => {
  useMemoStore.getState().reset();
  let resolve!: (items: MemoItem[]) => void;
  service.list.mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce([{ ...item, content: 'new' }]);
  const old = useMemoStore.getState().load(scope);
  await useMemoStore.getState().load(scope);
  resolve([item]); await old;
  expect(selectMemoItems(useMemoStore.getState(), scope)[0].content).toBe('new');
});
