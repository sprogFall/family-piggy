-- ============================================================================
-- 增量迁移：批量导入允许把记录人映射到同家庭成员
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. 新增 can_record_as_user(ledger_id, user_id) 辅助函数：当前用户可记为本人，
--      或家庭账本中可记为同家庭成员。
--   2. transactions 的 INSERT 策略改用该函数：家庭账本中可将导入记录映射到同一家庭
--      成员名下；个人账本仍只能记在当前用户名下。
-- ============================================================================

create or replace function public.can_record_as_user(p_ledger_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.ledgers l
    where l.id = p_ledger_id
      and (
        p_user_id = auth.uid()
        or (
          l.family_id is not null
          and exists (
            select 1 from public.family_members m
            where m.family_id = l.family_id and m.user_id = p_user_id
          )
        )
      )
  );
$$;

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert
  with check (
    public.can_access_ledger(ledger_id)
    and public.can_record_as_user(ledger_id, created_by)
  );
