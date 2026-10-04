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
  useActiveTags: () => [],
}));

jest.mock('@/services/transaction.service', () => ({
  transactionService: { create: jest.fn() },
  subscribeTransactions: jest.fn(() => () => undefined),
}));

import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { transactionService } from '@/services/transaction.service';
import { useAuthStore } from '@/stores/auth.store';
import { useRecurringRuleStore } from '@/stores/recurring-rule.store';
import { useSettingsStore } from '@/stores/settings.store';
import { useThemeStore } from '@/stores/theme.store';
import { useToastStore } from '@/stores/toast.store';
import { useTransactionStore } from '@/stores/transaction.store';
import { DEFAULT_FONT_SCALE } from '@/theme/font-scale';
import type { Transaction } from '@/types/domain';

import { AddTransactionScreen } from './AddTransactionScreen';

const METRICS = {
  frame: { height: 844, width: 390, x: 0, y: 0 },
  insets: { bottom: 34, left: 0, right: 0, top: 47 },
};

const INITIAL_DATE = '2024-05-01T10:00:00.000Z';

const navigation = { goBack: jest.fn(), replace: jest.fn() };
const route = { params: { initialDate: INITIAL_DATE } };

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <AddTransactionScreen navigation={navigation as never} route={route as never} />
    </SafeAreaProvider>,
  );

const createdTransaction: Transaction = {
  id: 't1',
  ledgerId: 'l1',
  categoryId: 'c1',
  kind: 'expense',
  amount: 12300,
  currency: 'CNY',
  tagNames: [],
  note: '',
  attributes: { reimbursement: false },
  images: [],
  occurredAt: INITIAL_DATE,
  createdBy: 'u1',
};

const createMock = transactionService.create as jest.MockedFunction<typeof transactionService.create>;

describe('AddTransactionScreen', () => {
  afterEach(() => {
    useToastStore.getState().hide();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createMock.mockResolvedValue(createdTransaction);
    useAuthStore.setState({
      status: 'signedIn',
      session: { user: { id: 'u1' } } as never,
      profile: null,
    });
    useTransactionStore.setState({ buckets: {}, periodBuckets: {} });
    useRecurringRuleStore.setState({ byLedger: {} });
    useSettingsStore.setState({ fontScale: DEFAULT_FONT_SCALE, currency: 'CNY' });
    useThemeStore.setState({ mode: 'light', systemScheme: 'light', scheme: 'light' });
  });

  it('「再记一笔」保存当前流水，并用上一笔日期打开新的记账页', async () => {
    renderScreen();

    fireEvent.press(screen.getByText('1'));
    fireEvent.press(screen.getByText('2'));
    fireEvent.press(screen.getByText('3'));
    fireEvent.press(screen.getByText('餐饮'));
    fireEvent.press(screen.getByText('再记一笔'));

    await waitFor(() => expect(createMock).toHaveBeenCalledTimes(1));
    expect(createMock.mock.calls[0][0]).toMatchObject({
      categoryId: 'c1',
      amount: 12300,
      occurredAt: INITIAL_DATE,
    });
    expect(navigation.replace).toHaveBeenCalledWith('AddTransaction', { initialDate: INITIAL_DATE });
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
