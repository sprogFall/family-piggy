import { supabase } from '@/lib/supabase';
import { createQueryChain, queryError } from '@/test/supabase-mock';

import { recurringRuleService } from './recurring-rule.service';

const fromMock = supabase.from as unknown as jest.Mock;

const row = {
  id: 'r1',
  ledger_id: 'l1',
  category_id: 'c1',
  kind: 'expense',
  amount: '100000',
  currency: 'CNY',
  tag_names: ['房租'],
  note: '每月房租',
  attributes: { reimbursement: false },
  images: ['https://cdn/img.jpg'],
  frequency: 'monthly',
  monthly_day: 10,
  weekly_day: null,
  time_zone: 'Asia/Shanghai',
  next_run_on: '2024-06-10',
  is_active: true,
  created_by: 'u1',
  created_at: '2024-05-01T00:00:00.000Z',
};

describe('recurringRuleService', () => {
  afterEach(() => fromMock.mockReset());

  it('list 按账本过滤并按创建时间倒序', async () => {
    const chain = createQueryChain({ data: [row], error: null });
    fromMock.mockReturnValue(chain);

    const rules = await recurringRuleService.list('l1');

    expect(fromMock).toHaveBeenCalledWith('recurring_rules');
    expect(chain.eq).toHaveBeenCalledWith('ledger_id', 'l1');
    expect(chain.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(rules[0]).toEqual({
      id: 'r1',
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 100000,
      currency: 'CNY',
      tagNames: ['房租'],
      note: '每月房租',
      attributes: { reimbursement: false },
      images: ['https://cdn/img.jpg'],
      schedule: { frequency: 'monthly', monthlyDay: 10 },
      timeZone: 'Asia/Shanghai',
      nextRunOn: '2024-06-10',
      isActive: true,
      createdBy: 'u1',
      createdAt: '2024-05-01T00:00:00.000Z',
    });
  });

  it('create 把领域计划映射为 frequency/monthly_day/weekly_day 并带创建人', async () => {
    const chain = createQueryChain({ data: row, error: null });
    fromMock.mockReturnValue(chain);

    await recurringRuleService.create(
      {
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'expense',
        amount: 100000,
        currency: 'CNY',
        tagNames: ['房租'],
        note: '每月房租',
        attributes: { reimbursement: false },
        images: ['https://cdn/img.jpg'],
        schedule: { frequency: 'monthly', monthlyDay: 10 },
        timeZone: 'Asia/Shanghai',
        nextRunOn: '2024-06-10',
      },
      'u1',
    );

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        ledger_id: 'l1',
        frequency: 'monthly',
        monthly_day: 10,
        weekly_day: null,
        next_run_on: '2024-06-10',
        created_by: 'u1',
        amount: 100000,
      }),
    );
  });

  it('create 支持每周并清空 monthly_day', async () => {
    const chain = createQueryChain({ data: { ...row, frequency: 'weekly', monthly_day: null, weekly_day: 1 }, error: null });
    fromMock.mockReturnValue(chain);

    await recurringRuleService.create(
      {
        ledgerId: 'l1',
        categoryId: 'c1',
        kind: 'expense',
        amount: 100000,
        currency: 'CNY',
        tagNames: [],
        note: '',
        attributes: { reimbursement: false },
        images: [],
        schedule: { frequency: 'weekly', weeklyDay: 1 },
        timeZone: 'Asia/Shanghai',
        nextRunOn: '2024-05-27',
      },
      'u1',
    );

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ frequency: 'weekly', monthly_day: null, weekly_day: 1 }),
    );
  });

  it('update 只映射传入字段，并展开定时计划', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);

    await recurringRuleService.update('r1', {
      amount: 200000,
      schedule: { frequency: 'weekly', weeklyDay: 3 },
      nextRunOn: '2024-06-12',
      isActive: false,
    });

    expect(chain.update).toHaveBeenCalledWith({
      amount: 200000,
      frequency: 'weekly',
      monthly_day: null,
      weekly_day: 3,
      next_run_on: '2024-06-12',
      is_active: false,
    });
  });

  it('remove 按 ID 删除', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await recurringRuleService.remove('r1');
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('id', 'r1');
  });

  it('失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(recurringRuleService.list('l1')).rejects.toThrow('加载定时记账失败');
  });
});
