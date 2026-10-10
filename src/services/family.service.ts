import { supabase } from '@/lib/supabase';
import { normalizeInviteCode } from '@/domain/invite-code';
import type { Family, FamilyMember } from '@/types/domain';
import { toFamily, toLedger, type FamilyRow, type LedgerRow } from '@/types/db';
import type { ProfileRow } from '@/types/db';
import type { FamilyMemberRow } from '@/types/db';

export interface FamilyWithLedger {
  family: Family;
  ledgerId: string | null;
}

/** 家庭账本 ID 回读：一个家庭只有一个家庭账本（不使用 INSERT ... RETURNING，原因见 ledger.service） */
const findFamilyLedgerId = async (familyId: string): Promise<string | null> => {
  const { data: ledgerRow } = await supabase
    .from('ledgers')
    .select('*')
    .eq('family_id', familyId)
    .maybeSingle();
  return ledgerRow ? toLedger(ledgerRow as LedgerRow).id : null;
};

export const familyService = {
  /**
   * 创建家庭：家庭 + 创建者成员记录 + 家庭账本。
   *
   * 家庭账本写入不使用 `.insert().select()`（原因见 ledger.service.createLedger），
   * 插入后按 family_id 回读；任一步失败立即回滚家庭（级联删除成员与账本），
   * 避免「提示创建失败但我的家庭里已多出一个家庭」的半成品数据。
   */
  async createFamily(name: string, userId: string): Promise<FamilyWithLedger> {
    const { data: familyRow, error: familyError } = await supabase
      .from('families')
      .insert({ name, owner_id: userId })
      .select('*')
      .single();
    if (familyError || !familyRow) throw new Error('创建家庭失败');

    const family = toFamily(familyRow as FamilyRow);

    try {
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({ family_id: family.id, user_id: userId, role: 'owner' });
      if (memberError) throw new Error('创建家庭失败');

      const { error: ledgerError } = await supabase
        .from('ledgers')
        .insert({ name, type: 'family', owner_id: userId, family_id: family.id });
      if (ledgerError) throw new Error('创建家庭账本失败');
    } catch (error) {
      await supabase.from('families').delete().eq('id', family.id);
      throw error;
    }

    return { family, ledgerId: await findFamilyLedgerId(family.id) };
  },

  /** 凭邀请码加入家庭 */
  async joinFamily(code: string): Promise<FamilyWithLedger> {
    const { data: familyId, error } = await supabase.rpc('join_family', {
      p_code: normalizeInviteCode(code),
    });
    if (error) throw new Error(error.message);

    const { data: familyRow, error: familyError } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .maybeSingle();
    if (familyError || !familyRow) throw new Error('加载家庭信息失败');
    const family = toFamily(familyRow as FamilyRow);

    return { family, ledgerId: await findFamilyLedgerId(family.id) };
  },

  /**
   * 我加入的所有家庭（不含家庭账本 ID）。
   *
   * 启动关键路径上的请求：刻意用一次 PostgREST 内嵌查询同时取回成员关系与家庭，
   * 而不是 `auth.getUser()` + `family_members` + `families` + `ledgers` 四趟串行往返。
   * 家庭账本 ID 交给调用方用已加载的账本列表本地关联（见 ledger.store.load）。
   */
  async listFamilies(userId: string): Promise<Family[]> {
    const { data, error } = await supabase
      .from('family_members')
      .select('families(*)')
      .eq('user_id', userId);
    if (error) throw new Error('加载家庭失败');

    // 项目未接入类型生成：supabase-js 会把 to-one 内嵌关系推成数组，而运行时是对象
    const rows = (data ?? []) as unknown as { families: FamilyRow | null }[];
    // 内嵌的家庭行可能被 RLS 过滤为 null，跳过即可
    return rows
      .filter((row) => row.families !== null)
      .map((row) => toFamily(row.families as FamilyRow));
  },

  async listMembers(familyId: string): Promise<FamilyMember[]> {
    const { data: memberRows, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('family_id', familyId)
      .order('joined_at', { ascending: true });
    if (error) throw new Error('加载成员失败');

    const userIds = (memberRows as FamilyMemberRow[]).map((r) => r.user_id);
    const profilesById = new Map<string, ProfileRow>();
    if (userIds.length > 0) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url')
        .in('id', userIds);
      for (const row of (profileRows ?? []) as ProfileRow[]) profilesById.set(row.id, row);
    }

    return (memberRows as FamilyMemberRow[]).map((row) => ({
      familyId: row.family_id,
      userId: row.user_id,
      role: row.role === 'owner' ? ('owner' as const) : ('member' as const),
      nickname: profilesById.get(row.user_id)?.nickname ?? '成员',
      avatarUrl: profilesById.get(row.user_id)?.avatar_url ?? null,
      joinedAt: row.joined_at,
    }));
  },

  /** 家庭创建者修改家庭名称，RPC 内同步更新家庭账本名称 */
  async renameFamily(familyId: string, name: string): Promise<void> {
    const { error } = await supabase.rpc('rename_family', {
      p_family_id: familyId,
      p_name: name,
    });
    if (error) throw new Error(error.message);
  },

  /** 家庭创建者重新生成邀请码 */
  async regenerateInviteCode(familyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('regenerate_family_invite_code', {
      p_family_id: familyId,
    });
    if (error || !data) throw new Error(error?.message ?? '重新生成邀请码失败');
    return data as string;
  },

  async leaveFamily(familyId: string, userId: string): Promise<void> {
    const { data: familyRow } = await supabase
      .from('families')
      .select('*')
      .eq('id', familyId)
      .single();
    if (familyRow && (familyRow as FamilyRow).owner_id === userId) {
      throw new Error('家庭创建者不能退出，可解散家庭');
    }
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', userId);
    if (error) throw new Error('退出家庭失败');
  },

  async removeMember(familyId: string, targetUserId: string, ownerId: string): Promise<void> {
    if (targetUserId === ownerId) throw new Error('不能移除家庭创建者');
    const { error } = await supabase
      .from('family_members')
      .delete()
      .eq('family_id', familyId)
      .eq('user_id', targetUserId);
    if (error) throw new Error('移除成员失败');
  },

  async disbandFamily(familyId: string): Promise<void> {
    const { error } = await supabase.from('families').delete().eq('id', familyId);
    if (error) throw new Error('解散家庭失败');
  },
};
