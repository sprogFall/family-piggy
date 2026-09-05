import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import type { CreateTransactionInput, Transaction, UpdateTransactionInput } from '@/types/domain';
import { toTransaction, type TransactionRow } from '@/types/db';

export const transactionService = {
  /** 拉取某账本 [start, end) 区间流水，时间倒序 */
  async listMonth(ledgerId: string, start: string, end: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('ledger_id', ledgerId)
      .gte('occurred_at', start)
      .lt('occurred_at', end)
      .order('occurred_at', { ascending: false });
    if (error) throw new Error('加载账单失败');
    return (data as TransactionRow[]).map(toTransaction);
  },

  async create(input: CreateTransactionInput, createdBy: string): Promise<Transaction> {
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        ledger_id: input.ledgerId,
        category_id: input.categoryId,
        kind: input.kind,
        amount: input.amount,
        note: input.note,
        occurred_at: input.occurredAt,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new Error('记一笔失败');
    return toTransaction(data as TransactionRow);
  },

  async createMany(
    inputs: (CreateTransactionInput & { createdBy: string })[],
  ): Promise<void> {
    const rows = inputs.map((input) => ({
      ledger_id: input.ledgerId,
      category_id: input.categoryId,
      kind: input.kind,
      amount: input.amount,
      note: input.note,
      occurred_at: input.occurredAt,
      created_by: input.createdBy,
    }));
    const { error } = await supabase.from('transactions').insert(rows);
    if (error) throw new Error('批量导入失败');
  },

  async update(id: string, patch: UpdateTransactionInput): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
    if (patch.kind !== undefined) row.kind = patch.kind;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.occurredAt !== undefined) row.occurred_at = patch.occurredAt;
    const { error } = await supabase.from('transactions').update(row).eq('id', id);
    if (error) throw new Error('修改账单失败');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw new Error('删除账单失败');
  },
};

export interface RealtimeHandlers {
  onUpsert?: (tx: Transaction) => void;
  onDelete?: (id: string) => void;
}

/** 订阅账本流水实时变更，返回取消订阅函数 */
export const subscribeTransactions = (
  ledgerId: string,
  handlers: RealtimeHandlers,
): (() => void) => {
  const channel = supabase.channel(`transactions-${ledgerId}`);

  channel.on(
    'postgres_changes' as never,
    {
      event: '*',
      schema: 'public',
      table: 'transactions',
      filter: `ledger_id=eq.${ledgerId}`,
    },
    (payload: RealtimePostgresChangesPayload<TransactionRow>) => {
      if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && payload.new) {
        handlers.onUpsert?.(toTransaction(payload.new as TransactionRow));
      }
      if (payload.eventType === 'DELETE' && payload.old) {
        const old = payload.old as { id?: string };
        if (old.id) handlers.onDelete?.(old.id);
      }
    },
  );
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
