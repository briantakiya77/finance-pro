alter type public.financial_goal_type add value if not exists 'general';
alter type public.financial_goal_type add value if not exists 'investment';

alter table public.monthly_plans
add column if not exists minimum_reserve_amount numeric(14, 2) not null default 0,
add constraint monthly_plans_minimum_reserve_amount_scale check (
  minimum_reserve_amount >= 0
  and minimum_reserve_amount = round(minimum_reserve_amount, 2)
);

alter table public.financial_goals
add column if not exists target_months smallint,
add constraint financial_goals_target_months_check check (
  target_months is null or target_months in (3, 6, 9, 12)
);

create table if not exists public.financial_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null references public.financial_goals (id) on delete cascade,
  account_id uuid references public.accounts (id),
  amount numeric(14, 2) not null,
  contribution_date date not null,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint financial_goal_contributions_amount_scale check (
    amount > 0 and amount = round(amount, 2)
  ),
  constraint financial_goal_contributions_description_length check (
    description is null or char_length(description) <= 240
  )
);

create index if not exists financial_goal_contributions_goal_date_idx
on public.financial_goal_contributions (goal_id, contribution_date desc, created_at desc);

create index if not exists financial_goal_contributions_user_goal_idx
on public.financial_goal_contributions (user_id, goal_id);

create trigger financial_goal_contributions_set_updated_at
before update on public.financial_goal_contributions
for each row
execute function public.set_updated_at();

create or replace function public.resolve_budget_status(
  p_usage_percentage numeric
)
returns text
language plpgsql
immutable
set search_path = public
as $$
begin
  if p_usage_percentage >= 100 then
    return 'exceeded';
  end if;

  if p_usage_percentage >= 90 then
    return 'critical';
  end if;

  if p_usage_percentage >= 70 then
    return 'attention';
  end if;

  return 'within_limit';
end;
$$;

create or replace function public.assert_goal_matches_user(
  p_user_id uuid,
  p_goal_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.financial_goals fg
    where fg.id = p_goal_id
      and fg.user_id = p_user_id
      and fg.deleted_at is null
  );
$$;

