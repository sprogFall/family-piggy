import { supabase } from '@/lib/supabase';
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  RecurringSchedule,
  UpdateRecurringRuleInput,
} from '@/types/domain';
import { toRecurringRule, type RecurringRuleRow } from '@/types/db';

/** 领域定时计划 -> DB 列；切换到另一种频率时另一列必须写 null */
const scheduleColumns = (
  schedule: RecurringSchedule,
): { frequency: RecurringSchedule['frequency']; monthly_day: number | null; weekly_day: number | null } => ({
  frequency: schedule.frequency,
  monthly_day: schedule.frequency === 'monthly' ? schedule.monthlyDay : null,
  weekly_day: schedule.frequency === 'weekly' ? schedule.weeklyDay : null,
});

export const recurringRuleService = {
  /** 某账本的全部定时记账规则，新创建的在前 */
  async list(ledgerId: string): Promise<RecurringRule[]> {
    const { data, error } = await supabase
      .from('recurring_rules')
      .select('*')
      .eq('ledger_id', ledgerId)
      .order('created_at', { ascending: false });
    if (error) throw new Error('加载定时记账失败');
    return (data as RecurringRuleRow[]).map(toRecurringRule);
  },

  async create(input: CreateRecurringRuleInput, createdBy: string): Promise<RecurringRule> {
    const { data, error } = await supabase
      .from('recurring_rules')
      .insert({
        ledger_id: input.ledgerId,
        category_id: input.categoryId,
        kind: input.kind,
        amount: input.amount,
        currency: input.currency,
        tag_names: input.tagNames,
        note: input.note,
        attributes: input.attributes,
        images: input.images,
        ...scheduleColumns(input.schedule),
        time_zone: input.timeZone,
        next_run_on: input.nextRunOn,
        created_by: createdBy,
      })
      .select('*')
      .single();
    if (error) throw new Error('保存定时记账失败');
    return toRecurringRule(data as RecurringRuleRow);
  },

  async update(id: string, patch: UpdateRecurringRuleInput): Promise<void> {
    const row: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
    if (patch.kind !== undefined) row.kind = patch.kind;
    if (patch.amount !== undefined) row.amount = patch.amount;
    if (patch.currency !== undefined) row.currency = patch.currency;
    if (patch.tagNames !== undefined) row.tag_names = patch.tagNames;
    if (patch.note !== undefined) row.note = patch.note;
    if (patch.attributes !== undefined) row.attributes = patch.attributes;
    if (patch.images !== undefined) row.images = patch.images;
    if (patch.schedule !== undefined) Object.assign(row, scheduleColumns(patch.schedule));
    if (patch.timeZone !== undefined) row.time_zone = patch.timeZone;
    if (patch.nextRunOn !== undefined) row.next_run_on = patch.nextRunOn;
    if (patch.isActive !== undefined) row.is_active = patch.isActive;
    const { error } = await supabase.from('recurring_rules').update(row).eq('id', id);
    if (error) throw new Error('修改定时记账失败');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
    if (error) throw new Error('删除定时记账失败');
  },
};
