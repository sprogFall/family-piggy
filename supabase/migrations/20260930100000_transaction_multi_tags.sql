-- ============================================================================
-- 增量迁移：一笔流水支持多个标签
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. transactions 用 tag_ids uuid[] 取代单值 tag_id，并把历史 tag_id 回填进数组；
--   2. 新增校验触发器：tag_ids 中的标签必须属于当前账本和分类；
--   3. 新增标签删除清理触发器：删除标签时自动从所有流水的 tag_ids 中移除；
--   4. 增加 tag_ids 的 GIN 索引。
-- ============================================================================

alter table public.transactions
  add column if not exists tag_ids uuid[] not null default '{}';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'tag_id'
  ) then
    execute $sql$
      update public.transactions
      set tag_ids = array[tag_id]
      where tag_id is not null
        and tag_ids = '{}'::uuid[]
    $sql$;
    execute 'alter table public.transactions drop column tag_id';
  end if;
end $$;

create index if not exists idx_transactions_tag_ids on public.transactions using gin (tag_ids);

comment on column public.transactions.tag_ids is '标签 ID 数组（一笔可关联多个标签；标签删除时由触发器清理）';

create or replace function public.validate_transaction_tag_ids()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tag_ids is null then
    new.tag_ids := '{}'::uuid[];
  end if;

  if cardinality(new.tag_ids) > 0 and exists (
    select 1
    from unnest(new.tag_ids) as u(tag_id)
    where not exists (
      select 1
      from public.tags t
      where t.id = u.tag_id
        and t.ledger_id = new.ledger_id
        and t.category_id = new.category_id
    )
  ) then
    raise exception '标签不属于当前账本或分类';
  end if;

  return new;
end;
$$;

create or replace function public.remove_tag_from_transactions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.transactions
  set tag_ids = array_remove(tag_ids, old.id)
  where old.id = any(tag_ids);
  return old;
end;
$$;

drop trigger if exists trg_validate_transaction_tag_ids on public.transactions;
create trigger trg_validate_transaction_tag_ids
  before insert or update of tag_ids, ledger_id, category_id on public.transactions
  for each row execute function public.validate_transaction_tag_ids();

drop trigger if exists trg_remove_tag_from_transactions on public.tags;
create trigger trg_remove_tag_from_transactions
  after delete on public.tags
  for each row execute function public.remove_tag_from_transactions();
