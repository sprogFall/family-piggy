import { create } from 'zustand';
import { memoService, subscribeMemos } from '@/services/memo.service';
import { useAuthStore } from '@/stores/auth.store';
import type { CreateMemoInput, MemoItem, MemoScope, UpdateMemoInput } from '@/types/domain';

const keyOf = (scope: MemoScope): string => scope.type === 'personal' ? 'personal' : `family:${scope.familyId}`;
const rank = { high: 0, medium: 1, low: 2 };
const sorted = (items: MemoItem[]): MemoItem[] => [...items].sort((a, b) => {
  if (a.sortOrder !== null || b.sortOrder !== null) {
    if (a.sortOrder === null) return 1;
    if (b.sortOrder === null) return -1;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  }
  return rank[a.importance] - rank[b.importance] || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
});
const userId = (): string => {
  const id = useAuthStore.getState().session?.user.id;
  if (!id) throw new Error('未登录');
  return id;
};
interface MemoState {
  byScope: Record<string, MemoItem[]>;
  load: (scope: MemoScope) => Promise<void>;
  create: (scope: MemoScope, input: CreateMemoInput) => Promise<MemoItem>;
  update: (scope: MemoScope, id: string, patch: UpdateMemoInput) => Promise<void>;
  remove: (scope: MemoScope, id: string) => Promise<void>;
  reorder: (scope: MemoScope, ids: string[]) => Promise<void>;
  subscribe: (scope: MemoScope) => () => void;
  reset: () => void;
}
let generation = 0;
const revisions = new Map<string, number>();
const applied = new Map<string, number>();
const invalidate = (scope: MemoScope): void => { applied.set(keyOf(scope), bump(scope)); };
const bump = (scope: MemoScope): number => {
  const key = keyOf(scope);
  const next = (revisions.get(key) ?? 0) + 1;
  revisions.set(key, next);
  return next;
};
const subscriptions = new Set<() => void>();
export const useMemoStore = create<MemoState>((set, get) => ({
  byScope: {},
  load: async (scope) => {
    const version = generation;
    const revision = bump(scope);
    const items = await memoService.list(scope, userId());
    if (version === generation && revision > (applied.get(keyOf(scope)) ?? 0)) {
      applied.set(keyOf(scope), revision);
      set(state => ({ byScope: { ...state.byScope, [keyOf(scope)]: sorted(items) } }));
    }
  },
  create: async (scope, input) => {
    const version = generation;
    const item = await memoService.create(scope, input, userId());
    if (version === generation) invalidate(scope);
    if (version === generation) set(state => ({ byScope: { ...state.byScope, [keyOf(scope)]: sorted([...(state.byScope[keyOf(scope)] ?? []).filter(x => x.id !== item.id), item]) } }));
    if (version === generation) await get().load(scope).catch(() => undefined);
    return item;
  },
  update: async (scope, id, patch) => {
    const version = generation;
    await memoService.update(id, patch);
    if (version === generation) invalidate(scope);
    if (version === generation) set(state => ({ byScope: { ...state.byScope, [keyOf(scope)]: sorted((state.byScope[keyOf(scope)] ?? []).map(x => x.id === id ? { ...x, ...patch } : x)) } }));
    if (version === generation) await get().load(scope).catch(() => undefined);
  },
  remove: async (scope, id) => {
    const version = generation;
    await memoService.remove(id);
    if (version === generation) invalidate(scope);
    if (version === generation) set(state => ({ byScope: { ...state.byScope, [keyOf(scope)]: (state.byScope[keyOf(scope)] ?? []).filter(x => x.id !== id) } }));
    if (version === generation) await get().load(scope).catch(() => undefined);
  },
  reorder: async (scope, ids) => {
    const items = get().byScope[keyOf(scope)] ?? [];
    if (ids.length !== items.length || new Set(ids).size !== ids.length || ids.some(id => !items.some(x => x.id === id))) throw new Error('备忘录列表已变化，请刷新后重试');
    const version = generation;
    await memoService.reorder(scope, ids);
    if (version === generation) invalidate(scope);
    if (version === generation) set(state => ({ byScope: { ...state.byScope, [keyOf(scope)]: sorted((state.byScope[keyOf(scope)] ?? []).map(x => ({ ...x, sortOrder: ids.indexOf(x.id) < 0 ? x.sortOrder : ids.indexOf(x.id) }))) } }));
    if (version === generation) await get().load(scope).catch(() => undefined);
  },
  subscribe: (scope) => {
    const dispose = subscribeMemos(scope, userId(), () => { void get().load(scope).catch(() => undefined); });
    const unsubscribe = () => { subscriptions.delete(unsubscribe); dispose(); };
    subscriptions.add(unsubscribe);
    return unsubscribe;
  },
  reset: () => { generation++; subscriptions.forEach(unsubscribe => unsubscribe()); set({ byScope: {} }); },
}));
const EMPTY_MEMOS: MemoItem[] = [];
export const selectMemoItems = (state: MemoState, scope: MemoScope | null | undefined): MemoItem[] => scope ? state.byScope[keyOf(scope)] ?? EMPTY_MEMOS : EMPTY_MEMOS;
