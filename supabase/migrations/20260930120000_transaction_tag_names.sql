-- ============================================================================
-- 增量迁移：标签快照到流水
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. transactions 用 tag_names text[] 保存标签名快照，取代 tag_ids 关联；
--   2. 历史 tag_ids 按原顺序回填为 tag_names；
--   3. 删除「标签删除时清理流水 tag_ids」与「校验 tag_ids」相关触发器和函数；
--   4. 删除旧索引，新增 tag_names 的 GIN 索引。
-- ============================================================================

-- 先移除旧关联模型触发器 / 函数，避免回填时被旧校验拦截
drop trigger if exists trg_validate_transaction_tag_ids on public.transactions;
drop trigger if exists trg_remove_tag_from_transactions on public.tags;
drop function if exists public.validate_transaction_tag_ids();
drop function if exists public.remove_tag_from_transactions();

alter table public.transactions
  add column if not exists tag_names text[] not null default '{}';

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
      update public.transactions t
      set tag_names = coalesce(
        (
          select array_agg(g.name)
          from public.tags g
          where g.id = t.tag_id
        ),
        '{}'::text[]
      )
      where t.tag_id is not null
        and cardinality(t.tag_names) = 0
    $sql$;
    execute 'alter table public.transactions drop column tag_id';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'tag_ids'
  ) then
    execute $sql$
      update public.transactions t
      set tag_names = coalesce(
        (
          select array_agg(g.name order by array_position(t.tag_ids, g.id))
          from public.tags g
          where g.id = any(t.tag_ids)
        ),
        '{}'::text[]
      )
      where cardinality(t.tag_ids) > 0
        and cardinality(t.tag_names) = 0
    $sql$;
    execute 'alter table public.transactions drop column tag_ids';
  end if;
end $$;

drop index if exists public.idx_transactions_tag_ids;
create index if not exists idx_transactions_tag_names on public.transactions using gin (tag_names);

comment on column public.transactions.tag_names is '标签名快照数组（一笔可多个；标签库删除后不影响历史流水展示）';
