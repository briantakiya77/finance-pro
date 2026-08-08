create type public.credit_card_invoice_status as enum ('open', 'closed', 'paid');

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  bank text not null,
  brand text,
  last_four text,
  limit_amount numeric(14, 2) not null,
  closing_day smallint not null,
  due_day smallint not null,
  color text not null default '#8B5CF6',
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_cards_name_length check (char_length(name) between 2 and 120),
  constraint credit_cards_bank_length check (char_length(bank) between 2 and 120),
  constraint credit_cards_brand_length check (brand is null or char_length(brand) between 2 and 60),
  constraint credit_cards_last_four_format check (last_four is null or last_four ~ '^\d{4}$'),
  constraint credit_cards_limit_positive check (limit_amount > 0),
  constraint credit_cards_closing_day_range check (closing_day between 1 and 31),
  constraint credit_cards_due_day_range check (due_day between 1 and 31),
  constraint credit_cards_color_format check (color ~ '^#([A-Fa-f0-9]{6})$'),
  constraint credit_cards_deleted_requires_inactive check (deleted_at is null or is_active = false)
);

create table public.credit_card_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards (id),
  reference_month date not null,
  closing_date date not null,
  due_date date not null,
  status public.credit_card_invoice_status not null default 'open',
  total_amount numeric(14, 2) not null default 0,
  paid_amount numeric(14, 2) not null default 0,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_card_invoices_total_non_negative check (total_amount >= 0),
  constraint credit_card_invoices_paid_non_negative check (paid_amount >= 0),
  constraint credit_card_invoices_paid_not_above_total check (paid_amount <= total_amount)
);

create table public.credit_card_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  credit_card_id uuid not null references public.credit_cards (id),
  invoice_id uuid not null references public.credit_card_invoices (id),
  category_id uuid references public.categories (id),
  description text not null,
  amount numeric(14, 2) not null,
  purchase_date date not null,
  notes text,
  client_mutation_id uuid not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint credit_card_transactions_description_length check (char_length(description) between 2 and 160),
  constraint credit_card_transactions_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint credit_card_transactions_amount_positive check (amount > 0),
  constraint credit_card_transactions_amount_scale check (amount = round(amount, 2))
);

create table public.credit_card_invoice_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null references public.credit_card_invoices (id),
  account_id uuid not null references public.accounts (id),
  amount numeric(14, 2) not null,
  paid_at timestamptz not null default timezone('utc', now()),
  client_mutation_id uuid not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint credit_card_invoice_payments_amount_positive check (amount > 0),
  constraint credit_card_invoice_payments_amount_scale check (amount = round(amount, 2))
);

create index credit_cards_user_id_idx on public.credit_cards (user_id);
create index credit_cards_user_active_idx on public.credit_cards (user_id, is_active)
where deleted_at is null;

create unique index credit_card_invoices_card_month_unique
on public.credit_card_invoices (credit_card_id, reference_month);
create index credit_card_invoices_user_card_idx
on public.credit_card_invoices (user_id, credit_card_id, reference_month desc);

create unique index credit_card_transactions_user_mutation_unique
on public.credit_card_transactions (user_id, client_mutation_id);
create index credit_card_transactions_invoice_idx
on public.credit_card_transactions (invoice_id)
where deleted_at is null;
create index credit_card_transactions_card_date_idx
on public.credit_card_transactions (credit_card_id, purchase_date desc)
where deleted_at is null;

create unique index credit_card_invoice_payments_user_mutation_unique
on public.credit_card_invoice_payments (user_id, client_mutation_id);
create index credit_card_invoice_payments_invoice_idx
on public.credit_card_invoice_payments (invoice_id, paid_at desc);

create trigger credit_cards_set_updated_at
before update on public.credit_cards
for each row
execute function public.set_updated_at();

create trigger credit_card_invoices_set_updated_at
before update on public.credit_card_invoices
for each row
execute function public.set_updated_at();

create trigger credit_card_transactions_set_updated_at
before update on public.credit_card_transactions
for each row
execute function public.set_updated_at();

