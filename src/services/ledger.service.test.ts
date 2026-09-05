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
  created_at: '2024-01-01T00:00:00Z',
};

describe('ledgerService', () => {
  afterEach(() => fromMock.mockReset());

  it('listLedgers 返回领域对象', async () => {
    fromMock.mockReturnValue(createQueryChain({ data: [ledgerRow], error: null }));
    const ledgers = await ledgerService.listLedgers();
    expect(fromMock).toHaveBeenCalledWith('ledgers');
    expect(ledgers).toEqual([
      { id: 'l1', name: '个人账本', type: 'personal', ownerId: 'u1', familyId: null, createdAt: '2024-01-01T00:00:00Z' },
    ]);
  });

  it('createLedger 写入 snake_case 字段', async () => {
    const chain = createQueryChain({ data: ledgerRow, error: null });
    fromMock.mockReturnValue(chain);
    const ledger = await ledgerService.createLedger({
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
    expect(ledger.id).toBe('l1');
  });

  it('失败时抛出友好错误', async () => {
    fromMock.mockReturnValue(createQueryChain(queryError('boom')));
    await expect(ledgerService.listLedgers()).rejects.toThrow('加载账本失败');
  });
});
