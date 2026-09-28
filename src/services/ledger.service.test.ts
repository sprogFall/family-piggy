import { supabase } from '@/lib/supabase';
import { createQueryChain, queryError } from '@/test/supabase-mock';

import { ledgerService } from './ledger.service';

const fromMock = supabase.from as unknown as jest.Mock;

const ledgerRow = {
  id: 'l1',
  name: '个人账本',
  type: 'personal',
  owner_id: 'u1',
  family_id: null,
  monthly_budget: 0,
  created_at: '2024-01-01T00:00:00Z',
};

describe('ledgerService', () => {
  afterEach(() => fromMock.mockReset());

  it('listLedgers 返回领域对象', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: [ledgerRow], error: null }));
    const ledgers = await ledgerService.listLedgers();
    expect(fromMock).toHaveBeenCalledWith('ledgers');
    expect(ledgers).toEqual([
      { id: 'l1', name: '个人账本', type: 'personal', ownerId: 'u1', familyId: null, monthlyBudget: 0, createdAt: '2024-01-01T00:00:00Z' },
    ]);
  });

  it('createLedger 写入 snake_case 字段（不用 INSERT ... RETURNING）', async () => {
    const chain = createQueryChain({ data: ledgerRow, error: null });
    fromMock.mockReturnValue(chain);
    await ledgerService.createLedger({
      name: '新账本',
      type: 'personal',
      ownerId: 'u1',
      familyId: null,
    });
    expect(chain.insert).toHaveBeenCalledWith({
      name: '新账本',
      type: 'personal',
      owner_id: 'u1',
      family_id: null,
    });
    // 新账本由调用方重新加载列表获取（RETURNING 会被 RLS SELECT 策略过滤），故不调用 select
    expect(chain.select).not.toHaveBeenCalled();
  });

  it('createLedger 失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(
      ledgerService.createLedger({
        name: '新账本',
        type: 'personal',
        ownerId: 'u1',
        familyId: null,
      }),
    ).rejects.toThrow('创建账本失败');
  });

  it('失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(ledgerService.listLedgers()).rejects.toThrow('加载账本失败');
  });

  it('updateBudget 写入分单位的月度预算', async () => {
    const chain = createQueryChain({ data: null, error: null });
    fromMock.mockReturnValue(chain);
    await ledgerService.updateBudget('l1', 200000);
    expect(fromMock).toHaveBeenCalledWith('ledgers');
    expect(chain.update).toHaveBeenCalledWith({ monthly_budget: 200000 });
    expect(chain.eq).toHaveBeenCalledWith('id', 'l1');
  });
});
