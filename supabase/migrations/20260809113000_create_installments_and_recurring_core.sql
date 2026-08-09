create type public.credit_card_installment_plan_status as enum ('active', 'cancelled', 'completed');

create type public.recurring_transaction_frequency as enum ('monthly');

create type public.recurring_transaction_status as enum ('active', 'paused', 'cancelled');

create table public.credit_card_installment_plans (
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

alter table public.credit_card_transactions
add column installment_plan_id uuid references public.credit_card_installment_plans (id),
add column installment_number smallint,
add column installment_count smallint,
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

create table public.recurring_transactions (
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

alter table public.transactions
add column recurring_transaction_id uuid references public.recurring_transactions (id),
add column recurrence_period date,
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

create table public.recurring_transaction_occurrences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recurring_transaction_id uuid not null references public.recurring_transactions (id) on delete cascade,
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  reference_period date not null,
  scheduled_date date not null,
  created_at timestamptz not null default timezone('utc', now())
);

create unique index credit_card_installment_plans_user_mutation_unique
on public.credit_card_installment_plans (user_id, client_mutation_id);

create index credit_card_installment_plans_user_status_idx
on public.credit_card_installment_plans (user_id, status, purchase_date desc)
where deleted_at is null;

create index credit_card_installment_plans_card_idx
on public.credit_card_installment_plans (credit_card_id, created_at desc)
where deleted_at is null;

create index credit_card_transactions_installment_plan_idx
on public.credit_card_transactions (installment_plan_id, installment_number)
where installment_plan_id is not null and deleted_at is null;

create unique index credit_card_transactions_installment_plan_number_unique
on public.credit_card_transactions (installment_plan_id, installment_number)
where installment_plan_id is not null and deleted_at is null;

create index recurring_transactions_user_status_idx
on public.recurring_transactions (user_id, status, start_date)
where deleted_at is null;

create index recurring_transactions_account_idx
on public.recurring_transactions (account_id, status)
where deleted_at is null;

create unique index transactions_recurring_period_unique
on public.transactions (recurring_transaction_id, recurrence_period)
where recurring_transaction_id is not null and deleted_at is null;

create index transactions_recurring_id_idx
on public.transactions (recurring_transaction_id, recurrence_period desc)
where recurring_transaction_id is not null and deleted_at is null;

create unique index recurring_transaction_occurrences_period_unique
on public.recurring_transaction_occurrences (recurring_transaction_id, reference_period);

create unique index recurring_transaction_occurrences_transaction_unique
on public.recurring_transaction_occurrences (transaction_id);

create index recurring_transaction_occurrences_user_period_idx
on public.recurring_transaction_occurrences (user_id, reference_period desc);

create trigger credit_card_installment_plans_set_updated_at
before update on public.credit_card_installment_plans
for each row
execute function public.set_updated_at();

create trigger recurring_transactions_set_updated_at
before update on public.recurring_transactions
for each row
execute function public.set_updated_at();

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

grant select on public.credit_card_installment_plans to authenticated;
grant select on public.recurring_transactions to authenticated;
grant select on public.recurring_transaction_occurrences to authenticated;
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
grant execute on function public.update_credit_card_installment_plan(
  uuid,
  uuid,
  text,
  text
) to authenticated;
grant execute on function public.cancel_credit_card_installment_plan(uuid) to authenticated;
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
grant execute on function public.pause_recurring_transaction(uuid) to authenticated;
grant execute on function public.resume_recurring_transaction(uuid) to authenticated;
grant execute on function public.cancel_recurring_transaction(uuid) to authenticated;
grant execute on function public.generate_due_recurring_transactions() to authenticated;

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

alter table public.credit_card_installment_plans enable row level security;
alter table public.recurring_transactions enable row level security;
alter table public.recurring_transaction_occurrences enable row level security;

create policy "authenticated users can select own installment plans"
on public.credit_card_installment_plans
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can select own recurring transactions"
on public.recurring_transactions
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can select own recurring transaction occurrences"
on public.recurring_transaction_occurrences
for select
to authenticated
using ((select auth.uid()) = user_id);
