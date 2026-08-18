import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260818110000_create_transfers_core.sql'),
  'utf8'
);

describe('transfers migration', () => {
  it('cria tabela dedicada sem tratar transferencia como receita ou despesa', () => {
    expect(migration).toContain('create table public.transfers');
    expect(migration).toContain('from_account_id uuid not null references public.accounts (id)');
    expect(migration).toContain('to_account_id uuid not null references public.accounts (id)');
    expect(migration).not.toContain("type public.financial_entry_type not null");
  });

  it('protege integridade monetaria e impede transferencia para a mesma conta', () => {
    expect(migration).toContain('constraint transfers_positive_amount check (amount > 0)');
    expect(migration).toContain('constraint transfers_amount_scale check');
    expect(migration).toContain('constraint transfers_distinct_accounts check (from_account_id <> to_account_id)');
    expect(migration).toContain("raise exception 'transfer accounts must be different'");
  });

  it('aplica ownership e RLS por usuario nas transferencias', () => {
    expect(migration).toContain('alter table public.transfers enable row level security');
    expect(migration).toContain('create policy "authenticated users can select own active transfers"');
    expect(migration).toContain('public.assert_transfer_accounts_match_user(user_id, from_account_id, to_account_id)');
    expect(migration).toContain('(select auth.uid()) = user_id');
  });

  it('ajusta saldo das contas de forma atomica ao criar, editar e excluir', () => {
    expect(migration).toContain('create or replace function public.create_transfer');
    expect(migration).toContain('create or replace function public.update_transfer');
    expect(migration).toContain('create or replace function public.soft_delete_transfer');
    expect(migration).toContain('set current_balance = current_balance - p_amount');
    expect(migration).toContain('set current_balance = current_balance + p_amount');
    expect(migration).toContain('set current_balance = current_balance + v_old_transfer.amount');
    expect(migration).toContain('set current_balance = current_balance - v_old_transfer.amount');
  });

  it('preserva idempotencia e bloqueia exposicao indevida das rpcs', () => {
    expect(migration).toContain('transfers_user_client_mutation_unique');
    expect(migration).toContain('on conflict (user_id, client_mutation_id) do nothing');
    expect(migration).toContain('revoke execute on function public.create_transfer');
    expect(migration).toContain('revoke execute on function public.update_transfer');
    expect(migration).toContain('revoke execute on function public.soft_delete_transfer');
  });
});
