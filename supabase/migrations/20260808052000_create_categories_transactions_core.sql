create type public.financial_entry_type as enum ('income', 'expense');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  type public.financial_entry_type not null,
  icon text not null default 'tag',
  color text not null default '#9AA4B2',
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint categories_name_length check (char_length(name) between 2 and 80),
  constraint categories_color_format check (color ~ '^#([A-Fa-f0-9]{6})$'),
  constraint categories_deleted_requires_inactive check (deleted_at is null or is_active = false)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  account_id uuid not null references public.accounts (id),
  category_id uuid references public.categories (id),
  type public.financial_entry_type not null,
  description text not null,
  amount numeric(14, 2) not null,
  transaction_date date not null,
  notes text,
  client_mutation_id uuid not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transactions_description_length check (char_length(description) between 2 and 160),
  constraint transactions_notes_length check (notes is null or char_length(notes) <= 1000),
  constraint transactions_positive_amount check (amount > 0),
  constraint transactions_amount_scale check (amount = round(amount, 2))
);

create unique index categories_user_type_name_unique
on public.categories (user_id, type, lower(name))
where deleted_at is null;

create index categories_user_id_idx on public.categories (user_id);
create index categories_user_type_idx on public.categories (user_id, type)
where deleted_at is null;
create index categories_user_active_idx on public.categories (user_id, is_active)
where deleted_at is null;

create unique index transactions_user_client_mutation_unique
on public.transactions (user_id, client_mutation_id);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc)
where deleted_at is null;
create index transactions_account_id_idx on public.transactions (account_id)
where deleted_at is null;
create index transactions_category_id_idx on public.transactions (category_id)
where deleted_at is null;

create trigger categories_set_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

create trigger transactions_set_updated_at
before update on public.transactions
for each row
execute function public.set_updated_at();

create or replace function public.transaction_signed_amount(
  p_type public.financial_entry_type,
  p_amount numeric
)
returns numeric
language sql
immutable
as $$
  select case when p_type = 'income' then p_amount else -p_amount end;
$$;

create or replace function public.ensure_default_categories()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  insert into public.categories (user_id, name, type, icon, color)
  values
    (v_user_id, 'Alimentacao', 'expense', 'utensils', '#2ECC71'),
    (v_user_id, 'Transporte', 'expense', 'car', '#3B82F6'),
    (v_user_id, 'Moradia', 'expense', 'home', '#8B5CF6'),
    (v_user_id, 'Saude', 'expense', 'heart-pulse', '#FF5A5F'),
    (v_user_id, 'Educacao', 'expense', 'graduation-cap', '#F59E0B'),
    (v_user_id, 'Lazer', 'expense', 'ticket', '#EC4899'),
    (v_user_id, 'Compras', 'expense', 'shopping-bag', '#8B5CF6'),
    (v_user_id, 'Assinaturas', 'expense', 'refresh-cw', '#9AA4B2'),
    (v_user_id, 'Contas', 'expense', 'receipt', '#F59E0B'),
    (v_user_id, 'Outros', 'expense', 'circle-dot', '#9AA4B2'),
    (v_user_id, 'Salario', 'income', 'briefcase-business', '#2ECC71'),
    (v_user_id, 'Freelance', 'income', 'laptop', '#3B82F6'),
    (v_user_id, 'Vendas', 'income', 'store', '#8B5CF6'),
    (v_user_id, 'Investimentos', 'income', 'chart-column', '#2ECC71'),
    (v_user_id, 'Reembolso', 'income', 'undo-2', '#F59E0B'),
    (v_user_id, 'Outros', 'income', 'circle-dot', '#9AA4B2')
  on conflict do nothing;
end;
$$;

