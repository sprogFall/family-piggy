-- ============================================================================
-- family-piggy Supabase 初始化脚本（幂等版，可重复执行）
--
-- 用法：在 Supabase Dashboard -> SQL Editor 中整体执行，可重复执行。
-- 注释说明：
--   * 列定义后的 `--` 行内注释：仅供阅读本 SQL 文件（不会写入数据库）；
--   * 每张表后的 COMMENT ON：写入数据库元数据（Dashboard / 数据库工具可见）。
-- 上线后的结构变更请另建增量迁移脚本（supabase/migrations/）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 扩展
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 2. 前置函数（建表依赖：邀请码默认值）
-- ----------------------------------------------------------------------------

-- 生成 8 位邀请码（剔除易混淆字符 0/1/I/O）
create or replace function public.generate_invite_code()
returns text
language sql
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', ceil(random() * 32)::int, 1), ''
  ) from generate_series(1, 8);
$$;

-- ----------------------------------------------------------------------------
-- 3. 表结构（行内注释仅供阅读文件；元数据注释紧跟各表之后）
-- ----------------------------------------------------------------------------

-- 用户资料（注册触发器自动创建）
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade, -- 用户 ID，关联 auth.users
  nickname    text        not null,                                          -- 昵称
  avatar_url  text,                                                          -- 头像 URL（公开访问地址，未设置为 NULL）
  created_at  timestamptz not null default now(),                            -- 创建时间
  updated_at  timestamptz not null default now()                             -- 更新时间
);

comment on table public.profiles is '用户资料（注册成功后由触发器自动创建）';
comment on column public.profiles.id         is '用户 ID，关联 auth.users';
comment on column public.profiles.nickname   is '昵称';
comment on column public.profiles.avatar_url is '头像 URL（Supabase Storage 公开访问地址，未设置时为 NULL）';
comment on column public.profiles.created_at is '创建时间';
comment on column public.profiles.updated_at is '更新时间';

-- 家庭
create table if not exists public.families (
  id          uuid primary key default gen_random_uuid(),                    -- 家庭 ID
  name        text        not null,                                          -- 家庭名称
  owner_id    uuid        not null references auth.users (id) on delete cascade, -- 家庭创建者用户 ID
  invite_code text        not null unique default public.generate_invite_code(), -- 8 位邀请码（剔除 0/1/I/O）
  created_at  timestamptz not null default now()                             -- 创建时间
);

comment on table public.families is '家庭（多人共同记账的分组）';
comment on column public.families.id          is '家庭 ID';
comment on column public.families.name        is '家庭名称';
comment on column public.families.owner_id    is '家庭创建者用户 ID';
comment on column public.families.invite_code is '8 位邀请码（他人凭此加入家庭，已剔除易混淆的 0/1/I/O 字符）';
comment on column public.families.created_at  is '创建时间';

-- 家庭成员
create table if not exists public.family_members (
  family_id uuid        not null references public.families (id) on delete cascade, -- 家庭 ID
  user_id   uuid        not null references auth.users (id) on delete cascade,      -- 成员用户 ID
  role      text        not null default 'member' check (role in ('owner', 'member')), -- 角色：owner=创建者，member=普通成员
  joined_at timestamptz not null default now()                                     -- 加入时间
);

comment on table public.family_members is '家庭成员关系（家庭-用户 多对多）';
comment on column public.family_members.family_id is '家庭 ID';
comment on column public.family_members.user_id   is '成员用户 ID';
comment on column public.family_members.role      is '角色：owner=创建者，member=普通成员';
comment on column public.family_members.joined_at is '加入时间';

-- 账本（personal：family_id 为空；family：family_id 必填）
create table if not exists public.ledgers (
  id             uuid primary key default gen_random_uuid(),                 -- 账本 ID
  name           text        not null,                                       -- 账本名称
  type           text        not null check (type in ('personal', 'family')),-- 类型：personal=个人，family=家庭
  owner_id       uuid        not null references auth.users (id) on delete cascade, -- 创建者用户 ID
  family_id      uuid        references public.families (id) on delete cascade, -- 所属家庭 ID（个人账本为 NULL）
  monthly_budget bigint      not null default 0,                             -- 月度预算（单位：分，0 表示未设置）
  created_at     timestamptz not null default now()                          -- 创建时间
);

