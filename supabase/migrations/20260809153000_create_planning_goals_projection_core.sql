create type public.financial_goal_status as enum ('active', 'completed', 'cancelled');

create type public.financial_goal_type as enum (
  'emergency_fund',
  'purchase',
  'travel',
  'education',
  'other'
);

create table public.monthly_plans (
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

create table public.category_budgets (
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

create table public.financial_goals (
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

create unique index monthly_plans_user_reference_month_unique
on public.monthly_plans (user_id, reference_month);

create index monthly_plans_user_reference_idx
on public.monthly_plans (user_id, reference_month desc)
where deleted_at is null;

create unique index category_budgets_plan_category_unique
on public.category_budgets (monthly_plan_id, category_id);

create index category_budgets_user_plan_idx
on public.category_budgets (user_id, monthly_plan_id);

create index financial_goals_user_status_idx
on public.financial_goals (user_id, status, created_at desc)
where deleted_at is null;

create index financial_goals_user_target_date_idx
on public.financial_goals (user_id, target_date)
where deleted_at is null and status = 'active';

create trigger monthly_plans_set_updated_at
before update on public.monthly_plans
for each row
execute function public.set_updated_at();

create trigger category_budgets_set_updated_at
before update on public.category_budgets
for each row
execute function public.set_updated_at();

create trigger financial_goals_set_updated_at
before update on public.financial_goals
for each row
execute function public.set_updated_at();

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

grant select on public.monthly_plans to authenticated;
grant select on public.category_budgets to authenticated;
grant select on public.financial_goals to authenticated;

grant execute on function public.upsert_monthly_plan(
  date,
  numeric,
  numeric,
  numeric,
  text
) to authenticated;
grant execute on function public.upsert_category_budget(
  uuid,
  uuid,
  numeric
) to authenticated;
grant execute on function public.create_financial_goal(
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) to authenticated;
grant execute on function public.update_financial_goal(
  uuid,
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
) to authenticated;
grant execute on function public.update_goal_progress(
  uuid,
  numeric
) to authenticated;
grant execute on function public.cancel_financial_goal(uuid) to authenticated;
grant execute on function public.get_monthly_plan_overview(date) to authenticated;
grant execute on function public.get_category_budget_progress(date) to authenticated;
grant execute on function public.get_financial_projection(integer) to authenticated;
grant execute on function public.get_upcoming_commitments(integer) to authenticated;

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

alter table public.monthly_plans enable row level security;
alter table public.category_budgets enable row level security;
alter table public.financial_goals enable row level security;

create policy "authenticated users can select own monthly plans"
on public.monthly_plans
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can select own category budgets"
on public.category_budgets
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "authenticated users can select own financial goals"
on public.financial_goals
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);
