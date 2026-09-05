-- ============================================================================
-- family-piggy Supabase 初始化脚本（可重复执行）
-- 用法：在 Supabase Dashboard -> SQL Editor 中整体执行一次
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 基础表
-- ----------------------------------------------------------------------------

-- 用户资料（注册触发器自动创建）
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nickname    text        not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 家庭
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  owner_id    uuid        not null references auth.users (id) on delete cascade,
  invite_code text        not null unique,
  created_at  timestamptz not null default now()
);

-- 家庭成员
create table if not exists public.family_members (
  family_id uuid        not null references public.families (id) on delete cascade,
  user_id   uuid        not null references auth.users (id) on delete cascade,
  role      text        not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- 账本（personal: family_id 为空；family: family_id 必填）
create table if not exists public.ledgers (
  id         uuid primary key default gen_random_uuid(),
  name       text        not null,
  type       text        not null check (type in ('personal', 'family')),
  owner_id   uuid        not null references auth.users (id) on delete cascade,
  family_id  uuid        references public.families (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 分类（属于账本；新账本创建时由触发器播种默认分类）
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  ledger_id  uuid        not null references public.ledgers (id) on delete cascade,
  name       text        not null,
  icon       text        not null default 'ellipsis-horizontal',
  kind       text        not null check (kind in ('expense', 'income')),
  sort_order int         not null default 0,
  created_at timestamptz not null default now()
);

-- 流水（amount 单位：分，正整数）
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),
  ledger_id   uuid        not null references public.ledgers (id) on delete cascade,
  category_id uuid        not null references public.categories (id),
  kind        text        not null check (kind in ('expense', 'income')),
  amount      bigint      not null check (amount > 0),
  note        text,
  occurred_at timestamptz not null default now(),
  created_by  uuid        not null references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_transactions_ledger_time on public.transactions (ledger_id, occurred_at desc);
create index if not exists idx_categories_ledger on public.categories (ledger_id, kind, sort_order);
create index if not exists idx_family_members_user on public.family_members (user_id);

-- ----------------------------------------------------------------------------
-- 邀请码
-- ----------------------------------------------------------------------------

create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), ''
  ) from generate_series(1, 8);
$$;

alter table public.families
  alter column invite_code set default public.generate_invite_code();

-- ----------------------------------------------------------------------------
-- 工具函数
-- ----------------------------------------------------------------------------

-- 当前用户是否可访问某账本（本人个人账本 / 所在家庭的账本）
create or replace function public.can_access_ledger(p_ledger_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.ledgers l
    where l.id = p_ledger_id
      and (
        l.owner_id = auth.uid()
        or (
          l.family_id is not null
          and exists (
            select 1 from public.family_members m
            where m.family_id = l.family_id and m.user_id = auth.uid()
          )
        )
      )
  );
$$;

-- 更新 updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_transactions on public.transactions;
create trigger trg_touch_transactions
  before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 默认分类播种（每个新账本自动注入）
-- ----------------------------------------------------------------------------

create or replace function public.seed_default_categories(p_ledger_id uuid)
returns void
language sql
security definer
as $$
  insert into public.categories (ledger_id, name, icon, kind, sort_order) values
    (p_ledger_id, '餐饮', 'restaurant',          'expense', 1),
    (p_ledger_id, '交通', 'car',                 'expense', 2),
    (p_ledger_id, '购物', 'cart',                'expense', 3),
    (p_ledger_id, '居住', 'home',                'expense', 4),
    (p_ledger_id, '日用', 'cube',                'expense', 5),
    (p_ledger_id, '娱乐', 'game-controller',     'expense', 6),
    (p_ledger_id, '医疗', 'medkit',              'expense', 7),
    (p_ledger_id, '通讯', 'call',                'expense', 8),
    (p_ledger_id, '其他', 'ellipsis-horizontal', 'expense', 9),
    (p_ledger_id, '工资', 'cash',                'income',  1),
    (p_ledger_id, '奖金', 'gift',                'income',  2),
    (p_ledger_id, '兼职', 'briefcase',           'income',  3),
    (p_ledger_id, '理财', 'trending-up',         'income',  4),
    (p_ledger_id, '红包', 'wallet',              'income',  5),
    (p_ledger_id, '报销', 'receipt',             'income',  6),
    (p_ledger_id, '礼金', 'heart',               'income',  7),
    (p_ledger_id, '其他', 'ellipsis-horizontal', 'income',  8);
$$;

-- 新账本 -> 播种默认分类
create or replace function public.handle_ledger_created()
returns trigger
language plpgsql
security definer
as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

drop trigger if exists trg_ledger_created on public.ledgers;
create trigger trg_ledger_created
  after insert on public.ledgers
  for each row execute function public.handle_ledger_created();

