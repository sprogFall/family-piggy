jest.mock('@/services/ledger.service', () => ({
  ledgerService: {
    listLedgers: jest.fn(),
    createLedger: jest.fn(),
    removeLedger: jest.fn(),
  },
}));

jest.mock('@/services/family.service', () => ({
  familyService: {
    createFamily: jest.fn(),
    joinFamily: jest.fn(),
    listMyFamilies: jest.fn(),
    listMembers: jest.fn(),
    removeMember: jest.fn(),
    leaveFamily: jest.fn(),
    disbandFamily: jest.fn(),
  },
}));

import { familyService } from '@/services/family.service';
import { ledgerService } from '@/services/ledger.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Ledger } from '@/types/domain';

import { selectActiveLedger, useLedgerStore } from './ledger.store';

const ledgerMock = ledgerService as jest.Mocked<typeof ledgerService>;
const familyMock = familyService as jest.Mocked<typeof familyService>;

const ledger = (id: string, overrides: Partial<Ledger> = {}): Ledger => ({
  id,
  name: `账本${id}`,
  type: 'personal',
  ownerId: 'u1',
  familyId: null,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useLedgerStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ status: 'signedIn', session: { user: { id: 'u1' } } as never, profile: null });
    useLedgerStore.setState({
      status: 'idle',
      ledgers: [],
      families: [],
      activeLedgerId: null,
      members: {},
    });
  });

  it('load 默认选中第一个账本', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listMyFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().status).toBe('ready');
    expect(useLedgerStore.getState().activeLedgerId).toBe('l1');
  });

  it('load 保留已选中的账本', async () => {
    useLedgerStore.setState({ activeLedgerId: 'l2' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listMyFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().activeLedgerId).toBe('l2');
  });

  it('createFamily 后切换到家庭账本', async () => {
    familyMock.createFamily.mockResolvedValue({ family: {} as never, ledgerId: 'lf1' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('lf1', { type: 'family', familyId: 'f1' })]);
    familyMock.listMyFamilies.mockResolvedValue([
      { family: {} as never, ledgerId: 'lf1' },
    ]);

    await useLedgerStore.getState().createFamily('幸福之家');

    expect(useLedgerStore.getState().activeLedgerId).toBe('lf1');
  });

  it('joinFamily 后切换到家庭账本', async () => {
    familyMock.joinFamily.mockResolvedValue({ family: {} as never, ledgerId: 'lf1' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('lf1', { type: 'family', familyId: 'f1' })]);
    familyMock.listMyFamilies.mockResolvedValue([{ family: {} as never, ledgerId: 'lf1' }]);

    await useLedgerStore.getState().joinFamily('ABCD12EF');

    expect(familyMock.joinFamily).toHaveBeenCalledWith('ABCD12EF');
    expect(useLedgerStore.getState().activeLedgerId).toBe('lf1');
  });

  it('loadMembers 存入成员表', async () => {
    familyMock.listMembers.mockResolvedValue([
      { familyId: 'f1', userId: 'u1', role: 'owner', nickname: '小明', avatarUrl: null, joinedAt: '' },
    ]);
    await useLedgerStore.getState().loadMembers('f1');
    expect(useLedgerStore.getState().members.f1).toHaveLength(1);
  });

  it('selectActiveLedger 兜底第一个账本', () => {
    const state = useLedgerStore.getState();
    expect(selectActiveLedger({ ...state, ledgers: [ledger('l1')], activeLedgerId: null })).toEqual(ledger('l1'));
    expect(selectActiveLedger({ ...state, ledgers: [], activeLedgerId: null })).toBeNull();
  });
});
