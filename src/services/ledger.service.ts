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

  async createLedger(input: CreateLedgerInput): Promise<Ledger> {
    const { data, error } = await supabase
      .from('ledgers')
      .insert({
        name: input.name,
        type: input.type,
        owner_id: input.ownerId,
        family_id: input.familyId,
      })
      .select('*')
      .single();
    if (error) throw new Error('创建账本失败');
    return toLedger(data as LedgerRow);
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
