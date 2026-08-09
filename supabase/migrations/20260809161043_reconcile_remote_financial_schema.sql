-- Reconcile remote schema drift without replaying historical migrations.
-- This migration only restores missing financial planning, recurring, and installment objects
-- and upgrades dependent routines that must understand the new schema.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'credit_card_installment_plan_status'
  ) then
    create type public.credit_card_installment_plan_status as enum ('active', 'cancelled', 'completed');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'recurring_transaction_frequency'
  ) then
    create type public.recurring_transaction_frequency as enum ('monthly');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'recurring_transaction_status'
  ) then
    create type public.recurring_transaction_status as enum ('active', 'paused', 'cancelled');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'financial_goal_status'
  ) then
    create type public.financial_goal_status as enum ('active', 'completed', 'cancelled');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'financial_goal_type'
  ) then
    create type public.financial_goal_type as enum (
      'emergency_fund',
      'purchase',
      'travel',
      'education',
      'other'
    );
  end if;
end;
$$;

create table if not exists public.credit_card_installment_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards (id),
  category_id uuid references public.categories (id),
  description text not null,
  total_amount numeric(14, 2) not null,
  installment_count smallint not null,
  purchase_date date not null,
  notes text,
  client_mutation_id uuid not null,
  status public.credit_card_installment_plan_status not null default 'active',
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_card_installment_plans_description_length check (char_length(description) between 2 and 160),
  constraint credit_card_installment_plans_total_positive check (total_amount > 0),
  constraint credit_card_installment_plans_total_scale check (total_amount = round(total_amount, 2)),
  constraint credit_card_installment_plans_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint credit_card_installment_plans_count_range check (installment_count between 2 and 60)
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_card_transactions'
      and column_name = 'installment_plan_id'
  ) then
    alter table public.credit_card_transactions
      add column installment_plan_id uuid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_card_transactions'
      and column_name = 'installment_number'
  ) then
    alter table public.credit_card_transactions
      add column installment_number smallint;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_card_transactions'
      and column_name = 'installment_count'
  ) then
    alter table public.credit_card_transactions
      add column installment_count smallint;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'credit_card_transactions_installment_plan_id_fkey'
      and conrelid = 'public.credit_card_transactions'::regclass
  ) then
    alter table public.credit_card_transactions
      add constraint credit_card_transactions_installment_plan_id_fkey
      foreign key (installment_plan_id) references public.credit_card_installment_plans (id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'credit_card_transactions_installment_consistency'
      and conrelid = 'public.credit_card_transactions'::regclass
  ) then
    alter table public.credit_card_transactions
      add constraint credit_card_transactions_installment_consistency check (
        (
          installment_plan_id is null
          and installment_number is null
          and installment_count is null
        )
        or (
          installment_plan_id is not null
          and installment_number is not null
          and installment_count is not null
          and installment_count between 2 and 60
          and installment_number between 1 and installment_count
        )
      );
  end if;
end;
$$;

create table if not exists public.recurring_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  category_id uuid references public.categories (id),
  type public.financial_entry_type not null,
  description text not null,
  amount numeric(14, 2) not null,
  frequency public.recurring_transaction_frequency not null default 'monthly',
  day_of_month smallint not null,
  start_date date not null,
  end_date date,
  status public.recurring_transaction_status not null default 'active',
  last_generated_period date,
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint recurring_transactions_description_length check (char_length(description) between 2 and 160),
  constraint recurring_transactions_amount_positive check (amount > 0),
  constraint recurring_transactions_amount_scale check (amount = round(amount, 2)),
  constraint recurring_transactions_day_range check (day_of_month between 1 and 31),
  constraint recurring_transactions_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint recurring_transactions_end_after_start check (end_date is null or end_date >= start_date)
);

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'recurring_transaction_id'
  ) then
    alter table public.transactions
      add column recurring_transaction_id uuid;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'recurrence_period'
  ) then
    alter table public.transactions
      add column recurrence_period date;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_transaction_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_recurring_transaction_id_fkey
      foreign key (recurring_transaction_id) references public.recurring_transactions (id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_consistency'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_recurring_consistency check (
        (
          recurring_transaction_id is null
          and recurrence_period is null
        )
        or (
          recurring_transaction_id is not null
          and recurrence_period is not null
        )
      );
  end if;
end;
$$;

create table if not exists public.recurring_transaction_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recurring_transaction_id uuid not null references public.recurring_transactions (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  reference_period date not null,
  scheduled_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.monthly_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference_month date not null,
  expected_income numeric(14, 2),
  savings_target numeric(14, 2) not null default 0,
  spending_limit numeric(14, 2),
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint monthly_plans_expected_income_scale check (
    expected_income is null or (expected_income >= 0 and expected_income = round(expected_income, 2))
  ),
  constraint monthly_plans_savings_target_scale check (
    savings_target >= 0 and savings_target = round(savings_target, 2)
  ),
  constraint monthly_plans_spending_limit_scale check (
    spending_limit is null or (spending_limit >= 0 and spending_limit = round(spending_limit, 2))
  ),
  constraint monthly_plans_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint monthly_plans_reference_month_first_day check (
    reference_month = date_trunc('month', reference_month)::date
  )
);

create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monthly_plan_id uuid not null references public.monthly_plans (id) on delete cascade,
  category_id uuid not null references public.categories (id),
  budget_amount numeric(14, 2) not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint category_budgets_amount_scale check (
    budget_amount >= 0 and budget_amount = round(budget_amount, 2)
  )
);

create table if not exists public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null,
  current_amount numeric(14, 2) not null default 0,
  target_date date,
  type public.financial_goal_type not null default 'other',
  status public.financial_goal_status not null default 'active',
  notes text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_goals_name_length check (char_length(name) between 2 and 160),
  constraint financial_goals_target_scale check (
    target_amount > 0 and target_amount = round(target_amount, 2)
  ),
  constraint financial_goals_current_scale check (
    current_amount >= 0 and current_amount = round(current_amount, 2)
  ),
  constraint financial_goals_notes_length check (notes is null or char_length(notes) <= 1000)
);

create unique index if not exists credit_card_installment_plans_user_mutation_unique
on public.credit_card_installment_plans (user_id, client_mutation_id);

create index if not exists credit_card_installment_plans_user_status_idx
on public.credit_card_installment_plans (user_id, status, purchase_date desc)
where deleted_at is null;

create index if not exists credit_card_installment_plans_card_idx
on public.credit_card_installment_plans (credit_card_id, created_at desc)
where deleted_at is null;

create index if not exists credit_card_transactions_installment_plan_idx
on public.credit_card_transactions (installment_plan_id, installment_number)
where installment_plan_id is not null and deleted_at is null;

create unique index if not exists credit_card_transactions_installment_plan_number_unique
on public.credit_card_transactions (installment_plan_id, installment_number)
where installment_plan_id is not null and deleted_at is null;

create index if not exists recurring_transactions_user_status_idx
on public.recurring_transactions (user_id, status, start_date)
where deleted_at is null;