comment on table public.ledgers is '账本（个人账本 / 家庭账本）';
comment on column public.ledgers.id             is '账本 ID';
comment on column public.ledgers.name           is '账本名称';
comment on column public.ledgers.type           is '账本类型：personal=个人，family=家庭';
comment on column public.ledgers.owner_id       is '创建者用户 ID';
comment on column public.ledgers.family_id      is '所属家庭 ID（个人账本为 NULL）';
comment on column public.ledgers.monthly_budget is '月度预算（单位：分，0 表示未设置）';
comment on column public.ledgers.created_at     is '创建时间';

-- 分类（属于账本，新建账本时由触发器播种默认分类）
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),                     -- 分类 ID
  ledger_id  uuid        not null references public.ledgers (id) on delete cascade, -- 所属账本 ID
  name       text        not null,                                           -- 分类名称
  icon       text        not null default 'ellipsis-horizontal',             -- 图标 key（App 内映射为 Ionicons 图标与配色）
  kind       text        not null check (kind in ('expense', 'income')),     -- 类型：expense=支出，income=收入
  sort_order int         not null default 0,                                 -- 排序序号（同类型内升序展示）
  created_at timestamptz not null default now()                              -- 创建时间
);

comment on table public.categories is '记账分类（属于账本，账本创建时自动播种默认分类）';
comment on column public.categories.id         is '分类 ID';
comment on column public.categories.ledger_id  is '所属账本 ID';
comment on column public.categories.name       is '分类名称';
comment on column public.categories.icon       is '图标 key（App 内映射为 Ionicons 图标与配色）';
comment on column public.categories.kind       is '分类类型：expense=支出，income=收入';
comment on column public.categories.sort_order is '排序序号（同类型内升序展示）';
comment on column public.categories.created_at is '创建时间';

-- 标签（属于账本且区分收支类型；记账时随流水一并记录，下次可直接复用）
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

-- 流水（amount 单位：分，正整数）
create table if not exists public.transactions (
  id          uuid primary key default gen_random_uuid(),                    -- 流水 ID
  ledger_id   uuid        not null references public.ledgers (id) on delete cascade, -- 所属账本 ID
  category_id uuid        not null references public.categories (id),        -- 分类 ID
  kind        text        not null check (kind in ('expense', 'income')),    -- 类型：expense=支出，income=收入
  amount      bigint      not null check (amount > 0),                       -- 金额（单位：分，正整数，避免浮点误差）
  tag_id      uuid        references public.tags (id) on delete set null,    -- 标签 ID（可空；标签被删除后自动置空）
  occurred_at timestamptz not null default now(),                            -- 发生时间
  created_by  uuid        not null references auth.users (id),               -- 记录人用户 ID（家庭账本中可区分谁记的）
  created_at  timestamptz not null default now(),                            -- 创建时间
  updated_at  timestamptz not null default now()                             -- 更新时间
);

-- 历史库升级（旧版本用 note 存备注）：按「账本 + 类型 + 备注」建标签 → 回填 tag_id → 删除 note 列
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

create index if not exists idx_transactions_ledger_time on public.transactions (ledger_id, occurred_at desc);
create index if not exists idx_categories_ledger on public.categories (ledger_id, kind, sort_order);
create index if not exists idx_tags_ledger on public.tags (ledger_id, kind, name);
create index if not exists idx_family_members_user on public.family_members (user_id);

comment on table public.transactions is '收支流水';
comment on column public.transactions.id          is '流水 ID';
comment on column public.transactions.ledger_id   is '所属账本 ID';
comment on column public.transactions.category_id is '分类 ID';
comment on column public.transactions.kind        is '类型：expense=支出，income=收入';
comment on column public.transactions.amount      is '金额（单位：分，正整数，避免浮点误差）';
comment on column public.transactions.tag_id      is '标签 ID（可空；标签被删除后自动置空）';
comment on column public.transactions.occurred_at is '发生时间';
comment on column public.transactions.created_by  is '记录人用户 ID（家庭账本中可区分谁记的）';
comment on column public.transactions.created_at  is '创建时间';
comment on column public.transactions.updated_at  is '更新时间';

-- ----------------------------------------------------------------------------
-- 4. 函数与触发器
-- ----------------------------------------------------------------------------

