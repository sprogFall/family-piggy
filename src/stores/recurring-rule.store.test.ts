jest.mock('@/services/recurring-rule.service', () => ({
  recurringRuleService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/stores/auth.store', () => ({
  useAuthStore: { getState: () => ({ session: { user: { id: 'u1' } } }) },
}));

import { recurringRuleService } from '@/services/recurring-rule.service';
import type { RecurringRule } from '@/types/domain';

import {
  selectRecurringRuleById,
  selectRecurringRules,
  useRecurringRuleStore,
} from './recurring-rule.store';

const ruleMock = recurringRuleService as jest.Mocked<typeof recurringRuleService>;

const rule = (id: string, overrides: Partial<RecurringRule> = {}): RecurringRule => ({
  id,
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100000,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  schedule: { frequency: 'monthly', monthlyDay: 10 },
  timeZone: 'Asia/Shanghai',
  nextRunOn: '2024-06-10',
  isActive: true,
  createdBy: 'u1',
  createdAt: '2024-05-01T00:00:00.000Z',
  ...overrides,
});

describe('useRecurringRuleStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRecurringRuleStore.setState({ byLedger: {} });
  });

  it('load 按账本存入规则', async () => {
    ruleMock.list.mockResolvedValue([rule('r1'), rule('r2')]);
    await useRecurringRuleStore.getState().load('l1');
    expect(selectRecurringRules(useRecurringRuleStore.getState(), 'l1')).toHaveLength(2);
  });

  it('create 调用服务并插入到列表头部', async () => {
    ruleMock.list.mockResolvedValue([rule('r1')]);
    await useRecurringRuleStore.getState().load('l1');
    ruleMock.create.mockResolvedValue(rule('r9'));

    await useRecurringRuleStore.getState().create({
      ledgerId: 'l1',
      categoryId: 'c1',
      kind: 'expense',
      amount: 100000,
      currency: 'CNY',
      tagNames: [],
      note: '',
      attributes: { reimbursement: false },
      images: [],
      schedule: { frequency: 'monthly', monthlyDay: 10 },
      timeZone: 'Asia/Shanghai',
      nextRunOn: '2024-06-10',
    });

    expect(ruleMock.create).toHaveBeenCalledWith(expect.anything(), 'u1');
    expect(selectRecurringRules(useRecurringRuleStore.getState(), 'l1').map((item) => item.id)).toEqual([
      'r9',
      'r1',
    ]);
  });

  it('update 局部更新本地列表', async () => {
    ruleMock.list.mockResolvedValue([rule('r1')]);
    await useRecurringRuleStore.getState().load('l1');
    await useRecurringRuleStore.getState().update('r1', 'l1', { amount: 200000, isActive: false });
    const item = selectRecurringRules(useRecurringRuleStore.getState(), 'l1')[0];
    expect(item.amount).toBe(200000);
    expect(item.isActive).toBe(false);
  });

  it('remove 移除本地列表', async () => {
    ruleMock.list.mockResolvedValue([rule('r1'), rule('r2')]);
    await useRecurringRuleStore.getState().load('l1');
    ruleMock.remove.mockResolvedValue(undefined);
    await useRecurringRuleStore.getState().remove('r1', 'l1');
    expect(selectRecurringRules(useRecurringRuleStore.getState(), 'l1').map((item) => item.id)).toEqual([
      'r2',
    ]);
  });

  it('selectRecurringRules 未加载/无账本时返回稳定引用', () => {
    const state = useRecurringRuleStore.getState();
    expect(selectRecurringRules(state, 'l1')).toBe(selectRecurringRules(state, 'l1'));
    expect(selectRecurringRules(state, null)).toBe(selectRecurringRules(state, undefined));
  });

  it('selectRecurringRuleById 跨账本查找，未找到/无 id 返回 undefined', async () => {
    ruleMock.list.mockResolvedValue([rule('r1')]);
    await useRecurringRuleStore.getState().load('l1');
    expect(selectRecurringRuleById(useRecurringRuleStore.getState(), 'r1')?.id).toBe('r1');
    expect(selectRecurringRuleById(useRecurringRuleStore.getState(), 'missing')).toBeUndefined();
    expect(selectRecurringRuleById(useRecurringRuleStore.getState(), null)).toBeUndefined();
  });

  it('reset 清空所有账本规则', () => {
    useRecurringRuleStore.setState({ byLedger: { l1: [rule('r1')] } });
    useRecurringRuleStore.getState().reset();
    expect(useRecurringRuleStore.getState().byLedger).toEqual({});
  });
});
