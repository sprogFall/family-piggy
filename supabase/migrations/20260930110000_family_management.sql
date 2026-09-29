-- ============================================================================
-- 增量迁移：家庭管理支持改名与重置邀请码
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. rename_family：家庭创建者改家庭名，同步修改家庭账本名；
--   2. regenerate_family_invite_code：家庭创建者重新生成邀请码，避免邀请码滥用。
-- ============================================================================

create or replace function public.rename_family(p_family_id uuid, p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_name text := btrim(p_name);
begin
  if v_uid is null then
    raise exception '未登录';
  end if;
  if v_name is null or v_name = '' or length(v_name) > 12 then
    raise exception '家庭名称需 1-12 个字符';
  end if;
  if not exists (
    select 1 from public.families
    where id = p_family_id and owner_id = v_uid
  ) then
    raise exception '只有家庭创建者可以修改家庭名称';
  end if;

  update public.families set name = v_name where id = p_family_id;
  update public.ledgers set name = v_name where family_id = p_family_id;
end;
$$;

create or replace function public.regenerate_family_invite_code(p_family_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    raise exception '未登录';
  end if;
  if not exists (
    select 1 from public.families
    where id = p_family_id and owner_id = v_uid
  ) then
    raise exception '只有家庭创建者可以重新生成邀请码';
  end if;

  loop
    v_code := public.generate_invite_code();
    begin
      update public.families set invite_code = v_code where id = p_family_id;
      return v_code;
    exception when unique_violation then
      -- 碰撞时继续生成
    end;
  end loop;
end;
$$;
