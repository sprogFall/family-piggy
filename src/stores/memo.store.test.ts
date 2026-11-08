jest.mock('@/services/memo.service', () => ({ memoService: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), reorder: jest.fn() }, subscribeMemos: jest.fn(() => jest.fn()) }));
jest.mock('@/stores/auth.store', () => ({ useAuthStore: { getState: () => ({ session: { user: { id: 'u1' } } }) } }));
import { memoService } from '@/services/memo.service';
import type { MemoItem } from '@/types/domain';
import { selectMemoItems, useMemoStore } from './memo.store';
const service = memoService as jest.Mocked<typeof memoService>;
const scope = { type: 'personal' } as const;
const item = (id: string, importance: MemoItem['importance']): MemoItem => ({ id, scope, ownerId: 'u1', content: id, importance, isCompleted: false, sortOrder: null, createdAt: id, updatedAt: id });
beforeEach(() => { jest.clearAllMocks(); useMemoStore.getState().reset(); });
it('defaults to importance order and caches results', async () => {
  service.list.mockResolvedValue([item('a', 'low'), item('b', 'high')]);
  await useMemoStore.getState().load(scope);
  expect(selectMemoItems(useMemoStore.getState(), scope).map(x => x.id)).toEqual(['b', 'a']);
});
it('updates local state after persistence and reorders', async () => {
  service.list.mockResolvedValue([item('a', 'low'), item('b', 'high')]);
  await useMemoStore.getState().load(scope);
  service.list.mockResolvedValue([ { ...item('a', 'low'), isCompleted: true }, item('b', 'high') ]);
  await useMemoStore.getState().update(scope, 'a', { isCompleted: true });
  expect(selectMemoItems(useMemoStore.getState(), scope).find(x => x.id === 'a')?.isCompleted).toBe(true);
  service.list.mockResolvedValue([{ ...item('a', 'low'), isCompleted: true, sortOrder: 0 }, { ...item('b', 'high'), sortOrder: 1 }]);
  await useMemoStore.getState().reorder(scope, ['a', 'b']);
  expect(selectMemoItems(useMemoStore.getState(), scope).map(x => x.id)).toEqual(['a', 'b']);
});
it('returns stable empty reference', () => {
  expect(selectMemoItems(useMemoStore.getState(), scope)).toBe(selectMemoItems(useMemoStore.getState(), scope));
});