create or replace function public.list_monthly_budget_events(
  p_reference_month date
)
returns table (
  category_id uuid,
  due_date date,
  amount numeric,
  stage text,
  source_kind text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
  v_period_end date := (public.normalize_reference_month(p_reference_month) + interval '1 month')::date;
  v_today date := current_date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  return query
  with bank_expenses as (
    select
      t.category_id,
      t.transaction_date as due_date,
      t.amount::numeric(14, 2) as amount,
      case
        when t.transaction_date <= v_today then 'realized'
        else 'forecast'
      end::text as stage,
      'bank_transaction'::text as source_kind
    from public.transactions t
    where t.user_id = v_user_id
      and t.type = 'expense'
      and t.category_id is not null
      and t.deleted_at is null
      and t.transaction_date >= v_reference_month
      and t.transaction_date < v_period_end
  ),
  card_expenses as (
    select
      ct.category_id,
      ct.purchase_date as due_date,
      ct.amount::numeric(14, 2) as amount,
      case
        when ct.purchase_date <= v_today then 'realized'
        else 'forecast'
      end::text as stage,
      'credit_card_purchase'::text as source_kind
    from public.credit_card_transactions ct
    where ct.user_id = v_user_id
      and ct.category_id is not null
      and ct.deleted_at is null
      and ct.purchase_date >= v_reference_month
      and ct.purchase_date < v_period_end
  ),
  recurring_expenses as (
    select
      rt.category_id,
      rcw.due_date,
      rcw.amount::numeric(14, 2) as amount,
      'forecast'::text as stage,
      'recurring_commitment'::text as source_kind
    from public.list_recurring_commitment_window(
      greatest(v_reference_month, v_today + 1),
      (v_period_end - interval '1 day')::date
    ) rcw
    join public.recurring_transactions rt
      on rt.id = rcw.recurring_transaction_id
     and rt.user_id = v_user_id
    where rcw.type = 'expense'
      and rt.category_id is not null
  )
  select *
  from (
    select * from bank_expenses
    union all
    select * from card_expenses
    union all
    select * from recurring_expenses
  ) events;
end;
$$;

create or replace function public.list_monthly_income_events(
  p_reference_month date
)
returns table (
  due_date date,
  amount numeric,
  stage text,
  source_kind text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
  v_period_end date := (public.normalize_reference_month(p_reference_month) + interval '1 month')::date;
  v_today date := current_date;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  return query
  with bank_income as (
    select
      t.transaction_date as due_date,
      t.amount::numeric(14, 2) as amount,
      case
        when t.transaction_date <= v_today then 'realized'
        else 'forecast'
      end::text as stage,
      'bank_transaction'::text as source_kind
    from public.transactions t
    where t.user_id = v_user_id
      and t.type = 'income'
      and t.deleted_at is null
      and t.transaction_date >= v_reference_month
      and t.transaction_date < v_period_end
  ),
  recurring_income as (
    select
      rcw.due_date,
      rcw.amount::numeric(14, 2) as amount,
      'forecast'::text as stage,
      'recurring_commitment'::text as source_kind
    from public.list_recurring_commitment_window(
      greatest(v_reference_month, v_today + 1),
      (v_period_end - interval '1 day')::date
    ) rcw
    where rcw.type = 'income'
  )
  select *
  from (
    select * from bank_income
    union all
    select * from recurring_income
  ) events;
end;
$$;

create or replace function public.get_month_invoice_cash_obligation(
  p_reference_month date
)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
  v_period_end date := (public.normalize_reference_month(p_reference_month) + interval '1 month')::date;
  v_obligation numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  with due_invoices as (
    select
      i.id,
      greatest(i.total_amount - i.paid_amount, 0)::numeric(14, 2) as outstanding_amount
    from public.credit_card_invoices i
    where i.user_id = v_user_id
      and i.due_date >= greatest(current_date, v_reference_month)
      and i.due_date < v_period_end
      and greatest(i.total_amount - i.paid_amount, 0) > 0
  ),
  future_purchases_in_due_invoices as (
    select
      ct.invoice_id,
      coalesce(sum(ct.amount), 0)::numeric(14, 2) as future_amount
    from public.credit_card_transactions ct
    join due_invoices di on di.id = ct.invoice_id
    where ct.user_id = v_user_id
      and ct.deleted_at is null
      and ct.purchase_date > current_date
      and ct.purchase_date < v_period_end
    group by ct.invoice_id
  )
  select
    greatest(
      coalesce(sum(di.outstanding_amount - coalesce(fp.future_amount, 0)), 0),
      0
    )::numeric(14, 2)
  into v_obligation
  from due_invoices di
  left join future_purchases_in_due_invoices fp on fp.invoice_id = di.id;

  return coalesce(v_obligation, 0)::numeric(14, 2);
end;
$$;

drop function if exists public.create_financial_goal(
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
);

create or replace function public.create_financial_goal(
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date,
  p_type public.financial_goal_type,
  p_notes text,
  p_target_months smallint default null
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

  if p_target_months is not null and p_target_months not in (3, 6, 9, 12) then
    raise exception 'goal target months must be 3, 6, 9 or 12' using errcode = '23514';
  end if;

  insert into public.financial_goals (
    user_id,
    name,
    target_amount,
    current_amount,
    target_date,
    type,
    status,
    notes,
    target_months
  )
  values (
    v_user_id,
    trim(p_name),
    p_target_amount,
    p_current_amount,
    p_target_date,
    coalesce(p_type, 'general'),
    public.resolve_goal_status(p_target_amount, p_current_amount, 'active'),
    nullif(trim(coalesce(p_notes, '')), ''),
    p_target_months
  )
  returning *
  into v_goal;

  return v_goal;
end;
$$;

drop function if exists public.update_financial_goal(
  uuid,
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text
);

create or replace function public.update_financial_goal(
  p_goal_id uuid,
  p_name text,
  p_target_amount numeric,
  p_current_amount numeric,
  p_target_date date,
  p_type public.financial_goal_type,
  p_notes text,
  p_target_months smallint default null
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

  if p_target_months is not null and p_target_months not in (3, 6, 9, 12) then
    raise exception 'goal target months must be 3, 6, 9 or 12' using errcode = '23514';
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
    type = coalesce(p_type, 'general'),
    status = public.resolve_goal_status(p_target_amount, p_current_amount, v_goal.status),
    notes = nullif(trim(coalesce(p_notes, '')), ''),
    target_months = p_target_months
  where id = p_goal_id
  returning *
  into v_goal;

  return v_goal;
end;
$$;

create or replace function public.create_goal_contribution(
  p_goal_id uuid,
  p_amount numeric,
  p_contribution_date date,
  p_description text,
  p_account_id uuid default null
)
returns public.financial_goal_contributions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_goal public.financial_goals;
  v_contribution public.financial_goal_contributions;
  v_new_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'goal contribution amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if not public.assert_goal_matches_user(v_user_id, p_goal_id) then
    raise exception 'financial goal not found for current user' using errcode = '42501';
  end if;

  if p_account_id is not null and not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  select *
  into v_goal
  from public.financial_goals
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if v_goal.status = 'cancelled' then
    raise exception 'cancelled financial goal cannot receive contributions' using errcode = '23514';
  end if;

  insert into public.financial_goal_contributions (
    user_id,
    goal_id,
    account_id,
    amount,
    contribution_date,
    description
  )
  values (
    v_user_id,
    p_goal_id,
    p_account_id,
    p_amount,
    p_contribution_date,
    nullif(trim(coalesce(p_description, '')), '')
  )
  returning *
  into v_contribution;

  v_new_amount := (v_goal.current_amount + p_amount)::numeric(14, 2);

  update public.financial_goals
  set
    current_amount = v_new_amount,
    status = public.resolve_goal_status(v_goal.target_amount, v_new_amount, v_goal.status)
  where id = p_goal_id;

  return v_contribution;
end;
$$;

create or replace function public.list_goal_contributions(
  p_goal_id uuid
)
returns table (
  id uuid,
  goal_id uuid,
  account_id uuid,
  amount numeric,
  contribution_date date,
  description text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if not public.assert_goal_matches_user(v_user_id, p_goal_id) then
    raise exception 'financial goal not found for current user' using errcode = '42501';
  end if;

  return query
  select
    fgc.id,
    fgc.goal_id,
    fgc.account_id,
    fgc.amount,
    fgc.contribution_date,
    fgc.description,
    fgc.created_at
  from public.financial_goal_contributions fgc
  where fgc.user_id = v_user_id
    and fgc.goal_id = p_goal_id
  order by fgc.contribution_date desc, fgc.created_at desc;
end;
$$;

drop function if exists public.upsert_monthly_plan(
  date,
  numeric,
  numeric,
  numeric,
  text
);

create or replace function public.upsert_monthly_plan(
  p_reference_month date,
  p_expected_income numeric,
  p_savings_target numeric,
  p_spending_limit numeric,
  p_notes text,
  p_minimum_reserve_amount numeric default 0
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

  if p_minimum_reserve_amount < 0 or p_minimum_reserve_amount <> round(p_minimum_reserve_amount, 2) then
    raise exception 'minimum reserve amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  v_reference_month := public.normalize_reference_month(p_reference_month);

  insert into public.monthly_plans (
    user_id,
    reference_month,
    expected_income,
    savings_target,
    spending_limit,
    notes,
    deleted_at,
    minimum_reserve_amount
  )
  values (
    v_user_id,
    v_reference_month,
    p_expected_income,
    p_savings_target,
    p_spending_limit,
    nullif(trim(coalesce(p_notes, '')), ''),
    null,
    p_minimum_reserve_amount
  )
  on conflict (user_id, reference_month) do update
  set
    expected_income = excluded.expected_income,
    savings_target = excluded.savings_target,
    spending_limit = excluded.spending_limit,
    notes = excluded.notes,
    deleted_at = null,
    minimum_reserve_amount = excluded.minimum_reserve_amount
  returning *
  into v_plan;

  return v_plan;
end;
$$;

drop function if exists public.get_monthly_plan_overview(date);

create or replace function public.get_monthly_plan_overview(
  p_reference_month date
)
returns table (
  monthly_plan_id uuid,
  reference_month date,
  expected_income numeric,
  savings_target numeric,
  spending_limit numeric,
  minimum_reserve_amount numeric,
  notes text,
  realized_income numeric,
  forecast_income numeric,
  realized_expense numeric,
  forecast_expense numeric,
  invoice_cash_obligation numeric,
  realized_savings numeric,
  projected_income_total numeric,
  projected_expense_total numeric,
  projected_month_end_balance numeric,
  safe_to_spend numeric,
  monthly_budget_total numeric,
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
  v_forecast_income numeric(14, 2);
  v_realized_expense numeric(14, 2);
  v_forecast_expense numeric(14, 2);
  v_realized_savings numeric(14, 2);
  v_projected_income_total numeric(14, 2);
  v_projected_expense_total numeric(14, 2);
  v_monthly_budget_total numeric(14, 2);
  v_accounts_balance numeric(14, 2);
  v_invoice_cash_obligation numeric(14, 2);
  v_projected_month_end_balance numeric(14, 2);
  v_safe_to_spend numeric(14, 2);
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

  select coalesce(sum(case when stage = 'realized' then amount else 0 end), 0)::numeric(14, 2)
  into v_realized_income
  from public.list_monthly_income_events(v_reference_month);

  select coalesce(sum(case when stage = 'forecast' then amount else 0 end), 0)::numeric(14, 2)
  into v_forecast_income
  from public.list_monthly_income_events(v_reference_month);

  select coalesce(sum(case when stage = 'realized' then amount else 0 end), 0)::numeric(14, 2)
  into v_realized_expense
  from public.list_monthly_budget_events(v_reference_month);

  select coalesce(sum(case when stage = 'forecast' then amount else 0 end), 0)::numeric(14, 2)
  into v_forecast_expense
  from public.list_monthly_budget_events(v_reference_month);

  select coalesce(sum(cb.budget_amount), 0)::numeric(14, 2)
  into v_monthly_budget_total
  from public.category_budgets cb
  join public.monthly_plans mp on mp.id = cb.monthly_plan_id
  where cb.user_id = v_user_id
    and mp.reference_month = v_reference_month
    and mp.deleted_at is null;

  select coalesce(sum(a.current_balance), 0)::numeric(14, 2)
  into v_accounts_balance
  from public.accounts a
  where a.user_id = v_user_id
    and a.is_active = true
    and a.deleted_at is null;

  v_invoice_cash_obligation := public.get_month_invoice_cash_obligation(v_reference_month);
  v_realized_savings := (v_realized_income - v_realized_expense)::numeric(14, 2);
  v_projected_income_total := (v_realized_income + v_forecast_income)::numeric(14, 2);
  v_projected_expense_total := (v_realized_expense + v_forecast_expense)::numeric(14, 2);
  v_projected_month_end_balance := (
    v_accounts_balance
    + v_forecast_income
    - v_forecast_expense
    - v_invoice_cash_obligation
  )::numeric(14, 2);
  v_safe_to_spend := (
    v_projected_month_end_balance - coalesce(v_plan.minimum_reserve_amount, 0)
  )::numeric(14, 2);

  return query
  select
    v_plan.id,
    v_reference_month,
    v_plan.expected_income,
    coalesce(v_plan.savings_target, 0)::numeric(14, 2),
    v_plan.spending_limit,
    coalesce(v_plan.minimum_reserve_amount, 0)::numeric(14, 2),
    v_plan.notes,
    v_realized_income,
    v_forecast_income,
    v_realized_expense,
    v_forecast_expense,
    v_invoice_cash_obligation,
    v_realized_savings,
    v_projected_income_total,
    v_projected_expense_total,
    v_projected_month_end_balance,
    v_safe_to_spend,
    v_monthly_budget_total,
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

drop function if exists public.get_category_budget_progress(date);

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
  status text,
  realized_amount numeric,
  forecast_amount numeric,
  projected_amount numeric,
  projected_remaining_amount numeric,
  projected_overage_amount numeric,
  projected_usage_percentage numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_reference_month date := public.normalize_reference_month(p_reference_month);
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
  events as (
    select *
    from public.list_monthly_budget_events(v_reference_month)
  ),
  event_totals as (
    select
      e.category_id,
      coalesce(sum(case when e.stage = 'realized' then e.amount else 0 end), 0)::numeric(14, 2) as realized_amount,
      coalesce(sum(case when e.stage = 'forecast' then e.amount else 0 end), 0)::numeric(14, 2) as forecast_amount
    from events e
    group by e.category_id
  )
  select
    cb.id,
    cb.monthly_plan_id,
    cb.category_id,
    c.name,
    c.icon,
    c.color,
    cb.budget_amount,
    coalesce(et.realized_amount, 0)::numeric(14, 2) as spent_amount,
    (cb.budget_amount - coalesce(et.realized_amount, 0))::numeric(14, 2) as remaining_amount,
    case
      when cb.budget_amount = 0 then 0::numeric(14, 2)
      else round((coalesce(et.realized_amount, 0) / cb.budget_amount) * 100, 2)
    end,
    public.resolve_budget_status(
      case
        when cb.budget_amount = 0 then 0
        else round((((coalesce(et.realized_amount, 0) + coalesce(et.forecast_amount, 0)) / cb.budget_amount) * 100), 2)
      end
    )::text as status,
    coalesce(et.realized_amount, 0)::numeric(14, 2),
    coalesce(et.forecast_amount, 0)::numeric(14, 2),
    (coalesce(et.realized_amount, 0) + coalesce(et.forecast_amount, 0))::numeric(14, 2) as projected_amount,
    (cb.budget_amount - (coalesce(et.realized_amount, 0) + coalesce(et.forecast_amount, 0)))::numeric(14, 2) as projected_remaining_amount,
    greatest((coalesce(et.realized_amount, 0) + coalesce(et.forecast_amount, 0)) - cb.budget_amount, 0)::numeric(14, 2) as projected_overage_amount,
    case
      when cb.budget_amount = 0 then 0::numeric(14, 2)
      else round((((coalesce(et.realized_amount, 0) + coalesce(et.forecast_amount, 0)) / cb.budget_amount) * 100), 2)
    end as projected_usage_percentage
  from public.category_budgets cb
  join plan on plan.id = cb.monthly_plan_id
  join public.categories c
    on c.id = cb.category_id
   and c.user_id = v_user_id
   and c.type = 'expense'
   and c.is_active = true
   and c.deleted_at is null
  left join event_totals et on et.category_id = cb.category_id
  order by projected_usage_percentage desc, c.name asc;
end;
$$;

grant select on public.financial_goal_contributions to authenticated;

grant execute on function public.create_financial_goal(
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text,
  smallint
) to authenticated;

grant execute on function public.update_financial_goal(
  uuid,
  text,
  numeric,
  numeric,
  date,
  public.financial_goal_type,
  text,
  smallint
) to authenticated;

grant execute on function public.create_goal_contribution(
  uuid,
  numeric,
  date,
  text,
  uuid
) to authenticated;

grant execute on function public.list_goal_contributions(uuid) to authenticated;

grant execute on function public.upsert_monthly_plan(
  date,
  numeric,
  numeric,
  numeric,
  text,
  numeric
) to authenticated;

grant execute on function public.get_month_invoice_cash_obligation(date) to authenticated;

revoke execute on function public.resolve_budget_status(numeric) from public, anon, authenticated;
revoke execute on function public.assert_goal_matches_user(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.list_monthly_budget_events(date) from public, anon, authenticated;
revoke execute on function public.list_monthly_income_events(date) from public, anon, authenticated;

alter table public.financial_goal_contributions enable row level security;

create policy "authenticated users can select own goal contributions"
on public.financial_goal_contributions
for select
to authenticated
using ((select auth.uid()) = user_id);
