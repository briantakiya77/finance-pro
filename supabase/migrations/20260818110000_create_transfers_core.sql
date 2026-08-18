create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_account_id uuid not null references public.accounts (id),
  to_account_id uuid not null references public.accounts (id),
  amount numeric(14, 2) not null,
  description text,
  transfer_date date not null,
  client_mutation_id uuid not null,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint transfers_positive_amount check (amount > 0),
  constraint transfers_amount_scale check (amount = round(amount, 2)),
  constraint transfers_distinct_accounts check (from_account_id <> to_account_id),
  constraint transfers_description_length check (
    description is null
    or char_length(trim(description)) between 2 and 160
  )
);

create unique index transfers_user_client_mutation_unique
on public.transfers (user_id, client_mutation_id);

create index transfers_user_date_idx
on public.transfers (user_id, transfer_date desc)
where deleted_at is null;

create index transfers_from_account_id_idx
on public.transfers (from_account_id)
where deleted_at is null;

create index transfers_to_account_id_idx
on public.transfers (to_account_id)
where deleted_at is null;

create index transfers_user_created_at_idx
on public.transfers (user_id, created_at desc)
where deleted_at is null;

create trigger transfers_set_updated_at
before update on public.transfers
for each row
execute function public.set_updated_at();

create or replace function public.assert_transfer_accounts_match_user(
  p_user_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select p_from_account_id <> p_to_account_id
    and (
      select count(*)
      from public.accounts a
      where a.id in (p_from_account_id, p_to_account_id)
        and a.user_id = p_user_id
        and a.deleted_at is null
    ) = 2;
$$;

create or replace function public.create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_description text,
  p_transfer_date date,
  p_client_mutation_id uuid
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transfer public.transfers;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'transfer accounts must be different' using errcode = '23514';
  end if;

  perform 1
  from public.accounts
  where id in (p_from_account_id, p_to_account_id)
    and user_id = v_user_id
    and deleted_at is null
  order by id
  for update;

  if not public.assert_transfer_accounts_match_user(
    v_user_id,
    p_from_account_id,
    p_to_account_id
  ) then
    raise exception 'transfer accounts not found for current user' using errcode = '42501';
  end if;

  insert into public.transfers (
    user_id,
    from_account_id,
    to_account_id,
    amount,
    description,
    transfer_date,
    client_mutation_id
  )
  values (
    v_user_id,
    p_from_account_id,
    p_to_account_id,
    p_amount,
    nullif(trim(coalesce(p_description, '')), ''),
    p_transfer_date,
    p_client_mutation_id
  )
  on conflict (user_id, client_mutation_id) do nothing
  returning *
  into v_transfer;

  if v_transfer.id is null then
    select *
    into v_transfer
    from public.transfers
    where user_id = v_user_id
      and client_mutation_id = p_client_mutation_id;

    return v_transfer;
  end if;

  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance - p_amount
  where id = p_from_account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance + p_amount
  where id = p_to_account_id
    and user_id = v_user_id;

  return v_transfer;
end;
$$;

create or replace function public.update_transfer(
  p_transfer_id uuid,
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_description text,
  p_transfer_date date
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_old_transfer public.transfers;
  v_updated_transfer public.transfers;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  if p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'amount must be positive numeric(14,2)' using errcode = '23514';
  end if;

  if p_from_account_id = p_to_account_id then
    raise exception 'transfer accounts must be different' using errcode = '23514';
  end if;

  select *
  into v_old_transfer
  from public.transfers
  where id = p_transfer_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'transfer not found for current user' using errcode = '42501';
  end if;

  perform 1
  from public.accounts
  where id in (
    v_old_transfer.from_account_id,
    v_old_transfer.to_account_id,
    p_from_account_id,
    p_to_account_id
  )
    and user_id = v_user_id
    and deleted_at is null
  order by id
  for update;

  if not public.assert_transfer_accounts_match_user(
    v_user_id,
    p_from_account_id,
    p_to_account_id
  ) then
    raise exception 'transfer accounts not found for current user' using errcode = '42501';
  end if;

  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance + v_old_transfer.amount
  where id = v_old_transfer.from_account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance - v_old_transfer.amount
  where id = v_old_transfer.to_account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance - p_amount
  where id = p_from_account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance + p_amount
  where id = p_to_account_id
    and user_id = v_user_id;

  update public.transfers
  set
    from_account_id = p_from_account_id,
    to_account_id = p_to_account_id,
    amount = p_amount,
    description = nullif(trim(coalesce(p_description, '')), ''),
    transfer_date = p_transfer_date
  where id = p_transfer_id
    and user_id = v_user_id
  returning *
  into v_updated_transfer;

  return v_updated_transfer;
end;
$$;

create or replace function public.soft_delete_transfer(p_transfer_id uuid)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_transfer public.transfers;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select *
  into v_transfer
  from public.transfers
  where id = p_transfer_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'transfer not found for current user' using errcode = '42501';
  end if;

  perform 1
  from public.accounts
  where id in (v_transfer.from_account_id, v_transfer.to_account_id)
    and user_id = v_user_id
    and deleted_at is null
  order by id
  for update;

  perform set_config('app.finance_allow_balance_update', 'on', true);

  update public.accounts
  set current_balance = current_balance + v_transfer.amount
  where id = v_transfer.from_account_id
    and user_id = v_user_id;

  update public.accounts
  set current_balance = current_balance - v_transfer.amount
  where id = v_transfer.to_account_id
    and user_id = v_user_id;

  update public.transfers
  set deleted_at = timezone('utc', now())
  where id = p_transfer_id
    and user_id = v_user_id
  returning *
  into v_transfer;

  return v_transfer;
end;
$$;

grant select, insert, update on public.transfers to authenticated;
grant execute on function public.assert_transfer_accounts_match_user(uuid, uuid, uuid) to authenticated;
grant execute on function public.create_transfer(uuid, uuid, numeric, text, date, uuid) to authenticated;
grant execute on function public.update_transfer(uuid, uuid, uuid, numeric, text, date) to authenticated;
grant execute on function public.soft_delete_transfer(uuid) to authenticated;

revoke execute on function public.assert_transfer_accounts_match_user(uuid, uuid, uuid) from public, anon;
revoke execute on function public.create_transfer(uuid, uuid, numeric, text, date, uuid) from public, anon;
revoke execute on function public.update_transfer(uuid, uuid, uuid, numeric, text, date) from public, anon;
revoke execute on function public.soft_delete_transfer(uuid) from public, anon;

alter table public.transfers enable row level security;

create policy "authenticated users can select own active transfers"
on public.transfers
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert valid own transfers"
on public.transfers
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and public.assert_transfer_accounts_match_user(user_id, from_account_id, to_account_id)
);

create policy "authenticated users can update valid own transfers"
on public.transfers
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and public.assert_transfer_accounts_match_user(user_id, from_account_id, to_account_id)
);
