import { create } from 'zustand';

import { categoryService, type CategoryPatch } from '@/services/category.service';
import type { Category, CategoryInput } from '@/types/domain';

interface CategoryState {
  byLedger: Record<string, Category[]>;
  load: (ledgerId: string) => Promise<void>;
  create: (input: CategoryInput) => Promise<Category>;
  update: (id: string, ledgerId: string, patch: CategoryPatch) => Promise<void>;
  remove: (id: string, ledgerId: string) => Promise<void>;
  reset: () => void;
}

const sortCategories = (list: Category[]): Category[] =>
  [...list].sort((a, b) =>
    a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind.localeCompare(b.kind),
  );

export const useCategoryStore = create<CategoryState>((set, get) => ({
  byLedger: {},

  load: async (ledgerId) => {
    const categories = await categoryService.list(ledgerId);
    set({ byLedger: { ...get().byLedger, [ledgerId]: categories } });
  },

  create: async (input) => {
    const created = await categoryService.create(input);
    const list = get().byLedger[input.ledgerId] ?? [];
    set({
      byLedger: {
        ...get().byLedger,
        [input.ledgerId]: sortCategories([...list, created]),
      },
    });
    return created;
  },

  update: async (id, ledgerId, patch) => {
    await categoryService.update(id, patch);
    const list = get().byLedger[ledgerId] ?? [];
    set({
      byLedger: {
        ...get().byLedger,
        [ledgerId]: list.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    });
  },

  remove: async (id, ledgerId) => {
    await categoryService.remove(id);
    const list = get().byLedger[ledgerId] ?? [];
    set({
      byLedger: { ...get().byLedger, [ledgerId]: list.filter((c) => c.id !== id) },
    });
  },

  reset: () => set({ byLedger: {} }),
}));

export const selectCategories = (
  state: CategoryState,
  ledgerId: string | null | undefined,
): Category[] => (ledgerId ? (state.byLedger[ledgerId] ?? []) : []);
