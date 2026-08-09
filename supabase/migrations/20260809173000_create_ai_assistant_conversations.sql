create type public.ai_message_role as enum ('user', 'assistant');

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint ai_conversations_title_length check (title is null or char_length(title) <= 120)
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role public.ai_message_role not null,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint ai_messages_content_length check (char_length(content) between 1 and 4000)
);

create index ai_conversations_user_updated_idx
on public.ai_conversations (user_id, updated_at desc)
where deleted_at is null;

create index ai_messages_conversation_created_idx
on public.ai_messages (conversation_id, created_at asc);

create trigger ai_conversations_set_updated_at
before update on public.ai_conversations
for each row
execute function public.set_updated_at();

create or replace function public.assert_ai_conversation_matches_user(
  p_user_id uuid,
  p_conversation_id uuid
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.ai_conversations c
    where c.id = p_conversation_id
      and c.user_id = p_user_id
      and c.deleted_at is null
  );
$$;

grant select, insert, update on public.ai_conversations to authenticated;
grant select, insert on public.ai_messages to authenticated;

revoke execute on function public.assert_ai_conversation_matches_user(uuid, uuid)
from public, anon, authenticated;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "authenticated users can select own ai conversations"
on public.ai_conversations
for select
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null);

create policy "authenticated users can insert own ai conversations"
on public.ai_conversations
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "authenticated users can update own ai conversations"
on public.ai_conversations
for update
to authenticated
using ((select auth.uid()) = user_id and deleted_at is null)
with check ((select auth.uid()) = user_id);

create policy "authenticated users can select own ai messages"
on public.ai_messages
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ai_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.deleted_at is null
  )
);

create policy "authenticated users can insert own ai messages"
on public.ai_messages
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.ai_conversations c
    where c.id = conversation_id
      and c.user_id = (select auth.uid())
      and c.deleted_at is null
  )
);
