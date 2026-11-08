import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toMemo, type MemoRow } from '@/types/db';
import type { CreateMemoInput, MemoItem, MemoScope, UpdateMemoInput } from '@/types/domain';

export const memoService = {
  async list(scope: MemoScope, userId: string): Promise<MemoItem[]> {
    const rows: MemoRow[] = [];
    const pageSize = 1000;
    while (true) {
      let query = supabase.from('memos').select('*');
      query = scope.type === 'family' ? query.eq('family_id', scope.familyId) : query.is('family_id', null).eq('owner_id', userId);
      const { data, error } = await query.order('id', { ascending: true }).range(rows.length, rows.length + pageSize - 1);
      if (error) throw new Error('加载备忘录失败');
      const page = data as MemoRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    return rows.map(toMemo);
  },
  async create(scope: MemoScope, input: CreateMemoInput, userId: string): Promise<MemoItem> {
    const { data, error } = await supabase.from('memos').insert({ family_id: scope.type === 'family' ? scope.familyId : null, owner_id: userId, content: input.content, importance: input.importance }).select('*').single();
    if (error) throw new Error('创建备忘录失败');
    return toMemo(data as MemoRow);
  },
  async update(id: string, patch: UpdateMemoInput): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.content !== undefined) row.content = patch.content;
    if (patch.importance !== undefined) row.importance = patch.importance;
    if (patch.isCompleted !== undefined) row.is_completed = patch.isCompleted;
    const { error } = await supabase.from('memos').update(row).eq('id', id).select('id').single();
    if (error) throw new Error('修改备忘录失败');
  },
  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('memos').delete().eq('id', id).select('id').single();
    if (error) throw new Error('删除备忘录失败');
  },
  async reorder(scope: MemoScope, ids: string[]): Promise<void> {
    const { error } = await supabase.rpc('reorder_memos', { p_family_id: scope.type === 'family' ? scope.familyId : null, p_ids: ids });
    if (error) throw new Error('保存备忘录排序失败');
  },
};

let sequence = 0;
export const subscribeMemos = (scope: MemoScope, userId: string, onChange: () => void): (() => void) => {
  const filter = scope.type === 'family' ? `family_id=eq.${scope.familyId}` : `owner_id=eq.${userId}`;
  const channel = supabase.channel(`memos-${++sequence}`);
  for (const event of ['INSERT', 'UPDATE'] as const) {
    channel.on('postgres_changes' as never, { event, schema: 'public', table: 'memos', filter }, (_payload: RealtimePostgresChangesPayload<MemoRow>) => onChange());
  }
  // Supabase 不支持按列过滤 DELETE；收到删除事件时重拉当前权限域。
  channel.on('postgres_changes' as never, { event: 'DELETE', schema: 'public', table: 'memos' }, () => onChange());
  channel.subscribe((status) => { if (status === 'SUBSCRIBED') onChange(); });
  return () => { void supabase.removeChannel(channel).catch(() => undefined); };
};