-- ----------------------------------------------------------------------------
-- 新用户初始化：profile + 默认个人账本（触发器再播种分类）
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, nickname)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nickname', split_part(new.email, '@', 1))
  );

  insert into public.ledgers (name, type, owner_id)
  values ('个人账本', 'personal', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 加入家庭（凭邀请码，绕过 RLS 校验邀请码有效性）
-- ----------------------------------------------------------------------------

create or replace function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
as $$
declare
  v_family_id uuid;
  v_uid       uuid := auth.uid();
begin
  if v_uid is null then
    raise exception '未登录';
  end if;

  select id into v_family_id
  from public.families
  where invite_code = upper(trim(p_code));

  if v_family_id is null then
    raise exception '邀请码不存在';
  end if;

  if exists (
    select 1 from public.family_members
    where family_id = v_family_id and user_id = v_uid
  ) then
    raise exception '你已在该家庭中';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (v_family_id, v_uid, 'member');

  return v_family_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS 策略
-- ----------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.families        enable row level security;
alter table public.family_members  enable row level security;
alter table public.ledgers         enable row level security;
alter table public.categories      enable row level security;
alter table public.transactions    enable row level security;

-- profiles：本人可读写；同家庭成员可读
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.family_members mine
      join public.family_members theirs on mine.family_id = theirs.family_id
      where mine.user_id = auth.uid() and theirs.user_id = profiles.id
    )
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid());

-- families：成员可读，创建者可写
drop policy if exists families_select on public.families;
create policy families_select on public.families for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.family_members m
      where m.family_id = families.id and m.user_id = auth.uid()
    )
  );

drop policy if exists families_insert on public.families;
create policy families_insert on public.families for insert
  with check (owner_id = auth.uid());

drop policy if exists families_update on public.families;
create policy families_update on public.families for update
  using (owner_id = auth.uid());

drop policy if exists families_delete on public.families;
create policy families_delete on public.families for delete
  using (owner_id = auth.uid());

-- family_members：本人及同家庭者可读；可加入/退出；家庭创建者可移除成员
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.family_members m
      where m.family_id = family_members.family_id and m.user_id = auth.uid()
    )
  );

drop policy if exists family_members_insert on public.family_members;
create policy family_members_insert on public.family_members for insert
  with check (user_id = auth.uid());

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.families f
      where f.id = family_members.family_id and f.owner_id = auth.uid()
    )
  );

-- ledgers：可见即可读，本人可写
drop policy if exists ledgers_select on public.ledgers;
create policy ledgers_select on public.ledgers for select
  using (public.can_access_ledger(id));

drop policy if exists ledgers_insert on public.ledgers;
create policy ledgers_insert on public.ledgers for insert
  with check (owner_id = auth.uid());

drop policy if exists ledgers_update on public.ledgers;
create policy ledgers_update on public.ledgers for update
  using (owner_id = auth.uid());

drop policy if exists ledgers_delete on public.ledgers;
create policy ledgers_delete on public.ledgers for delete
  using (owner_id = auth.uid());

-- categories：可见账本内全员可读写
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories for select
  using (public.can_access_ledger(ledger_id));

drop policy if exists categories_insert on public.categories;
create policy categories_insert on public.categories for insert
  with check (public.can_access_ledger(ledger_id));

drop policy if exists categories_update on public.categories;
create policy categories_update on public.categories for update
  using (public.can_access_ledger(ledger_id));

drop policy if exists categories_delete on public.categories;
create policy categories_delete on public.categories for delete
  using (public.can_access_ledger(ledger_id));

-- transactions：可见账本内可读可记；仅创建者或账本创建者可改删
drop policy if exists transactions_select on public.transactions;
create policy transactions_select on public.transactions for select
  using (public.can_access_ledger(ledger_id));

drop policy if exists transactions_insert on public.transactions;
create policy transactions_insert on public.transactions for insert
  with check (created_by = auth.uid() and public.can_access_ledger(ledger_id));

drop policy if exists transactions_update on public.transactions;
create policy transactions_update on public.transactions for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.ledgers l
      where l.id = transactions.ledger_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists transactions_delete on public.transactions;
create policy transactions_delete on public.transactions for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.ledgers l
      where l.id = transactions.ledger_id and l.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Realtime：流水实时同步
-- ----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'transactions'
  ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 预算与头像（v0.2 增量，可重复执行）
-- ----------------------------------------------------------------------------

-- 账本月度预算（单位：分，0 表示未设置）
alter table public.ledgers
  add column if not exists monthly_budget bigint not null default 0;

-- 头像存储桶：公开读，仅本人可写自己目录（avatars/<uid>/...）
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_insert on storage.objects;
create policy avatars_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
