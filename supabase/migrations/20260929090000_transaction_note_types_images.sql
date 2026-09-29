-- ============================================================================
-- 增量迁移：流水备注、记账类型扩展字段与账单图片
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，不必执行本文件。
--
-- 变更内容：
--   1. transactions 增加 note（本笔备注，与可复用标签分开）、
--      attributes（JSONB 记账类型扩展字段，当前支持 reimbursement: boolean）、
--      images（Supabase Storage 公开 URL 数组，每笔最多 3 张）。
--   2. 新增 transaction-images 公开存储桶及 RLS：所有人可读，仅本人可写自己目录。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 流水新增字段
-- ----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists note text not null default '';

alter table public.transactions
  add column if not exists attributes jsonb not null default '{}'::jsonb;

alter table public.transactions
  add column if not exists images text[] not null default '{}';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_images_max_3'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_images_max_3 check (cardinality(images) <= 3);
  end if;
end $$;

comment on column public.transactions.note is '本笔备注（与可复用标签分开，仅属于本笔、不可复用）';
comment on column public.transactions.attributes is '记账类型扩展字段（JSONB）：当前支持 reimbursement: boolean，后续新增类型无需改表';
comment on column public.transactions.images is '账单图片公开 URL 数组（Supabase Storage transaction-images 桶；每笔最多 3 张）';

-- ----------------------------------------------------------------------------
-- 2. 账单图片存储桶：公开读，仅本人可写自己目录（transaction-images/<uid>/...）
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('transaction-images', 'transaction-images', true)
on conflict (id) do nothing;

drop policy if exists transaction_images_public_read on storage.objects;
create policy transaction_images_public_read on storage.objects
  for select using (bucket_id = 'transaction-images');

drop policy if exists transaction_images_owner_insert on storage.objects;
create policy transaction_images_owner_insert on storage.objects
  for insert with check (
    bucket_id = 'transaction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists transaction_images_owner_update on storage.objects;
create policy transaction_images_owner_update on storage.objects
  for update using (
    bucket_id = 'transaction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists transaction_images_owner_delete on storage.objects;
create policy transaction_images_owner_delete on storage.objects
  for delete using (
    bucket_id = 'transaction-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
