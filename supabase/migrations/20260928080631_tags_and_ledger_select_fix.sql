-- ============================================================================
-- 增量迁移：记账标签 + 账本 SELECT 策略修复
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（可重复执行）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. 修复「创建家庭 / 新建个人账本失败」：ledgers 的 SELECT 策略增加本行 owner_id 判断，
--      使 `INSERT ... RETURNING`（supabase-js `.insert().select()`）能返回新插入的账本行。
--   2. 新增 tags 表（账本 + 收支类型维度的可复用标签）及其 RLS 策略。
--   3. transactions 用 tag_id 取代 note（备注升级为标签），历史备注数据自动迁移为标签。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 账本 SELECT 策略修复
-- ----------------------------------------------------------------------------
-- can_access_ledger 是 stable security definer 函数，在同一条 INSERT 语句内看不到刚插入的行，
-- 因此 `INSERT ... RETURNING` 会被 SELECT 策略过滤成 0 行（PostgREST 返回 PGRST116），
-- 表现为账本已写入但客户端报「创建家庭账本失败 / 创建账本失败」。
drop policy if exists ledgers_select on public.ledgers;
create policy ledgers_select on public.ledgers for select
  using (owner_id = auth.uid() or public.can_access_ledger(id));

-- ----------------------------------------------------------------------------
-- 2. 标签表
-- ----------------------------------------------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),                     -- 标签 ID
  ledger_id  uuid        not null references public.ledgers (id) on delete cascade, -- 所属账本 ID
  kind       text        not null check (kind in ('expense', 'income')),      -- 类型：expense=支出，income=收入
  name       text        not null,                                            -- 标签名称（同账本同类型内唯一）
  created_at timestamptz not null default now(),                              -- 创建时间
  unique (ledger_id, kind, name)                                              -- 同账本同类型下标签名唯一，保证「复用」幂等
);

comment on table public.tags is '记账标签（属于账本，按收支类型区分，可在记账时复用）';
comment on column public.tags.id         is '标签 ID';
comment on column public.tags.ledger_id  is '所属账本 ID';
comment on column public.tags.kind       is '类型：expense=支出，income=收入';
comment on column public.tags.name       is '标签名称（同账本同类型内唯一）';
comment on column public.tags.created_at is '创建时间';

create index if not exists idx_tags_ledger on public.tags (ledger_id, kind, name);

alter table public.tags enable row level security;

drop policy if exists tags_select on public.tags;
create policy tags_select on public.tags for select
  using (public.can_access_ledger(ledger_id));

drop policy if exists tags_insert on public.tags;
create policy tags_insert on public.tags for insert
  with check (public.can_access_ledger(ledger_id));

drop policy if exists tags_update on public.tags;
create policy tags_update on public.tags for update
  using (public.can_access_ledger(ledger_id));

drop policy if exists tags_delete on public.tags;
create policy tags_delete on public.tags for delete
  using (public.can_access_ledger(ledger_id));

-- ----------------------------------------------------------------------------
-- 3. 流水：note -> tag_id（历史备注迁移为标签，不丢数据）
-- ----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists tag_id uuid references public.tags (id) on delete set null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'transactions' and column_name = 'note'
  ) then
    insert into public.tags (ledger_id, kind, name)
    select distinct t.ledger_id, t.kind, btrim(t.note)
    from public.transactions t
    where t.note is not null and btrim(t.note) <> ''
    on conflict (ledger_id, kind, name) do nothing;

    update public.transactions t
    set tag_id = g.id
    from public.tags g
    where t.note is not null and btrim(t.note) <> ''
      and g.ledger_id = t.ledger_id and g.kind = t.kind and g.name = btrim(t.note);

    alter table public.transactions drop column note;
  end if;
end $$;

comment on column public.transactions.tag_id is '标签 ID（可空；标签被删除后自动置空）';