create or replace function public.days_in_month(p_date date)
returns integer
language sql
immutable
as $$
  select extract(day from (date_trunc('month', p_date) + interval '1 month - 1 day'))::integer;
$$;

create or replace function public.make_safe_date(p_year integer, p_month integer, p_day integer)
returns date
language sql
immutable
as $$
  select make_date(p_year, p_month, least(p_day, public.days_in_month(make_date(p_year, p_month, 1))));
$$;

create or replace function public.compute_credit_card_reference_month(
  p_purchase_date date,
  p_closing_day smallint
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_purchase_day integer := extract(day from p_purchase_date);
  v_base_month date := date_trunc('month', p_purchase_date)::date;
begin
  if v_purchase_day <= p_closing_day then
    return v_base_month;
  end if;

  return (v_base_month + interval '1 month')::date;
end;
$$;

create or replace function public.compute_credit_card_closing_date(
  p_reference_month date,
  p_closing_day smallint
)
returns date
language plpgsql
immutable
set search_path = public
as $$
begin
  return public.make_safe_date(
    extract(year from p_reference_month)::integer,
    extract(month from p_reference_month)::integer,
    p_closing_day
  );
end;
$$;

create or replace function public.compute_credit_card_due_date(
  p_reference_month date,
  p_closing_day smallint,
  p_due_day smallint
)
returns date
language plpgsql
immutable
set search_path = public
as $$
declare
  v_due_base_month date :=
    case
      when p_due_day > p_closing_day then p_reference_month
      else (date_trunc('month', p_reference_month) + interval '1 month')::date
    end;
begin
  return public.make_safe_date(
    extract(year from v_due_base_month)::integer,
    extract(month from v_due_base_month)::integer,
    p_due_day
  );
end;
$$;

create or replace function public.compute_credit_card_invoice_status(
  p_total_amount numeric,
  p_paid_amount numeric,
  p_closing_date date
)
returns public.credit_card_invoice_status
language plpgsql
stable
set search_path = public
as $$
begin
  if p_paid_amount >= p_total_amount and p_total_amount > 0 then
    return 'paid';
  end if;

  if current_date > p_closing_date then
    return 'closed';
  end if;

  return 'open';
end;
$$;

create or replace function public.refresh_credit_card_invoice_status(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.credit_card_invoices;
begin
  select *
  into v_invoice
  from public.credit_card_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return;
  end if;

  update public.credit_card_invoices
  set
    status = public.compute_credit_card_invoice_status(
      v_invoice.total_amount,
      v_invoice.paid_amount,
      v_invoice.closing_date
    ),
    paid_at =
      case
        when v_invoice.paid_amount >= v_invoice.total_amount and v_invoice.total_amount > 0
          then coalesce(v_invoice.paid_at, timezone('utc', now()))
        else null
      end
  where id = p_invoice_id;
end;
$$;

create or replace function public.assert_credit_card_matches_user(
  p_user_id uuid,
  p_credit_card_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.credit_cards cc
    where cc.id = p_credit_card_id
      and cc.user_id = p_user_id
      and cc.is_active = true
      and cc.deleted_at is null
  );
$$;

create or replace function public.assert_credit_card_invoice_matches_user(
  p_user_id uuid,
  p_invoice_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.credit_card_invoices i
    where i.id = p_invoice_id
      and i.user_id = p_user_id
  );
$$;

create or replace function public.assert_credit_card_invoice_matches_card(
  p_credit_card_id uuid,
  p_invoice_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.credit_card_invoices i
    where i.id = p_invoice_id
      and i.credit_card_id = p_credit_card_id
  );
$$;

create or replace function public.ensure_credit_card_invoice(
  p_user_id uuid,
  p_credit_card_id uuid,
  p_reference_month date,
  p_closing_day smallint,
  p_due_day smallint
)
returns public.credit_card_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.credit_card_invoices;
begin
  insert into public.credit_card_invoices (
    user_id,
    credit_card_id,
    reference_month,
    closing_date,
    due_date,
    status
  )
  values (
    p_user_id,
    p_credit_card_id,
    p_reference_month,
    public.compute_credit_card_closing_date(p_reference_month, p_closing_day),
    public.compute_credit_card_due_date(p_reference_month, p_closing_day, p_due_day),
    public.compute_credit_card_invoice_status(
      0,
      0,
      public.compute_credit_card_closing_date(p_reference_month, p_closing_day)
    )
  )
  on conflict (credit_card_id, reference_month) do update
  set updated_at = timezone('utc', now())
  returning *
  into v_invoice;

  return v_invoice;
end;
$$;

create or replace function public.credit_card_utilized_amount(p_credit_card_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(greatest(i.total_amount - i.paid_amount, 0)), 0)
  from public.credit_card_invoices i
  where i.credit_card_id = p_credit_card_id
    and i.status <> 'paid';
$$;

create or replace function public.create_credit_card_purchase(
  p_credit_card_id uuid,
  p_category_id uuid,
  p_description text,
  p_amount numeric,
  p_purchase_date date,
  p_notes text,
  p_client_mutation_id uuid
)
returns public.credit_card_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_card public.credit_cards;
  v_invoice public.credit_card_invoices;
  v_transaction public.credit_card_transactions;
  v_reference_month date;
  v_utilized_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
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
  v_invoice := public.ensure_credit_card_invoice(
    v_user_id,
    p_credit_card_id,
    v_reference_month,
    v_card.closing_day,
    v_card.due_day
  );

  v_utilized_amount := public.credit_card_utilized_amount(p_credit_card_id);
  if v_utilized_amount + p_amount > v_card.limit_amount then
    raise exception 'credit card limit exceeded' using errcode = '23514';
  end if;

  insert into public.credit_card_transactions (
    user_id,
    credit_card_id,
    invoice_id,
    category_id,
    description,
    amount,
    purchase_date,
    notes,
    client_mutation_id
  )
  values (
    v_user_id,
    p_credit_card_id,
    v_invoice.id,
    p_category_id,
    trim(p_description),
    p_amount,
    p_purchase_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_client_mutation_id
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_transaction;

  if v_transaction.id is null then
    select *
    into v_transaction
    from public.credit_card_transactions
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_transaction;
  end if;

  update public.credit_card_invoices
  set total_amount = total_amount + p_amount
  where id = v_invoice.id;

  perform public.refresh_credit_card_invoice_status(v_invoice.id);

  return v_transaction;
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
  if v_existing.credit_card_id <> p_credit_card_id then
    v_utilized_amount := public.credit_card_utilized_amount(p_credit_card_id);
  end if;

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

  return v_payment;
end;
$$;

grant select, insert, update on public.credit_cards to authenticated;
grant select on public.credit_card_invoices to authenticated;
grant select on public.credit_card_transactions to authenticated;
grant select on public.credit_card_invoice_payments to authenticated;
grant execute on function public.refresh_credit_card_invoice_status(uuid) to authenticated;
grant execute on function public.create_credit_card_purchase(
  uuid,
  uuid,
  text,
  numeric,
  date,
  text,
  uuid
) to authenticated;
grant execute on function public.update_credit_card_purchase(
  uuid,
  uuid,
  uuid,
  text,
  numeric,
  date,
  text
) to authenticated;
grant execute on function public.soft_delete_credit_card_purchase(uuid) to authenticated;
grant execute on function public.pay_credit_card_invoice(
  uuid,
  uuid,
  numeric,
  uuid
) to authenticated;

alter table public.credit_cards enable row level security;
alter table public.credit_card_invoices enable row level security;
alter table public.credit_card_transactions enable row level security;
alter table public.credit_card_invoice_payments enable row level security;

create policy "authenticated users can select own active credit cards"
on public.credit_cards
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert own credit cards"
on public.credit_cards
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own credit cards"
on public.credit_cards
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "authenticated users can select own invoices"
on public.credit_card_invoices
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "authenticated users can select own credit card purchases"
on public.credit_card_transactions
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can select own invoice payments"
on public.credit_card_invoice_payments
for select
to authenticated
using ((select auth.uid()) = user_id);