create or replace function public.assert_category_matches_user_and_type(
  p_user_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select p_category_id is null
    or exists (
      select 1
      from public.categories c
      where c.id = p_category_id
        and c.user_id = p_user_id
        and c.type = p_type
        and c.is_active = true
        and c.deleted_at is null
    );
$$;

create or replace function public.assert_account_matches_user(
  p_user_id uuid,
  p_account_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.accounts a
    where a.id = p_account_id
      and a.user_id = p_user_id
      and a.deleted_at is null
  );
$$;

create or replace function public.create_transaction(
  p_account_id uuid,
  p_category_id uuid,
  p_type public.financial_entry_type,
  p_description text,
  p_amount numeric,
  p_transaction_date date,
  p_notes text,
  p_client_mutation_id uuid
)
returns public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.transactions;
  v_signed_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_transaction
  from public.transactions
  where user_id = v_user_id
    and client_mutation_id = p_client_mutation_id;

  if found then
    return v_transaction;
  end if;

  perform 1
  from public.accounts
  where id = p_account_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  v_signed_amount := public.transaction_signed_amount(p_type, p_amount);

  insert into public.transactions (
    user_id,
    account_id,
    category_id,
    type,
    description,
    amount,
    transaction_date,
    notes,
    client_mutation_id
  )
  values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_type,
    trim(p_description),
    p_amount,
    p_transaction_date,
    nullif(trim(coalesce(p_notes, '')), ''),
    p_client_mutation_id
  )
  returning *
  into v_transaction;

  update public.accounts
  set current_balance = current_balance + v_signed_amount
  where id = p_account_id
    and user_id = v_user_id;

  return v_transaction;
end;
$$;

create or replace function public.update_transaction(
  p_transaction_id uuid,
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
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_old_transaction public.transactions;
  v_updated_transaction public.transactions;
  v_old_signed_amount numeric(14, 2);
  v_new_signed_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  select *
  into v_old_transaction
  from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'transaction not found for current user' using errcode = '42501';
  end if;

  perform 1
  from public.accounts
  where id in (v_old_transaction.account_id, p_account_id)
    and user_id = v_user_id
    and deleted_at is null
  order by id
  for update;

  if not public.assert_account_matches_user(v_user_id, p_account_id) then
    raise exception 'account not found for current user' using errcode = '42501';
  end if;

  if not public.assert_category_matches_user_and_type(v_user_id, p_category_id, p_type) then
    raise exception 'category not found for current user and transaction type' using errcode = '42501';
  end if;

  v_old_signed_amount :=
    public.transaction_signed_amount(v_old_transaction.type, v_old_transaction.amount);
  v_new_signed_amount := public.transaction_signed_amount(p_type, p_amount);

  update public.accounts
  set current_balance = current_balance - v_old_signed_amount
  where id = v_old_transaction.account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance + v_new_signed_amount
  where id = p_account_id
    and user_id = v_user_id;

  update public.transactions
  set
    account_id = p_account_id,
    category_id = p_category_id,
    type = p_type,
    description = trim(p_description),
    amount = p_amount,
    transaction_date = p_transaction_date,
    notes = nullif(trim(coalesce(p_notes, '')), '')
  where id = p_transaction_id
    and user_id = v_user_id
  returning *
  into v_updated_transaction;

  return v_updated_transaction;
end;
$$;

create or replace function public.soft_delete_transaction(p_transaction_id uuid)
returns public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transaction public.transactions;
  v_signed_amount numeric(14, 2);
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_transaction
  from public.transactions
  where id = p_transaction_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'transaction not found for current user' using errcode = '42501';
  end if;

  perform 1
  from public.accounts
  where id = v_transaction.account_id
    and user_id = v_user_id
  for update;

  v_signed_amount := public.transaction_signed_amount(v_transaction.type, v_transaction.amount);

  update public.accounts
  set current_balance = current_balance - v_signed_amount
  where id = v_transaction.account_id
    and user_id = v_user_id;

  update public.transactions
  set deleted_at = timezone('utc', now())
  where id = p_transaction_id
    and user_id = v_user_id
  returning *
  into v_transaction;

  return v_transaction;
end;
$$;

grant select, insert, update on public.categories to authenticated;
grant select, insert, update on public.transactions to authenticated;
grant execute on function public.ensure_default_categories() to authenticated;
grant execute on function public.create_transaction(
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  date,
  text,
  uuid
) to authenticated;
grant execute on function public.update_transaction(
  uuid,
  uuid,
  uuid,
  public.financial_entry_type,
  text,
  numeric,
  date,
  text
) to authenticated;
grant execute on function public.soft_delete_transaction(uuid) to authenticated;

alter table public.categories enable row level security;
alter table public.transactions enable row level security;

create policy "authenticated users can select own active categories"
on public.categories
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert own categories"
on public.categories
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own categories"
on public.categories
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "authenticated users can select own active transactions"
on public.transactions
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert valid own transactions"
on public.transactions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.assert_account_matches_user(user_id, account_id)
  and public.assert_category_matches_user_and_type(user_id, category_id, type)
);

create policy "authenticated users can update valid own transactions"
on public.transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and public.assert_account_matches_user(user_id, account_id)
  and public.assert_category_matches_user_and_type(user_id, category_id, type)
);
