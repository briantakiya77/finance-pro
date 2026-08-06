create type public.account_type as enum ('corrente', 'poupanca', 'investimento', 'carteira');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_primary_account()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null then
    new.is_active = false;
    new.is_primary = false;
  end if;

  if new.is_primary and new.deleted_at is null then
    update public.accounts
    set
      is_primary = false,
      updated_at = timezone('utc', now())
    where user_id = new.user_id
      and id <> new.id
      and is_primary = true
      and deleted_at is null;
  end if;

  return new;
end;
$$;

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  bank text not null,
  type public.account_type not null,
  color text not null,
  icon text not null,
  initial_balance numeric(14, 2) not null default 0,
  current_balance numeric(14, 2) not null default 0,
  is_active boolean not null default true,
  is_primary boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint accounts_name_length check (char_length(name) between 2 and 120),
  constraint accounts_bank_length check (char_length(bank) between 2 and 120),
  constraint accounts_color_format check (color ~ '^#([A-Fa-f0-9]{6})$'),
  constraint accounts_deleted_requires_inactive check (deleted_at is null or is_active = false),
  constraint accounts_deleted_cannot_be_primary check (deleted_at is null or is_primary = false)
);

create index accounts_user_id_idx on public.accounts (user_id);
create index accounts_user_active_idx on public.accounts (user_id, is_active)
where deleted_at is null;
create index accounts_user_updated_at_idx on public.accounts (user_id, updated_at desc)
where deleted_at is null;
create unique index accounts_user_id_primary_unique on public.accounts (user_id)
where is_primary = true and deleted_at is null;

create trigger accounts_set_updated_at
before update on public.accounts
for each row
execute function public.set_updated_at();

create trigger accounts_sync_primary_account
before insert or update on public.accounts
for each row
execute function public.sync_primary_account();

grant select, insert, update on public.accounts to authenticated;

alter table public.accounts enable row level security;

create policy "authenticated users can select own active accounts"
on public.accounts
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert own accounts"
on public.accounts
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own accounts"
on public.accounts
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
