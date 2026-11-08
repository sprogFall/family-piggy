-- 个人备忘录按 owner_id 隔离，家庭备忘录由家庭成员共同维护。
create table if not exists public.memos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  content text not null check (length(trim(content)) > 0),
  importance text not null default 'medium' check (importance in ('high', 'medium', 'low')),
  is_completed boolean not null default false,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.memos is '个人及家庭共享备忘录';
comment on column public.memos.family_id is '空值代表个人，非空代表家庭';
comment on column public.memos.owner_id is '创建者；个人备忘录仅本人可访问';
comment on column public.memos.is_completed is '所有家庭成员共享的唯一完成状态';
comment on column public.memos.sort_order is '拖拽顺序；空值按优先级默认排序';
create index if not exists memos_family_idx on public.memos(family_id);
create index if not exists memos_personal_idx on public.memos(owner_id) where family_id is null;
alter table public.memos enable row level security;

drop policy if exists memos_select on public.memos;
create policy memos_select on public.memos for select to authenticated using (
  (family_id is null and owner_id = auth.uid()) or (family_id is not null and public.is_family_member(family_id))
);
drop policy if exists memos_insert on public.memos;
create policy memos_insert on public.memos for insert to authenticated with check (
  owner_id = auth.uid() and (family_id is null or public.is_family_member(family_id))
);
drop policy if exists memos_update on public.memos;
create policy memos_update on public.memos for update to authenticated using (
  (family_id is null and owner_id = auth.uid()) or (family_id is not null and public.is_family_member(family_id))
) with check (
  (family_id is null and owner_id = auth.uid()) or (family_id is not null and public.is_family_member(family_id))
);
drop policy if exists memos_delete on public.memos;
create policy memos_delete on public.memos for delete to authenticated using (
  (family_id is null and owner_id = auth.uid()) or (family_id is not null and public.is_family_member(family_id))
);

-- 删除账户时仅清理其个人条目，家庭条目保留并由外键清空创建者。
create or replace function public.delete_personal_memos_for_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.memos where family_id is null and owner_id = old.id;
  return old;
end $$;
drop trigger if exists delete_personal_memos_for_user on auth.users;
create trigger delete_personal_memos_for_user before delete on auth.users for each row execute function public.delete_personal_memos_for_user();

-- 禁止将条目转移到其他权限域；家庭成员仍可修改内容与共享完成状态。
create or replace function public.memo_before_update() returns trigger language plpgsql set search_path = public as $$
begin
  if new.family_id is distinct from old.family_id or (new.owner_id is distinct from old.owner_id and not (pg_trigger_depth() > 1 and old.family_id is not null and new.owner_id is null)) then
    raise exception '不能更改备忘录归属';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists memo_before_update on public.memos;
create trigger memo_before_update before update on public.memos for each row execute function public.memo_before_update();

-- 一次事务内校验全部 ID 并保存完整顺序，避免部分写入和跨权限域排序。
create or replace function public.reorder_memos(p_family_id uuid, p_ids uuid[]) returns void
language plpgsql security invoker set search_path = public as $$
declare v_count integer; v_updated integer;
begin
  if auth.uid() is null or (p_family_id is not null and not public.is_family_member(p_family_id)) then
    raise exception '无权排序';
  end if;
  perform pg_advisory_xact_lock(hashtext(coalesce(p_family_id::text, auth.uid()::text)));
  select count(*) into v_count from public.memos
    where (p_family_id is null and family_id is null and owner_id = auth.uid()) or (p_family_id is not null and family_id = p_family_id);
  if p_ids is null or cardinality(p_ids) <> v_count or
     (select count(distinct id) from unnest(p_ids) as ids(id)) <> v_count or
     (select count(*) from public.memos where id = any(p_ids) and
       ((p_family_id is null and family_id is null and owner_id = auth.uid()) or (p_family_id is not null and family_id = p_family_id))) <> v_count then
    raise exception '备忘录列表已变化';
  end if;
  update public.memos m set sort_order = ids.ord - 1
    from unnest(p_ids) with ordinality as ids(id, ord) where m.id = ids.id;
  get diagnostics v_updated = row_count;
  if v_updated <> v_count then raise exception '备忘录列表已变化'; end if;
end $$;
revoke all on function public.reorder_memos(uuid, uuid[]) from public;
grant execute on function public.reorder_memos(uuid, uuid[]) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'memos') then
    alter publication supabase_realtime add table public.memos;
  end if;
end $$;
