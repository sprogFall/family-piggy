jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useFocusEffect: jest.fn() };
});

jest.mock('@/hooks/useActiveLedgerData', () => ({
  useActiveLedger: () => ({
    id: 'l1',
    name: '个人账本',
    type: 'personal',
    ownerId: 'u1',
    familyId: null,
    monthlyBudget: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
  }),
  useActiveCategories: () => [
    {
      id: 'c1',
      ledgerId: 'l1',
      name: '餐饮',
      icon: 'restaurant',
      kind: 'expense',
      sortOrder: 1,
    },
  ],
}));

jest.mock('@/services/recurring-rule.service', () => ({
  recurringRuleService: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getDialogRequest, pressDialogButton } from '@/lib/alert';
import { recurringRuleService } from '@/services/recurring-rule.service';
import { useRecurringRuleStore } from '@/stores/recurring-rule.store';
import type { RecurringRule } from '@/types/domain';

import { RecurringRuleManagerScreen } from './RecurringRuleManagerScreen';

const serviceMock = recurringRuleService as jest.Mocked<typeof recurringRuleService>;

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const navigation = { goBack: jest.fn(), navigate: jest.fn() };
const route = {} as never;

const rule: RecurringRule = {
  id: 'r1',
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 100000,
  currency: 'CNY',
  tagNames: [],
  note: '每月房租',
  attributes: { reimbursement: false },
  images: [],
  schedule: { frequency: 'monthly', monthlyDay: 10 },
  timeZone: 'Asia/Shanghai',
  nextRunOn: '2024-06-10',
  isActive: true,
  createdBy: 'u1',
  createdAt: '2024-05-01T00:00:00.000Z',
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <RecurringRuleManagerScreen navigation={navigation as never} route={route} />
    </SafeAreaProvider>,
  );

describe('RecurringRuleManagerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useRecurringRuleStore.setState({ byLedger: { l1: [rule] } });
  });

  it('展示规则金额、分类、频率与备注', () => {
    renderScreen();
    expect(screen.getByText('每月10号')).toBeTruthy();
    expect(screen.getByText('¥1,000.00')).toBeTruthy();
    expect(screen.getByText('餐饮')).toBeTruthy();
    expect(screen.getByText('支出 · 每月房租')).toBeTruthy();
  });

  it('点击编辑跳转 AddTransaction 并携带规则 ID', () => {
    renderScreen();
    fireEvent.press(screen.getByLabelText('编辑 每月10号'));
    expect(navigation.navigate).toHaveBeenCalledWith('AddTransaction', { recurringRuleId: 'r1' });
  });

  it('点击新增跳转 AddTransaction 并直接打开定时选择', () => {
    renderScreen();
    fireEvent.press(screen.getByText('＋ 新增定时记账'));
    expect(navigation.navigate).toHaveBeenCalledWith('AddTransaction', { startRecurring: true });
  });

  it('删除前二次确认，确认后调用 store/service 删除', async () => {
    serviceMock.remove.mockResolvedValue(undefined);
    renderScreen();
    fireEvent.press(screen.getByLabelText('删除 每月10号'));

    const dialog = getDialogRequest();
    expect(dialog?.title).toBe('删除定时记账');
    pressDialogButton(dialog!.buttons[1]);

    await waitFor(() => expect(serviceMock.remove).toHaveBeenCalledWith('r1'));
  });
});
