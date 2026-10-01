-- ============================================================================
-- 增量迁移：定时记账
--
-- 适用：已按旧版 supabase/schema.sql 初始化过的线上库（**可重复执行**）。
-- 全新初始化直接执行 supabase/schema.sql 即可，但 schema.sql 也会包含本功能。
--
-- 变更内容：
--   1. 新增 recurring_rules 定时记账规则表（RLS / 索引 / 注释）；
--   2. transactions 增加 recurring_rule_id，并建立防重复生成的唯一约束；
--   3. 新增下一期日期计算函数与到期生成交易函数；
--   4. 尝试启用 pg_cron 并创建每小时调度任务。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 定时记账规则表
-- ----------------------------------------------------------------------------
create table if not exists public.recurring_rules (
  id           uuid primary key default gen_random_uuid(),
  ledger_id    uuid        not null references public.ledgers (id) on delete cascade,
  category_id  uuid        not null references public.categories (id) on delete cascade,
  kind         text        not null check (kind in ('expense', 'income')),
  amount       bigint      not null check (amount > 0),
  currency     text        not null default 'CNY'
                           check (currency in ('CNY', 'USD', 'EUR', 'JPY', 'HKD', 'GBP')),
  tag_names    text[]      not null default '{}',
  note         text        not null default '',
  attributes   jsonb       not null default '{}'::jsonb,
  images       text[]      not null default '{}',
  frequency    text        not null check (frequency in ('monthly', 'weekly')),
  monthly_day  smallint,
  weekly_day   smallint,
  time_zone    text        not null default 'Asia/Shanghai',
  next_run_on  date        not null,
  is_active    boolean     not null default true,
  created_by   uuid        not null references auth.users (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint recurring_rules_schedule_check check (
    (frequency = 'monthly' and monthly_day is not null and monthly_day between 1 and 31 and weekly_day is null)
    or
    (frequency = 'weekly' and weekly_day is not null and weekly_day between 0 and 6 and monthly_day is null)
  ),
  constraint recurring_rules_images_max_3 check (cardinality(images) <= 3)
);

create index if not exists idx_recurring_rules_ledger on public.recurring_rules (ledger_id, created_at desc);
create index if not exists idx_recurring_rules_due on public.recurring_rules (next_run_on) where is_active;

comment on table public.recurring_rules is '定时记账规则：到期后由 Supabase Cron 生成真实流水，本身不计入账本记录';
comment on column public.recurring_rules.id           is '规则 ID';
comment on column public.recurring_rules.ledger_id    is '所属账本 ID';
comment on column public.recurring_rules.category_id  is '生成流水使用的分类 ID';
comment on column public.recurring_rules.kind         is '类型：expense=支出，income=收入';
comment on column public.recurring_rules.amount       is '金额（该币种最小单位的整数，避免浮点误差）';
comment on column public.recurring_rules.currency     is '币种（默认 CNY）';
comment on column public.recurring_rules.tag_names    is '生成流水时写入的标签名快照';
comment on column public.recurring_rules.note         is '生成流水时写入的备注';
comment on column public.recurring_rules.attributes   is '记账类型扩展字段 JSONB（与 transactions.attributes 一致）';
comment on column public.recurring_rules.images       is '生成流水时写入的账单图片 URL 数组（最多 3 张）';
comment on column public.recurring_rules.frequency    is '频率：monthly=每月，weekly=每周';
comment on column public.recurring_rules.monthly_day  is '每月几号（monthly 时必填，1-31）';
comment on column public.recurring_rules.weekly_day   is '每周周几（weekly 时必填，0=周日，6=周六）';
comment on column public.recurring_rules.time_zone    is '用户本地 IANA 时区，如 Asia/Shanghai';
comment on column public.recurring_rules.next_run_on  is '下一次生成日期（本地日期）';
comment on column public.recurring_rules.is_active    is '是否启用';
comment on column public.recurring_rules.created_by   is '创建人用户 ID';
comment on column public.recurring_rules.created_at   is '创建时间';
comment on column public.recurring_rules.updated_at   is '更新时间';

-- ----------------------------------------------------------------------------
-- 2. 流水关联与防重唯一约束
-- ----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists recurring_rule_id uuid references public.recurring_rules (id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_occurrence_uniq'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_recurring_occurrence_uniq unique (recurring_rule_id, occurred_at);
  end if;
end $$;

comment on column public.transactions.recurring_rule_id is '定时记账生成的真实流水来源规则；手动记账为 NULL';

-- ----------------------------------------------------------------------------
-- 3. 规则更新时间触发器
-- ----------------------------------------------------------------------------
drop trigger if exists trg_touch_recurring_rules on public.recurring_rules;
create trigger trg_touch_recurring_rules
  before update on public.recurring_rules
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. 到期生成函数
-- ----------------------------------------------------------------------------

-- 防御非法 / 空时区：取不到有效时区时回落到 Asia/Shanghai
create or replace function public.safe_time_zone(p_time_zone text)
returns text
language plpgsql
immutable
as $$
begin
  perform (timestamp '2000-01-01' at time zone coalesce(nullif(p_time_zone, ''), 'Asia/Shanghai'));
  return coalesce(nullif(p_time_zone, ''), 'Asia/Shanghai');
exception when others then
  return 'Asia/Shanghai';
end;
$$;

-- 从当前发生日期推算下一次月付日期；2 月等短月按当月最后一天收敛
create or replace function public.next_monthly_run_date(p_current date, p_monthly_day int)
returns date
language sql
immutable
as $$
  select make_date(
    extract(year from (p_current + interval '1 month')::date)::int,
    extract(month from (p_current + interval '1 month')::date)::int,
    least(
      p_monthly_day,
      extract(
        day from date_trunc('month', (p_current + interval '1 month')::date) + interval '1 month - 1 day'
      )::int
    )
  );
$$;

-- 根据频率推算下一次发生日期
create or replace function public.next_recurring_run_date(
  p_frequency text,
  p_monthly_day int,
  p_weekly_day int,
  p_from date
)
returns date
language plpgsql
immutable
as $$
begin
  if p_frequency = 'monthly' then
    return public.next_monthly_run_date(p_from, p_monthly_day);
  elsif p_frequency = 'weekly' then
    return p_from + 7;
  end if;
  raise exception '不支持的定时记账频率: %', p_frequency;
end;
$$;

-- 扫描所有到期规则，生成真实流水并推进 next_run_on。
-- 以 security definer 运行以跨过 RLS；重复执行时由唯一约束保证幂等。
create or replace function public.generate_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r            public.recurring_rules%rowtype;
  v_time_zone  text;
  v_today      date;
  v_next       date;
  v_occurred_at timestamptz;
  v_count      integer := 0;
  v_guard      integer;
begin
  for r in
    select *
    from public.recurring_rules rr
    where rr.is_active
      and rr.next_run_on <= (
        timezone(public.safe_time_zone(rr.time_zone), now())
      )::date
    for update skip locked
  loop
    v_time_zone := public.safe_time_zone(r.time_zone);
    v_today := (timezone(v_time_zone, now()))::date;
    v_guard := 0;

    while r.next_run_on <= v_today loop
      -- 定时流水发生在到期日的本地 00:00；同一日期重复执行时 occurred_at 相同，可被唯一约束拦截
      v_occurred_at := timezone(v_time_zone, r.next_run_on::timestamp);

      insert into public.transactions (
        ledger_id, category_id, kind, amount, currency, tag_names, note,
        attributes, images, occurred_at, created_by, recurring_rule_id
      ) values (
        r.ledger_id, r.category_id, r.kind, r.amount, r.currency, r.tag_names, r.note,
        r.attributes, r.images, v_occurred_at, r.created_by, r.id
      )
      on conflict (recurring_rule_id, occurred_at) do nothing;

      if found then
        v_count := v_count + 1;
      end if;

      v_next := public.next_recurring_run_date(
        r.frequency, r.monthly_day, r.weekly_day, r.next_run_on
      );

      update public.recurring_rules
         set next_run_on = v_next
       where id = r.id;

      r.next_run_on := v_next;
      v_guard := v_guard + 1;

      -- 防止极端情况下一次补记过多
      if v_guard >= 500 then
        raise warning '定时记账规则 % 一次生成超过 500 条，已停止推进', r.id;
        exit;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

-- 全局生成函数只允许定时任务 / 数据库管理员调用，客户端不得直接执行
revoke all on function public.generate_due_recurring_transactions() from public;
revoke all on function public.generate_due_recurring_transactions() from anon;
revoke all on function public.generate_due_recurring_transactions() from authenticated;

-- ----------------------------------------------------------------------------
-- 5. RLS
-- ----------------------------------------------------------------------------
alter table public.recurring_rules enable row level security;

drop policy if exists recurring_rules_select on public.recurring_rules;
create policy recurring_rules_select on public.recurring_rules for select
  using (public.can_access_ledger(ledger_id));

drop policy if exists recurring_rules_insert on public.recurring_rules;
create policy recurring_rules_insert on public.recurring_rules for insert
  with check (
    public.can_access_ledger(ledger_id)
    and created_by = auth.uid()
  );

drop policy if exists recurring_rules_update on public.recurring_rules;
create policy recurring_rules_update on public.recurring_rules for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.ledgers l
      where l.id = recurring_rules.ledger_id and l.owner_id = auth.uid()
    )
  );

drop policy if exists recurring_rules_delete on public.recurring_rules;
create policy recurring_rules_delete on public.recurring_rules for delete
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.ledgers l
      where l.id = recurring_rules.ledger_id and l.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 6. 调度：每小时检查一次；函数内部按每个规则的 time_zone 判断本地日期
--    注意：如果项目未启用 pg_cron，请先在 Supabase Dashboard 的 Cron 中启用，
--          再重新执行本迁移；也可以直接在 Dashboard 新建 SQL 定时任务调用
--          select public.generate_due_recurring_transactions();
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron 未启用或当前角色无权限，请手动在 Supabase Dashboard 配置调度：%', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'generate-recurring-transactions') then
      perform cron.schedule(
        'generate-recurring-transactions',
        '0 * * * *',
        $cron$select public.generate_due_recurring_transactions();$cron$
      );
    end if;
  end if;
end $$;
