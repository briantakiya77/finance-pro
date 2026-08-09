import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809173000_create_ai_assistant_conversations.sql'),
  'utf-8'
);

describe('AI assistant conversation migration', () => {
  it('cria persistencia de conversas e mensagens sem prompts internos', () => {
    expect(migration).toContain('create table public.ai_conversations');
    expect(migration).toContain('create table public.ai_messages');
    expect(migration).toContain("create type public.ai_message_role as enum ('user', 'assistant');");
    expect(migration).not.toContain('chain_of_thought');
    expect(migration).not.toContain('system_prompt');
    expect(migration).not.toContain('api_key');
  });

  it('restringe historico por usuario com RLS', () => {
    expect(migration).toContain('alter table public.ai_conversations enable row level security;');
    expect(migration).toContain('alter table public.ai_messages enable row level security;');
    expect(migration).toContain('create policy "authenticated users can select own ai conversations"');
    expect(migration).toContain('create policy "authenticated users can select own ai messages"');
    expect(migration).toContain('and c.user_id = (select auth.uid())');
  });

  it('permite apenas leitura e escrita de historico, nao acoes financeiras', () => {
    expect(migration).toContain('grant select, insert, update on public.ai_conversations to authenticated;');
    expect(migration).toContain('grant select, insert on public.ai_messages to authenticated;');
    expect(migration).not.toContain('create_transaction');
    expect(migration).not.toContain('pay_credit_card_invoice');
    expect(migration).not.toContain('create_credit_card_purchase');
  });
});
