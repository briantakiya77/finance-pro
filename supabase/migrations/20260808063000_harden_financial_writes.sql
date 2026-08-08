revoke insert, update on public.transactions from authenticated;

drop policy if exists "authenticated users can insert valid own transactions"
on public.transactions;

drop policy if exists "authenticated users can update valid own transactions"
on public.transactions;

create or replace function public.guard_account_balances()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_balance_override boolean :=
    coalesce(current_setting('app.finance_allow_balance_update', true), '') = 'on';
begin
  if tg_op = 'INSERT' then
    new.current_balance := new.initial_balance;
    return new;
  end if;

  if v_balance_override then
    return new;
  end if;

  if new.initial_balance is distinct from old.initial_balance then
    new.current_balance := old.current_balance + (new.initial_balance - old.initial_balance);
    return new;
  end if;

  if new.current_balance is distinct from old.current_balance then
    raise exception 'current_balance is system managed' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists accounts_guard_account_balances on public.accounts;

create trigger accounts_guard_account_balances
before insert or update on public.accounts
for each row
execute function public.guard_account_balances();

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
security definer
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
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_transaction;

  if v_transaction.id is null then
    select *
    into v_transaction
    from public.transactions
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_transaction;
  end if;

  v_signed_amount := public.transaction_signed_amount(p_type, p_amount);
  perform set_config('app.finance_allow_balance_update', 'on', true);

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
security definer
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

  perform set_config('app.finance_allow_balance_update', 'on', true);

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
security definer
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
  perform set_config('app.finance_allow_balance_update', 'on', true);

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