create index if not exists recurring_transactions_account_idx
on public.recurring_transactions (account_id, status)
where deleted_at is null;

create unique index if not exists transactions_recurring_period_unique
on public.transactions (recurring_transaction_id, recurrence_period)
where recurring_transaction_id is not null and deleted_at is null;

create index if not exists transactions_recurring_id_idx
on public.transactions (recurring_transaction_id, recurrence_period desc)
where recurring_transaction_id is not null and deleted_at is null;

create unique index if not exists recurring_transaction_occurrences_period_unique
on public.recurring_transaction_occurrences (recurring_transaction_id, reference_period);

create unique index if not exists recurring_transaction_occurrences_transaction_unique
on public.recurring_transaction_occurrences (transaction_id);

create index if not exists recurring_transaction_occurrences_user_period_idx
on public.recurring_transaction_occurrences (user_id, reference_period desc);

create unique index if not exists monthly_plans_user_reference_month_unique
on public.monthly_plans (user_id, reference_month);

create index if not exists monthly_plans_user_reference_idx
on public.monthly_plans (user_id, reference_month desc)
where deleted_at is null;

create unique index if not exists category_budgets_plan_category_unique
on public.category_budgets (monthly_plan_id, category_id);

create index if not exists category_budgets_user_plan_idx
on public.category_budgets (user_id, monthly_plan_id);

create index if not exists financial_goals_user_status_idx
on public.financial_goals (user_id, status, created_at desc)
where deleted_at is null;

create index if not exists financial_goals_user_target_date_idx
on public.financial_goals (user_id, target_date)
where deleted_at is null and status = 'active';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'credit_card_installment_plans_set_updated_at'
      and tgrelid = 'public.credit_card_installment_plans'::regclass
  ) then
    create trigger credit_card_installment_plans_set_updated_at
    before update on public.credit_card_installment_plans
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'recurring_transactions_set_updated_at'
      and tgrelid = 'public.recurring_transactions'::regclass
  ) then
    create trigger recurring_transactions_set_updated_at
    before update on public.recurring_transactions
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'monthly_plans_set_updated_at'
      and tgrelid = 'public.monthly_plans'::regclass
  ) then
    create trigger monthly_plans_set_updated_at
    before update on public.monthly_plans
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'category_budgets_set_updated_at'
      and tgrelid = 'public.category_budgets'::regclass
  ) then
    create trigger category_budgets_set_updated_at
    before update on public.category_budgets
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'financial_goals_set_updated_at'
      and tgrelid = 'public.financial_goals'::regclass
  ) then
    create trigger financial_goals_set_updated_at
    before update on public.financial_goals
    for each row
    execute function public.set_updated_at();
  end if;
end;
$$;

create or replace function public.uuid_from_text(p_text text)
returns uuid
language sql
immutable
as $$
  select (
    substr(md5(p_text), 1, 8) || '-' ||
    substr(md5(p_text), 9, 4) || '-' ||
    substr(md5(p_text), 13, 4) || '-' ||
    substr(md5(p_text), 17, 4) || '-' ||
    substr(md5(p_text), 21, 12)
  )::uuid;
$$;

create or replace function public.shift_month_preserving_day(
  p_base_date date,
  p_month_offset integer
)
returns date
language sql
immutable
set search_path = public
as $$
  select public.make_safe_date(
    extract(year from (date_trunc('month', p_base_date) + (p_month_offset || ' month')::interval))::integer,
    extract(month from (date_trunc('month', p_base_date) + (p_month_offset || ' month')::interval))::integer,
    extract(day from p_base_date)::integer
  );
$$;

create or replace function public.compute_monthly_scheduled_date(
  p_reference_period date,
  p_day_of_month smallint
)
returns date
language sql
immutable
set search_path = public
as $$
  select public.make_safe_date(
    extract(year from p_reference_period)::integer,
    extract(month from p_reference_period)::integer,
    p_day_of_month
  );
$$;

create or replace function public.refresh_credit_card_installment_plan_status(
  p_installment_plan_id uuid
)
returns public.credit_card_installment_plan_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_plan public.credit_card_installment_plans;
  v_status public.credit_card_installment_plan_status;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_plan
  from public.credit_card_installment_plans
  where id = p_installment_plan_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'installment plan not found for current user' using errcode = '42501';
  end if;

  if v_plan.status = 'cancelled' then
    return v_plan.status;
  end if;

  select
    case
      when exists (
        select 1
        from public.credit_card_transactions t
        join public.credit_card_invoices i on i.id = t.invoice_id
        where t.installment_plan_id = v_plan.id
          and t.deleted_at is null
          and i.status <> 'paid'
      ) then 'active'::public.credit_card_installment_plan_status
      else 'completed'::public.credit_card_installment_plan_status
    end
  into v_status;

  update public.credit_card_installment_plans
  set status = v_status
  where id = v_plan.id;

  return v_status;
end;
$$;

