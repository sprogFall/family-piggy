import { supabase } from '@/lib/supabase';
import type { Category, CategoryInput, TxKind } from '@/types/domain';
import { toCategory, type CategoryRow } from '@/types/db';

export interface CategoryPatch {
  name?: string;
  icon?: string;
}

export const categoryService = {
  async list(ledgerId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('kind', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) throw new Error('加载分类失败');
    return (data as CategoryRow[]).map(toCategory);
  },

  async create(input: CategoryInput): Promise<Category> {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        ledger_id: input.ledgerId,
        name: input.name,
        icon: input.icon,
        kind: input.kind,
        sort_order: input.sortOrder,
      })
      .select('*')
      .single();
    if (error) throw new Error('新增分类失败');
    return toCategory(data as CategoryRow);
  },

  async update(id: string, patch: CategoryPatch): Promise<void> {
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) throw new Error('修改分类失败');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw new Error('删除分类失败');
  },

  async maxSortOrder(ledgerId: string, kind: TxKind): Promise<number> {
    const categories = await this.list(ledgerId);
    return categories
      .filter((c) => c.kind === kind)
      .reduce((max, c) => Math.max(max, c.sortOrder), 0);
  },
};
