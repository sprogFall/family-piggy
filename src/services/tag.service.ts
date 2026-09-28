import { supabase } from '@/lib/supabase';
import type { Tag, TagInput } from '@/types/domain';
import { toTag, type TagRow } from '@/types/db';

/** 归一化标签名：去首尾空格并压缩连续空白，保证「复用」时能命中同一条标签 */
export const normalizeTagName = (name: string): string => name.trim().replace(/\s+/g, ' ');

export const tagService = {
  /** 某账本的全部标签（按名称排序，UI 再按分类筛选） */
  async list(ledgerId: string): Promise<Tag[]> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('name', { ascending: true });
    if (error) throw new Error('加载标签失败');
    return (data as TagRow[]).map(toTag);
  },

  /**
   * 批量确保某分类下的标签存在（幂等）：同名标签直接复用，缺失的补齐。
   * 依赖 tags(ledger_id, category_id, name) 唯一约束，用 upsert 一次往返完成，
   * 避免「先查后插」在多人同时记账时产生重复标签。
   */
  async ensureMany(ledgerId: string, categoryId: string, names: string[]): Promise<Tag[]> {
    const unique = [...new Set(names.map(normalizeTagName).filter((name) => name !== ''))];
    if (unique.length === 0) return [];
    const { data, error } = await supabase
      .from('tags')
      .upsert(
        unique.map((name) => ({ ledger_id: ledgerId, category_id: categoryId, name })),
        { onConflict: 'ledger_id,category_id,name' },
      )
      .select('*');
    if (error) throw new Error('保存标签失败');
    return (data as TagRow[]).map(toTag);
  },

  async ensure(input: TagInput): Promise<Tag> {
    const [tag] = await this.ensureMany(input.ledgerId, input.categoryId, [input.name]);
    if (!tag) throw new Error('保存标签失败');
    return tag;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) throw new Error('删除标签失败');
  },
};
