import { supabase } from '@/lib/supabase';
import { createQueryChain, queryError } from '@/test/supabase-mock';

import { familyService } from './family.service';

const fromMock = supabase.from as unknown as jest.Mock;
const rpcMock = supabase.rpc as unknown as jest.Mock;

const familyRow = {
  id: 'f1',
  name: '幸福之家',
  owner_id: 'u1',
  invite_code: 'ABCD12EF',
  created_at: '2024-01-01T00:00:00Z',
};

const ledgerRow = {
  id: 'l1',
  name: '幸福之家',
  type: 'family',
  owner_id: 'u1',
  family_id: 'f1',
  created_at: '2024-01-01T00:00:00Z',
};

describe('familyService', () => {
  afterEach(() => {
    fromMock.mockReset();
    rpcMock.mockReset();
  });

  describe('createFamily', () => {
    it('依次创建家庭、成员、家庭账本', async () => {
      const chains: Record<string, any> = {
        families: createQueryChain({ data: familyRow, error: null }),
        family_members: createQueryChain({ data: null, error: null }),
        ledgers: createQueryChain({ data: ledgerRow, error: null }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);

      const result = await familyService.createFamily('幸福之家', 'u1');
      expect(chains.families.insert).toHaveBeenCalledWith({ name: '幸福之家', owner_id: 'u1' });
      expect(chains.family_members.insert).toHaveBeenCalledWith({
        family_id: 'f1',
        user_id: 'u1',
        role: 'owner',
      });
      expect(chains.ledgers.insert).toHaveBeenCalledWith({
        name: '幸福之家',
        type: 'family',
        owner_id: 'u1',
        family_id: 'f1',
      });
      expect(result.family.inviteCode).toBe('ABCD12EF');
      expect(result.ledgerId).toBe('l1');
    });

    it('家庭创建失败即抛错', async () => {
      fromMock.mockReturnValue(createQueryChain(queryError('boom')));
      await expect(familyService.createFamily('幸福之家', 'u1')).rejects.toThrow('创建家庭失败');
    });

    it('账本写入失败时回滚家庭，避免残留半成品数据', async () => {
      const ledgersChain = createQueryChain({ data: null, error: { message: 'boom' } });
      const chains: Record<string, any> = {
        families: createQueryChain({ data: familyRow, error: null }),
        family_members: createQueryChain({ data: null, error: null }),
        ledgers: ledgersChain,
      };
      fromMock.mockImplementation((table: string) => chains[table]);

      await expect(familyService.createFamily('幸福之家', 'u1')).rejects.toThrow('创建家庭账本失败');
      expect(chains.families.delete).toHaveBeenCalled();
      expect(chains.families.eq).toHaveBeenCalledWith('id', 'f1');
    });

    it('账本 ID 通过回读获取（新建账本不使用 INSERT ... RETURNING）', async () => {
      const chains: Record<string, any> = {
        families: createQueryChain({ data: familyRow, error: null }),
        family_members: createQueryChain({ data: null, error: null }),
        ledgers: createQueryChain({ data: ledgerRow, error: null }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);

      const result = await familyService.createFamily('幸福之家', 'u1');

      expect(chains.ledgers.insert).toHaveBeenCalledWith({
        name: '幸福之家',
        type: 'family',
        owner_id: 'u1',
        family_id: 'f1',
      });
      expect(chains.ledgers.select).toHaveBeenCalled();
      expect(chains.ledgers.eq).toHaveBeenCalledWith('family_id', 'f1');
      expect(result.ledgerId).toBe('l1');
    });
  });

  describe('joinFamily', () => {
    it('调用 RPC 并归一化邀请码', async () => {
      rpcMock.mockResolvedValue({ data: 'f1', error: null });
      const chains: Record<string, any> = {
        families: createQueryChain({ data: familyRow, error: null }),
        ledgers: createQueryChain({ data: ledgerRow, error: null }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);

      const result = await familyService.joinFamily(' ab-cd12ef ');
      expect(rpcMock).toHaveBeenCalledWith('join_family', { p_code: 'ABCD12EF' });
      expect(result.family.id).toBe('f1');
      expect(result.ledgerId).toBe('l1');
    });

    it('RPC 失败透传后端文案', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: '邀请码不存在' } });
      await expect(familyService.joinFamily('ZZZZ9999')).rejects.toThrow('邀请码不存在');
    });
  });

  describe('listFamilies', () => {
    it('单次嵌入查询取回我加入的家庭', async () => {
      const chain = createQueryChain({
        data: [
          { families: familyRow },
          { families: { ...familyRow, id: 'f2' } },
        ],
        error: null,
      });
      fromMock.mockReturnValue(chain);

      const families = await familyService.listFamilies('u1');

      // 启动关键路径：必须是 1 个请求，且不再调用 auth.getUser()
      expect(fromMock).toHaveBeenCalledTimes(1);
      expect(fromMock).toHaveBeenCalledWith('family_members');
      expect(chain.select).toHaveBeenCalledWith('families(*)');
      expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(families.map((family) => family.id)).toEqual(['f1', 'f2']);
      expect(families[0].inviteCode).toBe('ABCD12EF');
    });

    it('内嵌家庭被 RLS 过滤时跳过该行', async () => {
      fromMock.mockReturnValue(createQueryChain({ data: [{ families: null }], error: null }));

      await expect(familyService.listFamilies('u1')).resolves.toEqual([]);
    });

    it('查询失败抛出面向用户的文案', async () => {
      fromMock.mockReturnValue(createQueryChain(queryError('boom')));

      await expect(familyService.listFamilies('u1')).rejects.toThrow('加载家庭失败');
    });
  });

  describe('listMembers', () => {
    it('合并成员与昵称', async () => {
      const chains: Record<string, any> = {
        family_members: createQueryChain({
          data: [
            { family_id: 'f1', user_id: 'u1', role: 'owner', joined_at: '2024-01-01T00:00:00Z' },
            { family_id: 'f1', user_id: 'u2', role: 'member', joined_at: '2024-01-02T00:00:00Z' },
          ],
          error: null,
        }),
        profiles: createQueryChain({
          data: [
            { id: 'u1', nickname: '小明', avatar_url: null },
            { id: 'u2', nickname: '小红', avatar_url: null },
          ],
          error: null,
        }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);

      const members = await familyService.listMembers('f1');
      expect(members.map((m) => m.nickname)).toEqual(['小明', '小红']);
      expect(members[0].role).toBe('owner');
    });
  });

  describe('家庭管理', () => {
    it('renameFamily 调用 RPC', async () => {
      rpcMock.mockResolvedValue({ data: null, error: null });
      await familyService.renameFamily('f1', '新家庭名');
      expect(rpcMock).toHaveBeenCalledWith('rename_family', {
        p_family_id: 'f1',
        p_name: '新家庭名',
      });
    });

    it('renameFamily 失败透传后端文案', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: '只有家庭创建者可以修改家庭名称' } });
      await expect(familyService.renameFamily('f1', '新家庭名')).rejects.toThrow(
        '只有家庭创建者可以修改家庭名称',
      );
    });

    it('regenerateInviteCode 返回新邀请码', async () => {
      rpcMock.mockResolvedValue({ data: 'ABCD12EF', error: null });
      await expect(familyService.regenerateInviteCode('f1')).resolves.toBe('ABCD12EF');
      expect(rpcMock).toHaveBeenCalledWith('regenerate_family_invite_code', {
        p_family_id: 'f1',
      });
    });
  });

  describe('成员守卫', () => {
    it('创建者不能退出家庭', async () => {
      const chains: Record<string, any> = {
        families: createQueryChain({ data: familyRow, error: null }),
        family_members: createQueryChain({ data: null, error: null }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);
      await expect(familyService.leaveFamily('f1', 'u1')).rejects.toThrow('家庭创建者不能退出，可解散家庭');
    });

    it('普通成员可以退出', async () => {
      const chains: Record<string, any> = {
        families: createQueryChain({ data: { ...familyRow, owner_id: 'u2' }, error: null }),
        family_members: createQueryChain({ data: null, error: null }),
      };
      fromMock.mockImplementation((table: string) => chains[table]);
      await expect(familyService.leaveFamily('f1', 'u1')).resolves.toBeUndefined();
    });

    it('不能移除家庭创建者', async () => {
      await expect(familyService.removeMember('f1', 'u1', 'u1')).rejects.toThrow('不能移除家庭创建者');
    });

    it('创建者可移除其他成员', async () => {
      const chain = createQueryChain({ data: null, error: null });
      fromMock.mockReturnValue(chain);
      await familyService.removeMember('f1', 'u2', 'u1');
      expect(chain.delete).toHaveBeenCalled();
    });
  });
});
