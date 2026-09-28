import { supabase } from '@/lib/supabase';
import type { Ledger, LedgerType } from '@/types/domain';
import { toLedger, type LedgerRow } from '@/types/db';

export interface CreateLedgerInput {
  name: string;
  type: LedgerType;
  ownerId: string;
  familyId: string | null;
}

export const ledgerService = {
  /** RLS 保证只返回可见账本（本人个人账本 + 所在家庭账本） */
  async listLedgers(): Promise<Ledger[]> {
    const { data, error } = await supabase
      .from('ledgers')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error('加载账本失败');
    return (data as LedgerRow[]).map(toLedger);
  },

  /**
   * 新建账本。
   *
   * 刻意不使用 `.insert().select()`：`ledgers_select` 策略经 `can_access_ledger`（stable
   * security definer 函数）判断，而同一条 INSERT 语句内该函数看不到刚插入的行，RETURNING 会被
   * 过滤成 0 行（PostgREST 报 PGRST116），出现「账本已写入却报创建失败」。因此只做写入，
   * 由调用方随后重新加载账本列表（新语句可见新行）。
   */
  async createLedger(input: CreateLedgerInput): Promise<void> {
    const { error } = await supabase.from('ledgers').insert({
      name: input.name,
      type: input.type,
      owner_id: input.ownerId,
      family_id: input.familyId,
    });
    if (error) throw new Error('创建账本失败');
  },

  async removeLedger(id: string): Promise<void> {
    const { error } = await supabase.from('ledgers').delete().eq('id', id);
    if (error) throw new Error('删除账本失败');
  },

  async updateBudget(id: string, monthlyBudget: number): Promise<void> {
    const { error } = await supabase
      .from('ledgers')
      .update({ monthly_budget: monthlyBudget })
      .eq('id', id);
    if (error) throw new Error('保存预算失败');
  },
};
