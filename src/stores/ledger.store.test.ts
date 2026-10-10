jest.mock('@/services/ledger.service', () => ({
  ledgerService: {
    listLedgers: jest.fn(),
    createLedger: jest.fn(),
    updateName: jest.fn(),
    removeLedger: jest.fn(),
    updateBudget: jest.fn(),
  },
}));

jest.mock('@/services/family.service', () => ({
  familyService: {
    createFamily: jest.fn(),
    renameFamily: jest.fn(),
    regenerateInviteCode: jest.fn(),
    joinFamily: jest.fn(),
    listFamilies: jest.fn(),
    listMembers: jest.fn(),
    removeMember: jest.fn(),
    leaveFamily: jest.fn(),
    disbandFamily: jest.fn(),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { familyService } from '@/services/family.service';
import { ledgerService } from '@/services/ledger.service';
import { useAuthStore } from '@/stores/auth.store';
import type { Family, Ledger } from '@/types/domain';

import {
  activeLedgerStorageKey,
  ledgerSnapshotKey,
  selectActiveLedger,
  selectMembers,
  useLedgerStore,
} from './ledger.store';

const ledgerMock = ledgerService as jest.Mocked<typeof ledgerService>;
const familyMock = familyService as jest.Mocked<typeof familyService>;

const ledger = (id: string, overrides: Partial<Ledger> = {}): Ledger => ({
  id,
  name: `账本${id}`,
  type: 'personal',
  ownerId: 'u1',
  familyId: null,
  monthlyBudget: 0,
  createdAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

const family = (id: string): Family => ({
  id,
  name: `家庭${id}`,
  ownerId: 'u1',
  inviteCode: 'ABCD12EF',
  createdAt: '2024-01-01T00:00:00Z',
});

/** 重置 store 到干净的未加载状态（含快照归属账号） */
const resetStore = () => {
  useLedgerStore.setState({
    ownerId: null,
    status: 'idle',
    ledgers: [],
    families: [],
    activeLedgerId: null,
    members: {},
  });
};

describe('useLedgerStore', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAuthStore.setState({ status: 'signedIn', session: { user: { id: 'u1' } } as never, profile: null });
    resetStore();
  });

  it('load 用当前账号查询家庭，并把家庭账本 ID 本地关联出来', async () => {
    ledgerMock.listLedgers.mockResolvedValue([
      ledger('l1'),
      ledger('lf1', { type: 'family', familyId: 'f1' }),
    ]);
    familyMock.listFamilies.mockResolvedValue([family('f1'), family('f2')]);

    await useLedgerStore.getState().load();

    expect(familyMock.listFamilies).toHaveBeenCalledWith('u1');
    expect(useLedgerStore.getState().families).toEqual([
      { family: family('f1'), ledgerId: 'lf1' },
      { family: family('f2'), ledgerId: null },
    ]);
  });

  it('load 失败时不覆盖已有快照', async () => {
    await AsyncStorage.setItem(
      ledgerSnapshotKey('u1'),
      JSON.stringify({ ledgers: [ledger('l1')], families: [] }),
    );
    ledgerMock.listLedgers.mockRejectedValue(new Error('boom'));
    familyMock.listFamilies.mockResolvedValue([]);

    await expect(useLedgerStore.getState().load()).rejects.toThrow('加载账本失败');

    expect(JSON.parse((await AsyncStorage.getItem(ledgerSnapshotKey('u1'))) as string)).toEqual({
      ledgers: [ledger('l1')],
      families: [],
    });
  });

  it('hydrate 先用本地快照渲染，并恢复上次选中的账本', async () => {
    await AsyncStorage.setItem(
      ledgerSnapshotKey('u1'),
      JSON.stringify({
        ledgers: [ledger('l1'), ledger('l2')],
        families: [{ family: family('f1'), ledgerId: 'l2' }],
      }),
    );
    await AsyncStorage.setItem(activeLedgerStorageKey('u1'), 'l2');

    await useLedgerStore.getState().hydrate('u1');

    expect(useLedgerStore.getState().status).toBe('ready');
    expect(useLedgerStore.getState().ledgers.map((item) => item.id)).toEqual(['l1', 'l2']);
    expect(useLedgerStore.getState().activeLedgerId).toBe('l2');
    // 纯本地：不应触发任何网络请求
    expect(ledgerMock.listLedgers).not.toHaveBeenCalled();
  });

  it('hydrate 无快照时保持未加载状态（走原网络路径）', async () => {
    await useLedgerStore.getState().hydrate('u1');

    expect(useLedgerStore.getState().status).toBe('idle');
    expect(useLedgerStore.getState().ledgers).toEqual([]);
  });

  it('快照按账号隔离：不会读到其他账号的账本', async () => {
    await AsyncStorage.setItem(
      ledgerSnapshotKey('u2'),
      JSON.stringify({ ledgers: [ledger('l9')], families: [] }),
    );

    await useLedgerStore.getState().hydrate('u1');

    expect(useLedgerStore.getState().ledgers).toEqual([]);
  });

  it('hydrate 读取期间切换账号则丢弃过期快照', async () => {
    await AsyncStorage.setItem(
      ledgerSnapshotKey('u1'),
      JSON.stringify({ ledgers: [ledger('l1')], families: [] }),
    );

    const first = useLedgerStore.getState().hydrate('u1');
    const second = useLedgerStore.getState().hydrate('u2');
    await Promise.all([first, second]);

    expect(useLedgerStore.getState().ownerId).toBe('u2');
    expect(useLedgerStore.getState().ledgers).toEqual([]);
  });

  it('load 成功后写入快照，reset 清除本账号快照', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1')]);
    familyMock.listFamilies.mockResolvedValue([family('f1')]);

    await useLedgerStore.getState().load();
    const stored = await AsyncStorage.getItem(ledgerSnapshotKey('u1'));
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).ledgers[0].id).toBe('l1');

    useLedgerStore.getState().reset();
    await Promise.resolve();

    expect(await AsyncStorage.getItem(ledgerSnapshotKey('u1'))).toBeNull();
    expect(useLedgerStore.getState().ledgers).toEqual([]);
  });

  it('load 默认选中第一个账本', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().status).toBe('ready');
    expect(useLedgerStore.getState().activeLedgerId).toBe('l1');
  });

  it('load 读取持久化的上次选中账本', async () => {
    await AsyncStorage.setItem(activeLedgerStorageKey('u1'), 'l2');
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().activeLedgerId).toBe('l2');
  });

  it('load 忽略已不存在的持久化账本并回落第一个', async () => {
    await AsyncStorage.setItem(activeLedgerStorageKey('u1'), 'missing');
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().activeLedgerId).toBe('l1');
  });

  it('setActive 持久化当前账号的选择', async () => {
    useLedgerStore.getState().setActive('l2');

    expect(await AsyncStorage.getItem(activeLedgerStorageKey('u1'))).toBe('l2');
  });

  it('load 保留已选中的账本', async () => {
    useLedgerStore.setState({ activeLedgerId: 'l2' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listFamilies.mockResolvedValue([]);

    await useLedgerStore.getState().load();

    expect(useLedgerStore.getState().activeLedgerId).toBe('l2');
  });

  it('createFamily 后切换到家庭账本', async () => {
    familyMock.createFamily.mockResolvedValue({ family: {} as never, ledgerId: 'lf1' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('lf1', { type: 'family', familyId: 'f1' })]);
    familyMock.listFamilies.mockResolvedValue([family('f1')]);

    await useLedgerStore.getState().createFamily('幸福之家');

    expect(useLedgerStore.getState().activeLedgerId).toBe('lf1');
  });

  it('createPersonalLedger 落库并切换到新增的账本', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1')]);
    familyMock.listFamilies.mockResolvedValue([]);
    await useLedgerStore.getState().load();

    ledgerMock.createLedger.mockResolvedValue(undefined);
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2', { name: '旅行账本' })]);

    await useLedgerStore.getState().createPersonalLedger('旅行账本');

    expect(ledgerMock.createLedger).toHaveBeenCalledWith({
      name: '旅行账本',
      type: 'personal',
      ownerId: 'u1',
      familyId: null,
    });
    expect(useLedgerStore.getState().activeLedgerId).toBe('l2');
  });

  it('createPersonalLedger 失败时向上抛错（供 UI 提示）', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1')]);
    familyMock.listFamilies.mockResolvedValue([]);
    await useLedgerStore.getState().load();

    ledgerMock.createLedger.mockRejectedValue(new Error('创建账本失败'));
    await expect(useLedgerStore.getState().createPersonalLedger('旅行账本')).rejects.toThrow(
      '创建账本失败',
    );
    expect(useLedgerStore.getState().activeLedgerId).toBe('l1');
  });

  it('joinFamily 后切换到家庭账本', async () => {
    familyMock.joinFamily.mockResolvedValue({ family: {} as never, ledgerId: 'lf1' });
    ledgerMock.listLedgers.mockResolvedValue([ledger('lf1', { type: 'family', familyId: 'f1' })]);
    familyMock.listFamilies.mockResolvedValue([family('f1')]);

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

  it('selectMembers 未加载时返回稳定引用（zustand v5 快照稳定性）', () => {
    const state = useLedgerStore.getState();
    expect(selectMembers(state, 'f1')).toBe(selectMembers(state, 'f1'));
  });

  it('renameLedger 落库并同步本地账本名', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1')]);
    familyMock.listFamilies.mockResolvedValue([]);
    await useLedgerStore.getState().load();
    ledgerMock.updateName.mockResolvedValue(undefined);

    await useLedgerStore.getState().renameLedger('l1', '旅行账本');

    expect(ledgerMock.updateName).toHaveBeenCalledWith('l1', '旅行账本');
    expect(useLedgerStore.getState().ledgers[0].name).toBe('旅行账本');
  });

  it('removeLedger 删除后重新加载', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1'), ledger('l2')]);
    familyMock.listFamilies.mockResolvedValue([]);
    await useLedgerStore.getState().load();
    ledgerMock.removeLedger.mockResolvedValue(undefined);
    ledgerMock.listLedgers.mockResolvedValue([ledger('l2')]);

    await useLedgerStore.getState().removeLedger('l1');

    expect(ledgerMock.removeLedger).toHaveBeenCalledWith('l1');
    expect(useLedgerStore.getState().ledgers.map((item) => item.id)).toEqual(['l2']);
  });

  it('renameFamily 同步家庭与家庭账本名称', async () => {
    const family = {
      family: { id: 'f1', name: '旧家庭', ownerId: 'u1', inviteCode: 'AAAA1111', createdAt: '' },
      ledgerId: 'lf1',
    };
    useLedgerStore.setState({
      families: [family],
      ledgers: [ledger('lf1', { type: 'family', familyId: 'f1', name: '旧家庭' })],
    });
    familyMock.renameFamily.mockResolvedValue(undefined);

    await useLedgerStore.getState().renameFamily('f1', '新家庭');

    expect(familyMock.renameFamily).toHaveBeenCalledWith('f1', '新家庭');
    expect(useLedgerStore.getState().families[0].family.name).toBe('新家庭');
    expect(useLedgerStore.getState().ledgers[0].name).toBe('新家庭');
  });

  it('regenerateInviteCode 更新本地邀请码', async () => {
    useLedgerStore.setState({
      families: [
        {
          family: { id: 'f1', name: '家庭', ownerId: 'u1', inviteCode: 'OLDCODE1', createdAt: '' },
          ledgerId: 'lf1',
        },
      ],
    });
    familyMock.regenerateInviteCode.mockResolvedValue('NEWCODE1');

    await expect(useLedgerStore.getState().regenerateInviteCode('f1')).resolves.toBe('NEWCODE1');
    expect(useLedgerStore.getState().families[0].family.inviteCode).toBe('NEWCODE1');
  });

  it('setBudget 落库并同步本地账本', async () => {
    ledgerMock.listLedgers.mockResolvedValue([ledger('l1')]);
    familyMock.listFamilies.mockResolvedValue([]);
    await useLedgerStore.getState().load();

    await useLedgerStore.getState().setBudget('l1', 200000);

    expect(ledgerMock.updateBudget).toHaveBeenCalledWith('l1', 200000);
    expect(useLedgerStore.getState().ledgers[0].monthlyBudget).toBe(200000);
  });
});