-- 当前用户是否可访问某账本（本人个人账本 / 所在家庭的账本），RLS 策略复用
create or replace function public.can_access_ledger(p_ledger_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
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

-- 当前用户是否为某家庭的成员（security definer 绕过 RLS，避免策略相互递归导致 500）
create or replace function public.is_family_member(p_family_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = auth.uid()
  );
$$;

-- 当前用户是否为某家庭的创建者（security definer 绕过 RLS，避免策略相互递归导致 500）
create or replace function public.is_family_owner(p_family_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.families
    where id = p_family_id and owner_id = auth.uid()
  );
$$;

-- 当前用户与目标用户是否同属一个家庭（security definer 绕过 RLS，避免策略相互递归导致 500）
create or replace function public.shares_family(p_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members mine
    join public.family_members theirs on mine.family_id = theirs.family_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

-- 更新 updated_at 通用触发器
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

-- 为新账本播种默认分类（与 App 内 src/domain 默认分类一致）
create or replace function public.seed_default_categories(p_ledger_id uuid)
returns void
language sql
security definer
set search_path = public
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

-- 新账本创建后自动播种默认分类
create or replace function public.handle_ledger_created()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- 新用户注册：创建资料 + 默认个人账本（账本触发器再播种分类）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- 凭邀请码加入家庭（security definer 绕过 RLS 校验邀请码有效性）
create or replace function public.join_family(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
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
-- 5. 行级安全（RLS）
-- ----------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.families        enable row level security;
alter table public.family_members  enable row level security;
alter table public.ledgers         enable row level security;
alter table public.categories      enable row level security;
alter table public.tags            enable row level security;
alter table public.transactions    enable row level security;

-- 用户资料：本人可读写；同家庭成员可读
-- 注意：策略内严禁直接/间接查询本表或互相引用的表（会触发 42P17 无限递归，PostgREST 返回 500），
--       跨表判断一律走 security definer 辅助函数（shares_family / is_family_member / is_family_owner）。
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.shares_family(profiles.id)
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid());

-- 家庭：成员可读，创建者可写
drop policy if exists families_select on public.families;
create policy families_select on public.families for select
  using (
    owner_id = auth.uid()
    or public.is_family_member(families.id)
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

-- 家庭成员：本人及所在家庭全员可读；可加入/退出；家庭创建者可移除成员
drop policy if exists family_members_select on public.family_members;
create policy family_members_select on public.family_members for select
  using (
    user_id = auth.uid()
    or public.is_family_member(family_members.family_id)
  );

drop policy if exists family_members_insert on public.family_members;
create policy family_members_insert on public.family_members for insert
  with check (user_id = auth.uid());

drop policy if exists family_members_delete on public.family_members;
create policy family_members_delete on public.family_members for delete
  using (
    user_id = auth.uid()
    or public.is_family_owner(family_members.family_id)
  );

-- 账本：可见即可读，本人可写
-- 注意：`owner_id = auth.uid()` 这一支不可省略。`INSERT ... RETURNING`（supabase-js 的
--       `.insert().select()`）会用 SELECT 策略过滤返回行，而 `can_access_ledger` 是 stable
--       security definer 函数，在同一条语句内看不到本语句刚插入的行，导致插入成功却返回 0 行
--       （PostgREST 报 PGRST116），表现为「创建家庭/账本失败」。直接比较本行 owner_id 不查表，
--       可让 RETURNING 正常返回。
drop policy if exists ledgers_select on public.ledgers;
create policy ledgers_select on public.ledgers for select
  using (owner_id = auth.uid() or public.can_access_ledger(id));

drop policy if exists ledgers_insert on public.ledgers;
create policy ledgers_insert on public.ledgers for insert
  with check (owner_id = auth.uid());

drop policy if exists ledgers_update on public.ledgers;
create policy ledgers_update on public.ledgers for update
  using (owner_id = auth.uid());

drop policy if exists ledgers_delete on public.ledgers;
create policy ledgers_delete on public.ledgers for delete
  using (owner_id = auth.uid());

-- 分类：可见账本内全员可读写
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

-- 标签：可见账本内全员可读写；插入需账本可访问（ledger_id 为已存在账本，RETURNING 可正常返回）
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

-- 流水：可见账本内可读可记；仅创建者或账本创建者可改删
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
-- 6. Realtime：流水实时同步
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
-- 7. 头像存储桶：公开读，仅本人可写自己目录（avatars/<uid>/...）
-- ----------------------------------------------------------------------------
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