create or replace function public.create_credit_card_installment_purchase(
  p_credit_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_total_amount numeric,
  p_purchase_date date,
  p_notes text,
  p_installment_count smallint,
  p_client_mutation_id uuid
)
returns public.credit_card_installment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.credit_cards;
  v_plan public.credit_card_installment_plans;
  v_invoice public.credit_card_invoices;
  v_reference_month date;
  v_utilized_amount numeric(14, 2);
  v_total_cents bigint;
  v_base_cents bigint;
  v_remainder bigint;
  v_index integer;
  v_installment_amount numeric(14, 2);
  v_installment_date date;
  v_installment_mutation_id uuid;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_total_amount <= 0 or p_total_amount <> round(p_total_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_installment_count < 2 or p_installment_count > 60 then
    raise exception 'installment count must be between 2 and 60' using errcode = '23514';
  end if;

  select *
  into v_plan
  from public.credit_card_installment_plans
  where user_id = v_user_id
    and client_mutation_id = p_client_mutation_id;

  if found then
    return v_plan;
  end if;

  select *
  into v_card
  from public.credit_cards
  where id = p_credit_card_id
    and user_id = v_user_id
    and is_active = true
    and deleted_at is null
  for update;

  if not found then
    raise exception 'credit card not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, 'expense') then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  v_utilized_amount := public.credit_card_utilized_amount(p_credit_card_id);
  if v_utilized_amount + p_total_amount > v_card.limit_amount then
    raise exception 'credit card limit exceeded' using errcode = '23514';
  end if;

  insert into public.credit_card_installment_plans (
    user_id,
    credit_card_id,
    category_id,
    description,
    total_amount,
    installment_count,
    purchase_date,
    notes,
    client_mutation_id
  )
  values (
    v_user_id,
    p_credit_card_id,
    p_category_id,
    trim(p_description),
    p_total_amount,
    p_installment_count,
    p_purchase_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_client_mutation_id
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_plan;

  if v_plan.id is null then
    select *
    into v_plan
    from public.credit_card_installment_plans
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_plan;
  end if;

  v_total_cents := (p_total_amount * 100)::bigint;
  v_base_cents := v_total_cents / p_installment_count;
  v_remainder := v_total_cents % p_installment_count;

  for v_index in 1..p_installment_count loop
    v_installment_amount :=
      ((v_base_cents + case when v_index <= v_remainder then 1 else 0 end)::numeric / 100)::numeric(14, 2);
    v_installment_date := public.shift_month_preserving_day(p_purchase_date, v_index - 1);
    v_reference_month :=
      public.compute_credit_card_reference_month(v_installment_date, v_card.closing_day);
    v_invoice := public.ensure_credit_card_invoice(
      v_user_id,
      p_credit_card_id,
      v_reference_month,
      v_card.closing_day,
      v_card.due_day
    );
    v_installment_mutation_id := public.uuid_from_text(v_plan.id::text || ':' || v_index::text);

    insert into public.credit_card_transactions (
      user_id,
      credit_card_id,
      invoice_id,
      category_id,
      description,
      amount,
      purchase_date,
      notes,
      client_mutation_id,
      installment_plan_id,
      installment_number,
      installment_count
    )
    values (
      v_user_id,
      p_credit_card_id,
      v_invoice.id,
      p_category_id,
      trim(p_description),
      v_installment_amount,
      v_installment_date,
      nullif(trim(coalesce(p_notes, '')), ''),
      v_installment_mutation_id,
      v_plan.id,
      v_index,
      p_installment_count
    );

    update public.credit_card_invoices
    set total_amount = total_amount + v_installment_amount
    where id = v_invoice.id;

    perform public.refresh_credit_card_invoice_status(v_invoice.id);
  end loop;

  return v_plan;
end;
$$;

create or replace function public.update_credit_card_installment_plan(
  p_installment_plan_id uuid,
  p_category_id uuid,
  p_description text,
  p_notes text
)
returns public.credit_card_installment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_plan public.credit_card_installment_plans;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_plan
  from public.credit_card_installment_plans
  where id = p_installment_plan_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'installment plan not found for current user' using errcode = '42501';
  end if;

  if v_plan.status = 'cancelled' then
    raise exception 'cancelled installment plan cannot be updated' using errcode = '23514';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, 'expense') then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  update public.credit_card_installment_plans
  set
    category_id = p_category_id,
    description = trim(p_description),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_installment_plan_id
  returning *
  into v_plan;

  update public.credit_card_transactions
  set
    category_id = p_category_id,
    description = trim(p_description),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where installment_plan_id = p_installment_plan_id
    and deleted_at is null;

  return v_plan;
end;
$$;

create or replace function public.cancel_credit_card_installment_plan(
  p_installment_plan_id uuid
)
returns public.credit_card_installment_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_plan public.credit_card_installment_plans;
  v_invoice_id uuid;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_plan
  from public.credit_card_installment_plans
  where id = p_installment_plan_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'installment plan not found for current user' using errcode = '42501';
  end if;

  if v_plan.status <> 'active' then
    return v_plan;
  end if;

  if exists (
    select 1
    from public.credit_card_transactions t
    join public.credit_card_invoices i on i.id = t.invoice_id
    where t.installment_plan_id = v_plan.id
      and t.deleted_at is null
      and i.paid_amount > 0
  ) then
    raise exception 'installment plan with paid invoices cannot be cancelled safely' using errcode = '23514';
  end if;

  for v_invoice_id in
    select distinct invoice_id
    from public.credit_card_transactions
    where installment_plan_id = v_plan.id
      and deleted_at is null
  loop
    update public.credit_card_invoices i
    set total_amount = i.total_amount - plan_values.total_amount
    from (
      select invoice_id, coalesce(sum(amount), 0) as total_amount
      from public.credit_card_transactions
      where installment_plan_id = v_plan.id
        and deleted_at is null
        and invoice_id = v_invoice_id
      group by invoice_id
    ) as plan_values
    where i.id = plan_values.invoice_id;
  end loop;

  update public.credit_card_transactions
  set deleted_at = timezone('utc', now())
  where installment_plan_id = v_plan.id
    and deleted_at is null;

  update public.credit_card_installment_plans
  set status = 'cancelled'
  where id = v_plan.id
  returning *
  into v_plan;

  for v_invoice_id in
    select distinct invoice_id
    from public.credit_card_transactions
    where installment_plan_id = v_plan.id
  loop
    perform public.refresh_credit_card_invoice_status(v_invoice_id);
  end loop;

  return v_plan;
end;
$$;

create or replace function public.update_credit_card_purchase(
  p_credit_card_transaction_id uuid,
  p_credit_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_amount numeric,
  p_purchase_date date,
  p_notes text
)
returns public.credit_card_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_existing public.credit_card_transactions;
  v_card public.credit_cards;
  v_new_invoice public.credit_card_invoices;
  v_reference_month date;
  v_utilized_amount numeric(14, 2);
  v_updated public.credit_card_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_existing
  from public.credit_card_transactions
  where id = p_credit_card_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'credit card purchase not found for current user' using errcode = '42501';
  end if;

  if v_existing.installment_plan_id is not null then
    raise exception 'installment purchases must be edited through installment plan metadata' using errcode = '23514';
  end if;

  select *
  into v_card
  from public.credit_cards
  where id = p_credit_card_id
    and user_id = v_user_id
    and is_active = true
    and deleted_at is null
  for update;

  if not found then
    raise exception 'credit card not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, 'expense') then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  v_reference_month := public.compute_credit_card_reference_month(p_purchase_date, v_card.closing_day);
  v_new_invoice := public.ensure_credit_card_invoice(
    v_user_id,
    p_credit_card_id,
    v_reference_month,
    v_card.closing_day,
    v_card.due_day
  );

  update public.credit_card_invoices
  set total_amount = total_amount - v_existing.amount
  where id = v_existing.invoice_id;

  v_utilized_amount := public.credit_card_utilized_amount(p_credit_card_id);

  if v_utilized_amount + p_amount > v_card.limit_amount then
    raise exception 'credit card limit exceeded' using errcode = '23514';
  end if;

  update public.credit_card_invoices
  set total_amount = total_amount + p_amount
  where id = v_new_invoice.id;

  update public.credit_card_transactions
  set
    credit_card_id = p_credit_card_id,
    invoice_id = v_new_invoice.id,
    category_id = p_category_id,
    description = trim(p_description),
    amount = p_amount,
    purchase_date = p_purchase_date,
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_credit_card_transaction_id
  returning *
  into v_updated;

  perform public.refresh_credit_card_invoice_status(v_existing.invoice_id);
  if v_existing.invoice_id <> v_new_invoice.id then
    perform public.refresh_credit_card_invoice_status(v_new_invoice.id);
  end if;

  return v_updated;
end;
$$;

create or replace function public.soft_delete_credit_card_purchase(
  p_credit_card_transaction_id uuid
)
returns public.credit_card_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.credit_card_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_transaction
  from public.credit_card_transactions
  where id = p_credit_card_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'credit card purchase not found for current user' using errcode = '42501';
  end if;

  if v_transaction.installment_plan_id is not null then
    raise exception 'installment purchases must be cancelled through installment plan' using errcode = '23514';
  end if;

  update public.credit_card_invoices
  set total_amount = total_amount - v_transaction.amount
  where id = v_transaction.invoice_id;

  update public.credit_card_transactions
  set deleted_at = timezone('utc', now())
  where id = p_credit_card_transaction_id
  returning *
  into v_transaction;

  perform public.refresh_credit_card_invoice_status(v_transaction.invoice_id);

  return v_transaction;
end;
$$;

create or replace function public.pay_credit_card_invoice(
  p_invoice_id uuid,
  p_account_id uuid,
  p_amount numeric,
  p_client_mutation_id uuid
)
returns public.credit_card_invoice_payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_invoice public.credit_card_invoices;
  v_payment public.credit_card_invoice_payments;
  v_outstanding_amount numeric(14, 2);
  v_plan_id uuid;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_invoice
  from public.credit_card_invoices
  where id = p_invoice_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'invoice not found for current user' using errcode = '42501';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  v_outstanding_amount := v_invoice.total_amount - v_invoice.paid_amount;
  if p_amount > v_outstanding_amount then
    raise exception 'invoice payment exceeds outstanding amount' using errcode = '23514';
  end if;

  insert into public.credit_card_invoice_payments (
    user_id,
    invoice_id,
    account_id,
    amount,
    client_mutation_id
  )
  values (
    v_user_id,
    p_invoice_id,
    p_account_id,
    p_amount,
    p_client_mutation_id
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_payment;

  if v_payment.id is null then
    select *
    into v_payment
    from public.credit_card_invoice_payments
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_payment;
  end if;

  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance - p_amount
  where id = p_account_id
    and user_id = v_user_id;

  update public.credit_card_invoices
  set paid_amount = paid_amount + p_amount
  where id = p_invoice_id;

  perform public.refresh_credit_card_invoice_status(p_invoice_id);

  for v_plan_id in
    select distinct installment_plan_id
    from public.credit_card_transactions
    where invoice_id = p_invoice_id
      and installment_plan_id is not null
      and deleted_at is null
  loop
    perform public.refresh_credit_card_installment_plan_status(v_plan_id);
  end loop;

  return v_payment;
end;
$$;

create or replace function public.create_recurring_generated_transaction(
  p_user_id uuid,
  p_recurring_transaction_id uuid,
  p_reference_period date,
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_transaction_date date,
  p_notes text
)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_user_id uuid := (select auth.uid());
  v_transaction public.transactions;
  v_signed_amount numeric(14, 2);
  v_client_mutation_id uuid :=
    public.uuid_from_text(p_recurring_transaction_id::text || ':' || p_reference_period::text);
begin
  if v_auth_user_id is null or v_auth_user_id <> p_user_id then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if not public.assert_account_matches_user(p_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(p_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  insert into public.transactions (
    user_id,
    account_id,
    category_id,
    type,
    description,
    amount,
    transaction_date,
    notes,
    client_mutation_id,
    recurring_transaction_id,
    recurrence_period
  )
  values (
    p_user_id,
    p_account_id,
    p_category_id,
    p_type,
    trim(p_description),
    p_amount,
    p_transaction_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    v_client_mutation_id,
    p_recurring_transaction_id,
    p_reference_period
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_transaction;

  if v_transaction.id is null then
    select *
    into v_transaction
    from public.transactions
    where user_id = p_user_id
      and client_mutation_id = v_client_mutation_id;

    return v_transaction;
  end if;

  v_signed_amount := public.transaction_signed_amount(p_type, p_amount);
  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance + v_signed_amount
  where id = p_account_id
    and user_id = p_user_id;

  return v_transaction;
end;
$$;

create or replace function public.create_recurring_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_day_of_month smallint,
  p_start_date date,
  p_end_date date,
  p_notes text
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_day_of_month < 1 or p_day_of_month > 31 then
    raise exception 'day of month must be between 1 and 31' using errcode = '23514';
  end if;

  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'end date must be equal or after start date' using errcode = '23514';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  insert into public.recurring_transactions (
    user_id,
    account_id,
    category_id,
    type,
    description,
    amount,
    day_of_month,
    start_date,
    end_date,
    notes
  )
  values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_type,
    trim(p_description),
    p_amount,
    p_day_of_month,
    p_start_date,
    p_end_date,
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

create or replace function public.update_recurring_transaction(
  p_recurring_transaction_id uuid,
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_day_of_month smallint,
  p_start_date date,
  p_end_date date,
  p_notes text
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_day_of_month < 1 or p_day_of_month > 31 then
    raise exception 'day of month must be between 1 and 31' using errcode = '23514';
  end if;

  if p_end_date is not null and p_end_date < p_start_date then
    raise exception 'end date must be equal or after start date' using errcode = '23514';
  end if;

  select *
  into v_recurring
  from public.recurring_transactions
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  if v_recurring.status = 'cancelled' then
    raise exception 'cancelled recurring transaction cannot be updated' using errcode = '23514';
  end if;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  update public.recurring_transactions
  set
    account_id = p_account_id,
    category_id = p_category_id,
    type = p_type,
    description = trim(p_description),
    amount = p_amount,
    day_of_month = p_day_of_month,
    start_date = p_start_date,
    end_date = p_end_date,
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_recurring_transaction_id
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

create or replace function public.pause_recurring_transaction(
  p_recurring_transaction_id uuid
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  update public.recurring_transactions
  set status = 'paused'
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  returning *
  into v_recurring;

  if v_recurring.id is null then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  return v_recurring;
end;
$$;

create or replace function public.resume_recurring_transaction(
  p_recurring_transaction_id uuid
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_current_period date := date_trunc('month', current_date)::date;
  v_resume_floor date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_recurring
  from public.recurring_transactions
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  if v_recurring.status = 'cancelled' then
    raise exception 'cancelled recurring transaction cannot be resumed' using errcode = '23514';
  end if;

  v_resume_floor :=
    case
      when public.compute_monthly_scheduled_date(v_current_period, v_recurring.day_of_month) <= current_date
        then v_current_period
      else (v_current_period - interval '1 month')::date
    end;

  update public.recurring_transactions
  set
    status = 'active',
    last_generated_period = greatest(coalesce(last_generated_period, (date_trunc('month', start_date) - interval '1 month')::date), v_resume_floor)
  where id = p_recurring_transaction_id
  returning *
  into v_recurring;

  return v_recurring;
end;
$$;

create or replace function public.cancel_recurring_transaction(
  p_recurring_transaction_id uuid
)
returns public.recurring_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  update public.recurring_transactions
  set status = 'cancelled'
  where id = p_recurring_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  returning *
  into v_recurring;

  if v_recurring.id is null then
    raise exception 'recurring transaction not found for current user' using errcode = '42501';
  end if;

  return v_recurring;
end;
$$;

create or replace function public.generate_due_recurring_transactions()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_recurring public.recurring_transactions;
  v_reference_period date;
  v_last_generated_period date;
  v_current_period date := date_trunc('month', current_date)::date;
  v_scheduled_date date;
  v_transaction public.transactions;
  v_occurrence_id uuid;
  v_generated_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  for v_recurring in
    select *
    from public.recurring_transactions
    where user_id = v_user_id
      and status = 'active'
      and frequency = 'monthly'
      and deleted_at is null
    order by created_at asc
  loop
    v_last_generated_period :=
      coalesce(v_recurring.last_generated_period, (date_trunc('month', v_recurring.start_date) - interval '1 month')::date);
    v_reference_period := (v_last_generated_period + interval '1 month')::date;

    while v_reference_period <= v_current_period loop
      v_scheduled_date :=
        public.compute_monthly_scheduled_date(v_reference_period, v_recurring.day_of_month);

      if v_scheduled_date < v_recurring.start_date then
        v_reference_period := (v_reference_period + interval '1 month')::date;
        continue;
      end if;

      if v_recurring.end_date is not null and v_scheduled_date > v_recurring.end_date then
        exit;
      end if;

      if v_scheduled_date > current_date then
        exit;
      end if;

      v_transaction := public.create_recurring_generated_transaction(
        v_user_id,
        v_recurring.id,
        v_reference_period,
        v_recurring.account_id,
        v_recurring.category_id,
        v_recurring.type,
        v_recurring.description,
        v_recurring.amount,
        v_scheduled_date,
        v_recurring.notes
      );

      insert into public.recurring_transaction_occurrences (
        user_id,
        recurring_transaction_id,
        transaction_id,
        reference_period,
        scheduled_date
      )
      values (
        v_user_id,
        v_recurring.id,
        v_transaction.id,
        v_reference_period,
        v_scheduled_date
      )
      on conflict (recurring_transaction_id, reference_period) do nothing
      returning id
      into v_occurrence_id;

      if v_occurrence_id is not null then
        v_generated_count := v_generated_count + 1;
      end if;

      update public.recurring_transactions
      set last_generated_period = v_reference_period
      where id = v_recurring.id
        and (last_generated_period is null or last_generated_period < v_reference_period);

      v_reference_period := (v_reference_period + interval '1 month')::date;
      v_occurrence_id := null;
    end loop;
  end loop;

  return v_generated_count;
end;
$$;

create or replace function public.normalize_reference_month(p_reference_month date)
returns date
language sql
immutable
set search_path = public
as $$
  select date_trunc('month', p_reference_month)::date;
$$;

create or replace function public.add_months_to_period(
  p_reference_month date,
  p_month_offset integer
)
returns date
language sql
immutable
set search_path = public
as $$
  select (date_trunc('month', p_reference_month) + (p_month_offset || ' month')::interval)::date;
$$;

create or replace function public.resolve_goal_status(
  p_target_amount numeric,
  p_current_amount numeric,
  p_requested_status public.financial_goal_status default 'active'
)
returns public.financial_goal_status
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_requested_status = 'cancelled' then
    return 'cancelled';
  end if;

  if p_current_amount >= p_target_amount then
    return 'completed';
  end if;

  return 'active';
end;
$$;

create or replace function public.assert_monthly_plan_matches_user(
  p_user_id uuid,
  p_monthly_plan_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.monthly_plans mp
    where mp.id = p_monthly_plan_id
      and mp.user_id = p_user_id
      and mp.deleted_at is null
  );
$$;

create or replace function public.assert_expense_category_matches_user(
  p_user_id uuid,
  p_category_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.categories c
    where c.id = p_category_id
      and c.user_id = p_user_id
      and c.type = 'expense'
      and c.is_active = true
      and c.deleted_at is null
  );
$$;

create or replace function public.monthly_realized_income(
  p_user_id uuid,
  p_reference_month date
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select
      public.normalize_reference_month(p_reference_month) as period_start,
      (public.normalize_reference_month(p_reference_month) + interval '1 month')::date as period_end
  )
  select coalesce(sum(t.amount), 0)::numeric(14, 2)
  from public.transactions t
  cross join period
  where t.user_id = p_user_id
    and t.type = 'income'
    and t.deleted_at is null
    and t.transaction_date >= period.period_start
    and t.transaction_date < period.period_end;
$$;

create or replace function public.monthly_realized_expense(
  p_user_id uuid,
  p_reference_month date
)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  with period as (
    select
      public.normalize_reference_month(p_reference_month) as period_start,
      (public.normalize_reference_month(p_reference_month) + interval '1 month')::date as period_end
  ),
  bank_expenses as (
    select coalesce(sum(t.amount), 0)::numeric(14, 2) as amount
    from public.transactions t
    cross join period
    where t.user_id = p_user_id
      and t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date >= period.period_start
      and t.transaction_date < period.period_end
  ),
  card_expenses as (
    select coalesce(sum(ct.amount), 0)::numeric(14, 2) as amount
    from public.credit_card_transactions ct
    cross join period
    where ct.user_id = p_user_id
      and ct.deleted_at is null
      and ct.purchase_date >= period.period_start
      and ct.purchase_date < period.period_end
  )
  select (bank_expenses.amount + card_expenses.amount)::numeric(14, 2)
  from bank_expenses, card_expenses;
$$;

create or replace function public.upsert_monthly_plan(
  p_reference_month date,
  p_expected_income numeric,
  p_savings_target numeric,
  p_spending_limit numeric,
  p_notes text
)
returns public.monthly_plans
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date;
  v_plan public.monthly_plans;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_expected_income is not null and (p_expected_income < 0 or p_expected_income <> round(p_expected_income, 2)) then
    raise exception 'expected income must be null or positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_savings_target < 0 or p_savings_target <> round(p_savings_target, 2) then
    raise exception 'savings target must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_spending_limit is not null and (p_spending_limit < 0 or p_spending_limit <> round(p_spending_limit, 2)) then
    raise exception 'spending limit must be null or positive numeric(14,2)' using errcode = '23514';
  end if;

  v_reference_month := public.normalize_reference_month(p_reference_month);

  insert into public.monthly_plans (
    user_id,
    reference_month,
    expected_income,
    savings_target,
    spending_limit,
    notes,
    deleted_at
  )
  values (
    v_user_id,
    v_reference_month,
    p_expected_income,
    p_savings_target,
    p_spending_limit,
    nullif(trim(coalesce(p_notes, '')), ''),
    null
  )
  on conflict (user_id, reference_month) do update
  set
    expected_income = excluded.expected_income,
    savings_target = excluded.savings_target,
    spending_limit = excluded.spending_limit,
    notes = excluded.notes,
    deleted_at = null
  returning *
  into v_plan;

  return v_plan;
end;
$$;

create or replace function public.upsert_category_budget(
  p_monthly_plan_id uuid,
  p_category_id uuid,
  p_budget_amount numeric
)
returns public.category_budgets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_budget public.category_budgets;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_budget_amount < 0 or p_budget_amount <> round(p_budget_amount, 2) then
    raise exception 'budget amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if not public.assert_monthly_plan_matches_user(v_user_id, p_monthly_plan_id) then
    raise exception 'monthly plan not found for current user' using errcode = '42501';
  end if;

  if not public.assert_expense_category_matches_user(v_user_id, p_category_id) then
    raise exception 'category budget requires active expense category for current user' using errcode = '42501';
  end if;

  insert into public.category_budgets (
    user_id,
    monthly_plan_id,
    category_id,
    budget_amount
  )
  values (
    v_user_id,
    p_monthly_plan_id,
    p_category_id,
    p_budget_amount
  )
  on conflict (monthly_plan_id, category_id) do update
  set budget_amount = excluded.budget_amount
  returning *
  into v_budget;

  return v_budget;
end;
$$;

create or replace function public.create_financial_goal(
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date,
  p_type public.financial_goal_type,
  p_notes text
)
returns public.financial_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.financial_goals;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 2) then
    raise exception 'target amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_current_amount < 0 or p_current_amount <> round(p_current_amount, 2) then
    raise exception 'current amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  insert into public.financial_goals (
    user_id,
    name,
    target_amount,
    current_amount,
    target_date,
    type,
    status,
    notes
  )
  values (
    v_user_id,
    trim(p_name),
    p_target_amount,
    p_current_amount,
    p_target_date,
    coalesce(p_type, 'other'),
    public.resolve_goal_status(p_target_amount, p_current_amount, 'active'),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning *
  into v_goal;

  return v_goal;
end;
$$;

create or replace function public.update_financial_goal(
  p_goal_id uuid,
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date,
  p_type public.financial_goal_type,
  p_notes text
)
returns public.financial_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.financial_goals;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_target_amount <= 0 or p_target_amount <> round(p_target_amount, 2) then
    raise exception 'target amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_current_amount < 0 or p_current_amount <> round(p_current_amount, 2) then
    raise exception 'current amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_goal
  from public.financial_goals
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'financial goal not found for current user' using errcode = '42501';
  end if;

  update public.financial_goals
  set
    name = trim(p_name),
    target_amount = p_target_amount,
    current_amount = p_current_amount,
    target_date = p_target_date,
    type = coalesce(p_type, 'other'),
    status = public.resolve_goal_status(p_target_amount, p_current_amount, v_goal.status),
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_goal_id
  returning *
  into v_goal;

  return v_goal;
end;
$$;

create or replace function public.update_goal_progress(
  p_goal_id uuid,
  p_amount_delta numeric
)
returns public.financial_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.financial_goals;
  v_new_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount_delta <= 0 or p_amount_delta <> round(p_amount_delta, 2) then
    raise exception 'goal progress delta must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_goal
  from public.financial_goals
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'financial goal not found for current user' using errcode = '42501';
  end if;

  v_new_amount := v_goal.current_amount + p_amount_delta;

  update public.financial_goals
  set
    current_amount = v_new_amount,
    status = public.resolve_goal_status(v_goal.target_amount, v_new_amount, v_goal.status)
  where id = p_goal_id
  returning *
  into v_goal;

  return v_goal;
end;
$$;

create or replace function public.cancel_financial_goal(
  p_goal_id uuid
)
returns public.financial_goals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.financial_goals;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  update public.financial_goals
  set status = 'cancelled'
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  returning *
  into v_goal;

  if v_goal.id is null then
    raise exception 'financial goal not found for current user' using errcode = '42501';
  end if;

  return v_goal;
end;
$$;

create or replace function public.get_monthly_plan_overview(
  p_reference_month date
)
returns table (
  monthly_plan_id uuid,
  reference_month date,
  expected_income numeric,
  savings_target numeric,
  spending_limit numeric,
  notes text,
  realized_income numeric,
  realized_expense numeric,
  realized_savings numeric,
  spending_remaining numeric,
  spending_usage_percentage numeric,
  savings_progress_percentage numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
  v_plan public.monthly_plans;
  v_realized_income numeric(14, 2);
  v_realized_expense numeric(14, 2);
  v_realized_savings numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_plan
  from public.monthly_plans
  where user_id = v_user_id
    and reference_month = v_reference_month
    and deleted_at is null;

  v_realized_income := public.monthly_realized_income(v_user_id, v_reference_month);
  v_realized_expense := public.monthly_realized_expense(v_user_id, v_reference_month);
  v_realized_savings := (v_realized_income - v_realized_expense)::numeric(14, 2);

  return query
  select
    v_plan.id,
    v_reference_month,
    v_plan.expected_income,
    coalesce(v_plan.savings_target, 0)::numeric(14, 2),
    v_plan.spending_limit,
    v_plan.notes,
    v_realized_income,
    v_realized_expense,
    v_realized_savings,
    case
      when v_plan.spending_limit is null then null
      else (v_plan.spending_limit - v_realized_expense)::numeric(14, 2)
    end,
    case
      when v_plan.spending_limit is null or v_plan.spending_limit = 0 then null
      else round((v_realized_expense / v_plan.spending_limit) * 100, 2)
    end,
    case
      when coalesce(v_plan.savings_target, 0) = 0 then null
      else round((v_realized_savings / v_plan.savings_target) * 100, 2)
    end;
end;
$$;

create or replace function public.get_category_budget_progress(
  p_reference_month date
)
returns table (
  budget_id uuid,
  monthly_plan_id uuid,
  category_id uuid,
  category_name text,
  category_icon text,
  category_color text,
  budget_amount numeric,
  spent_amount numeric,
  remaining_amount numeric,
  usage_percentage numeric,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
  v_period_end date := (public.normalize_reference_month(p_reference_month) + interval '1 month')::date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  return query
  with plan as (
    select mp.id
    from public.monthly_plans mp
    where mp.user_id = v_user_id
      and mp.reference_month = v_reference_month
      and mp.deleted_at is null
  ),
  bank_expenses as (
    select
      t.category_id,
      coalesce(sum(t.amount), 0)::numeric(14, 2) as spent_amount
    from public.transactions t
    where t.user_id = v_user_id
      and t.type = 'expense'
      and t.deleted_at is null
      and t.transaction_date >= v_reference_month
      and t.transaction_date < v_period_end
    group by t.category_id
  ),
  card_expenses as (
    select
      ct.category_id,
      coalesce(sum(ct.amount), 0)::numeric(14, 2) as spent_amount
    from public.credit_card_transactions ct
    where ct.user_id = v_user_id
      and ct.deleted_at is null
      and ct.purchase_date >= v_reference_month
      and ct.purchase_date < v_period_end
    group by ct.category_id
  ),
  spent as (
    select
      category_id,
      coalesce(sum(spent_amount), 0)::numeric(14, 2) as spent_amount
    from (
      select * from bank_expenses
      union all
      select * from card_expenses
    ) combined
    group by category_id
  )
  select
    cb.id,
    cb.monthly_plan_id,
    cb.category_id,
    c.name,
    c.icon,
    c.color,
    cb.budget_amount,
    coalesce(spent.spent_amount, 0)::numeric(14, 2),
    (cb.budget_amount - coalesce(spent.spent_amount, 0))::numeric(14, 2),
    case
      when cb.budget_amount = 0 then 0::numeric(14, 2)
      else round((coalesce(spent.spent_amount, 0) / cb.budget_amount) * 100, 2)
    end,
    case
      when coalesce(spent.spent_amount, 0) > cb.budget_amount then 'above_limit'
      when cb.budget_amount > 0 and coalesce(spent.spent_amount, 0) >= cb.budget_amount * 0.8 then 'near_limit'
      else 'within_limit'
    end::text
  from public.category_budgets cb
  join plan on plan.id = cb.monthly_plan_id
  join public.categories c
    on c.id = cb.category_id
   and c.user_id = v_user_id
   and c.type = 'expense'
   and c.is_active = true
   and c.deleted_at is null
  left join spent on spent.category_id = cb.category_id
  order by usage_percentage desc, c.name asc;
end;
$$;

create or replace function public.get_financial_projection(
  p_horizon_months integer default 3
)
returns table (
  reference_month date,
  opening_balance numeric,
  projected_income numeric,
  projected_expense numeric,
  projected_invoice_payment numeric,
  closing_balance numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_current_balance numeric(14, 2);
  v_horizon integer := greatest(1, least(coalesce(p_horizon_months, 3), 6));
  v_current_month date := date_trunc('month', current_date)::date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select coalesce(sum(a.current_balance), 0)::numeric(14, 2)
  into v_current_balance
  from public.accounts a
  where a.user_id = v_user_id
    and a.is_active = true
    and a.deleted_at is null;

  return query
  with months as (
    select
      public.add_months_to_period(v_current_month, month_index) as reference_month,
      month_index
    from generate_series(0, v_horizon - 1) as month_offsets(month_index)
  ),
  recurring_projection as (
    select
      m.reference_month,
      coalesce(sum(case when rt.type = 'income' then rt.amount else 0 end), 0)::numeric(14, 2) as projected_income,
      coalesce(sum(case when rt.type = 'expense' then rt.amount else 0 end), 0)::numeric(14, 2) as projected_expense
    from months m
    join public.recurring_transactions rt
      on rt.user_id = v_user_id
     and rt.status = 'active'
     and rt.deleted_at is null
    where public.compute_monthly_scheduled_date(m.reference_month, rt.day_of_month) >= greatest(current_date, rt.start_date)
      and public.compute_monthly_scheduled_date(m.reference_month, rt.day_of_month) < (m.reference_month + interval '1 month')::date
      and (rt.end_date is null or public.compute_monthly_scheduled_date(m.reference_month, rt.day_of_month) <= rt.end_date)
    group by m.reference_month
  ),
  invoice_projection as (
    select
      date_trunc('month', i.due_date)::date as reference_month,
      coalesce(sum(greatest(i.total_amount - i.paid_amount, 0)), 0)::numeric(14, 2) as projected_invoice_payment
    from public.credit_card_invoices i
    where i.user_id = v_user_id
      and i.due_date >= current_date
      and i.due_date < (public.add_months_to_period(v_current_month, v_horizon) + interval '1 month')::date
      and greatest(i.total_amount - i.paid_amount, 0) > 0
    group by date_trunc('month', i.due_date)::date
  ),
  monthly_net as (
    select
      m.reference_month,
      coalesce(rp.projected_income, 0)::numeric(14, 2) as projected_income,
      coalesce(rp.projected_expense, 0)::numeric(14, 2) as projected_expense,
      coalesce(ip.projected_invoice_payment, 0)::numeric(14, 2) as projected_invoice_payment,
      (
        coalesce(rp.projected_income, 0)
        - coalesce(rp.projected_expense, 0)
        - coalesce(ip.projected_invoice_payment, 0)
      )::numeric(14, 2) as net_change
    from months m
    left join recurring_projection rp on rp.reference_month = m.reference_month
    left join invoice_projection ip on ip.reference_month = m.reference_month
  )
  select
    mn.reference_month,
    (
      v_current_balance
      + coalesce(
        sum(mn.net_change) over (
          order by mn.reference_month
          rows between unbounded preceding and 1 preceding
        ),
        0
      )
    )::numeric(14, 2) as opening_balance,
    mn.projected_income,
    mn.projected_expense,
    mn.projected_invoice_payment,
    (
      v_current_balance
      + sum(mn.net_change) over (
        order by mn.reference_month
        rows between unbounded preceding and current row
      )
    )::numeric(14, 2) as closing_balance
  from monthly_net mn
  order by mn.reference_month asc;
end;
$$;

create or replace function public.get_upcoming_commitments(
  p_horizon_days integer default 45
)
returns table (
  kind text,
  source_id uuid,
  due_date date,
  title text,
  amount numeric,
  detail text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_horizon_days integer := greatest(1, least(coalesce(p_horizon_days, 45), 120));
  v_horizon_end date := current_date + v_horizon_days;
  v_current_month date := date_trunc('month', current_date)::date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  return query
  with recurring_months as (
    select public.add_months_to_period(v_current_month, offset_month) as reference_month
    from generate_series(0, 5) as month_offsets(offset_month)
  ),
  recurring_commitments as (
    select
      'recurring'::text as kind,
      rt.id as source_id,
      public.compute_monthly_scheduled_date(rm.reference_month, rt.day_of_month) as due_date,
      rt.description as title,
      rt.amount::numeric(14, 2) as amount,
      case
        when rt.type = 'income' then 'Receita recorrente'
        else 'Despesa recorrente'
      end::text as detail
    from public.recurring_transactions rt
    join recurring_months rm on true
    where rt.user_id = v_user_id
      and rt.status = 'active'
      and rt.deleted_at is null
      and public.compute_monthly_scheduled_date(rm.reference_month, rt.day_of_month) > current_date
      and public.compute_monthly_scheduled_date(rm.reference_month, rt.day_of_month) <= v_horizon_end
      and public.compute_monthly_scheduled_date(rm.reference_month, rt.day_of_month) >= rt.start_date
      and (
        rt.end_date is null
        or public.compute_monthly_scheduled_date(rm.reference_month, rt.day_of_month) <= rt.end_date
      )
  ),
  invoice_commitments as (
    select
      'invoice'::text as kind,
      i.id as source_id,
      i.due_date,
      cc.name as title,
      greatest(i.total_amount - i.paid_amount, 0)::numeric(14, 2) as amount,
      'Fatura de cartao'::text as detail
    from public.credit_card_invoices i
    join public.credit_cards cc on cc.id = i.credit_card_id
    where i.user_id = v_user_id
      and i.due_date > current_date
      and i.due_date <= v_horizon_end
      and greatest(i.total_amount - i.paid_amount, 0) > 0
  ),
  installment_commitments as (
    select
      'installment'::text as kind,
      ct.id as source_id,
      ct.purchase_date as due_date,
      ct.description as title,
      ct.amount::numeric(14, 2) as amount,
      (ct.installment_number::text || '/' || ct.installment_count::text)::text as detail
    from public.credit_card_transactions ct
    where ct.user_id = v_user_id
      and ct.installment_plan_id is not null
      and ct.deleted_at is null
      and ct.purchase_date > current_date
      and ct.purchase_date <= v_horizon_end
  ),
  goal_commitments as (
    select
      'goal'::text as kind,
      fg.id as source_id,
      fg.target_date as due_date,
      fg.name as title,
      greatest(fg.target_amount - fg.current_amount, 0)::numeric(14, 2) as amount,
      'Meta financeira'::text as detail
    from public.financial_goals fg
    where fg.user_id = v_user_id
      and fg.deleted_at is null
      and fg.status = 'active'
      and fg.target_date is not null
      and fg.target_date > current_date
      and fg.target_date <= v_horizon_end
  )
  select *
  from (
    select * from recurring_commitments
    union all
    select * from invoice_commitments
    union all
    select * from installment_commitments
    union all
    select * from goal_commitments
  ) commitments
  order by due_date asc, title asc
  limit 20;
end;
$$;

grant select on public.credit_card_installment_plans to authenticated;
grant select on public.recurring_transactions to authenticated;
grant select on public.recurring_transaction_occurrences to authenticated;
grant select on public.monthly_plans to authenticated;
grant select on public.category_budgets to authenticated;
grant select on public.financial_goals to authenticated;

revoke execute on function public.create_credit_card_installment_purchase(
  uuid,
  uuid,
  text,
  numeric,
  date,
  text,
  smallint,
  uuid
) from public, anon;
grant execute on function public.create_credit_card_installment_purchase(
  uuid,
  uuid,
  text,
  numeric,
  date,
  text,
  smallint,
  uuid
) to authenticated;

revoke execute on function public.update_credit_card_installment_plan(
  uuid,
  uuid,
  text,
  text
) from public, anon;
grant execute on function public.update_credit_card_installment_plan(
  uuid,
  uuid,
  text,
  text
) to authenticated;

revoke execute on function public.cancel_credit_card_installment_plan(uuid) from public, anon;
grant execute on function public.cancel_credit_card_installment_plan(uuid) to authenticated;

revoke execute on function public.create_recurring_transaction(
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
) from public, anon;
grant execute on function public.create_recurring_transaction(
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
) to authenticated;

revoke execute on function public.update_recurring_transaction(
  uuid,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
) from public, anon;
grant execute on function public.update_recurring_transaction(
  uuid,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  smallint,
  date,
  date,
  text
) to authenticated;

revoke execute on function public.pause_recurring_transaction(uuid) from public, anon;
grant execute on function public.pause_recurring_transaction(uuid) to authenticated;

revoke execute on function public.resume_recurring_transaction(uuid) from public, anon;
grant execute on function public.resume_recurring_transaction(uuid) to authenticated;

revoke execute on function public.cancel_recurring_transaction(uuid) from public, anon;
grant execute on function public.cancel_recurring_transaction(uuid) to authenticated;

revoke execute on function public.generate_due_recurring_transactions() from public, anon;
grant execute on function public.generate_due_recurring_transactions() to authenticated;

revoke execute on function public.upsert_monthly_plan(
  date,
  numeric,
  numeric,
  numeric,
  text
) from public, anon;
grant execute on function public.upsert_monthly_plan(
  date,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;

revoke execute on function public.upsert_category_budget(
  uuid,
  uuid,
  numeric
) from public, anon;
grant execute on function public.upsert_category_budget(
  uuid,
  uuid,
  numeric
) to authenticated;

revoke execute on function public.create_financial_goal(
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) from public, anon;
grant execute on function public.create_financial_goal(
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) to authenticated;

revoke execute on function public.update_financial_goal(
  uuid,
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) from public, anon;
grant execute on function public.update_financial_goal(
  uuid,
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) to authenticated;

revoke execute on function public.update_goal_progress(uuid, numeric) from public, anon;
grant execute on function public.update_goal_progress(uuid, numeric) to authenticated;

revoke execute on function public.cancel_financial_goal(uuid) from public, anon;
grant execute on function public.cancel_financial_goal(uuid) to authenticated;

revoke execute on function public.get_monthly_plan_overview(date) from public, anon;
grant execute on function public.get_monthly_plan_overview(date) to authenticated;

revoke execute on function public.get_category_budget_progress(date) from public, anon;
grant execute on function public.get_category_budget_progress(date) to authenticated;

revoke execute on function public.get_financial_projection(integer) from public, anon;
grant execute on function public.get_financial_projection(integer) to authenticated;

revoke execute on function public.get_upcoming_commitments(integer) from public, anon;
grant execute on function public.get_upcoming_commitments(integer) to authenticated;

revoke execute on function public.uuid_from_text(text) from public, anon, authenticated;
revoke execute on function public.shift_month_preserving_day(date, integer) from public, anon, authenticated;
revoke execute on function public.compute_monthly_scheduled_date(date, smallint) from public, anon, authenticated;
revoke execute on function public.refresh_credit_card_installment_plan_status(uuid) from public, anon, authenticated;
revoke execute on function public.create_recurring_generated_transaction(
  uuid,
  uuid,
  date,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  date,
  text
) from public, anon, authenticated;
revoke execute on function public.normalize_reference_month(date) from public, anon, authenticated;
revoke execute on function public.add_months_to_period(date, integer) from public, anon, authenticated;
revoke execute on function public.resolve_goal_status(
  numeric,
  numeric,
  public.financial_goal_status
) from public, anon, authenticated;
revoke execute on function public.assert_monthly_plan_matches_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.assert_expense_category_matches_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.monthly_realized_income(uuid, date) from public, anon, authenticated;
revoke execute on function public.monthly_realized_expense(uuid, date) from public, anon, authenticated;

alter table public.credit_card_installment_plans enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.recurring_transaction_occurrences enable row level security;
alter table public.monthly_plans enable row level security;
alter table public.category_budgets enable row level security;
alter table public.financial_goals enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'credit_card_installment_plans'
      and policyname = 'authenticated users can select own installment plans'
  ) then
    create policy "authenticated users can select own installment plans"
    on public.credit_card_installment_plans
    for select
    to authenticated
    using ((select auth.uid()) = user_id and deleted_at is null);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recurring_transactions'
      and policyname = 'authenticated users can select own recurring transactions'
  ) then
    create policy "authenticated users can select own recurring transactions"
    on public.recurring_transactions
    for select
    to authenticated
    using ((select auth.uid()) = user_id and deleted_at is null);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'recurring_transaction_occurrences'
      and policyname = 'authenticated users can select own recurring transaction occurrences'
  ) then
    create policy "authenticated users can select own recurring transaction occurrences"
    on public.recurring_transaction_occurrences
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_plans'
      and policyname = 'authenticated users can select own monthly plans'
  ) then
    create policy "authenticated users can select own monthly plans"
    on public.monthly_plans
    for select
    to authenticated
    using ((select auth.uid()) = user_id and deleted_at is null);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'category_budgets'
      and policyname = 'authenticated users can select own category budgets'
  ) then
    create policy "authenticated users can select own category budgets"
    on public.category_budgets
    for select
    to authenticated
    using ((select auth.uid()) = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'financial_goals'
      and policyname = 'authenticated users can select own financial goals'
  ) then
    create policy "authenticated users can select own financial goals"
    on public.financial_goals
    for select
    to authenticated
    using ((select auth.uid()) = user_id and deleted_at is null);
  end if;
end;
$$;
