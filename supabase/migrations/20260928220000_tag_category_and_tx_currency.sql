-- ============================================================================
-- 增量迁移：标签归属分类 + 流水币种
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. tags 由「按收支类型」改为「按分类」归属（kind -> category_id）；
--      历史标签依据「它被哪些分类的流水使用过」回填分类（用得最多的分类胜出，
--      次数相同取最近使用的那次）；从未被任何流水引用的历史标签直接删除。
--   2. transactions 增加 currency（币种，默认 CNY）。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 标签归属分类
-- ----------------------------------------------------------------------------
alter table public.tags
  add column if not exists category_id uuid references public.categories (id) on delete cascade;

-- 回填：标签在流水中最常出现的分类即其归属分类
with usage as (
  select t.tag_id, t.category_id, count(*) as uses, max(t.occurred_at) as last_used
  from public.transactions t
  where t.tag_id is not null
  group by t.tag_id, t.category_id
), best as (
  select distinct on (tag_id) tag_id, category_id
  from usage
  order by tag_id, uses desc, last_used desc
)
update public.tags g
set category_id = b.category_id
from best b
where g.id = b.tag_id and g.category_id is null;

-- 未被任何流水引用、也无从推断分类的标签删除（不触及任何流水数据）
delete from public.tags where category_id is null;

alter table public.tags alter column category_id set not null;

-- 旧的「账本 + 收支类型 + 名称」唯一约束与 kind 列一并废弃
alter table public.tags drop constraint if exists tags_ledger_id_kind_name_key;
alter table public.tags drop column if exists kind;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tags_ledger_id_category_id_name_key'
      and conrelid = 'public.tags'::regclass
  ) then
    alter table public.tags
      add constraint tags_ledger_id_category_id_name_key unique (ledger_id, category_id, name);
  end if;
end $$;

drop index if exists public.idx_tags_ledger;
create index if not exists idx_tags_ledger on public.tags (ledger_id, category_id, name);

comment on table public.tags is '记账标签（隶属于账本的某个分类，可在记账时复用）';
comment on column public.tags.category_id is '所属分类 ID（标签只在所属分类下展示与新增）';

-- ----------------------------------------------------------------------------
-- 2. 流水币种
-- ----------------------------------------------------------------------------
alter table public.transactions add column if not exists currency text not null default 'CNY';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_currency_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_currency_check
      check (currency in ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP'));
  end if;
end $$;

comment on column public.transactions.currency is '币种（默认 CNY；金额单位为该币种的最小单位）';
