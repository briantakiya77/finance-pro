import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    'supabase/migrations/20260808052000_create_categories_transactions_core.sql'
  ),
  'utf8'
);

describe('transactions migration', () => {
  it('mantem valores monetarios positivos e com precisao decimal', () => {
    expect(migration).toContain('amount numeric(14, 2) not null');
    expect(migration).toContain('constraint transactions_positive_amount check (amount > 0)');
    expect(migration).toContain('constraint transactions_amount_scale check');
  });

  it('calcula receita como aumento de saldo e despesa como reducao de saldo', () => {
    expect(migration).toContain(
      "select case when p_type = 'income' then p_amount else -p_amount end"
    );
    expect(migration).toContain('current_balance = current_balance + v_signed_amount');
  });

  it('protege categorias e transacoes com RLS por usuario', () => {
    expect(migration).toContain('alter table public.categories enable row level security');
    expect(migration).toContain('alter table public.transactions enable row level security');
    expect(migration).toContain('(select auth.uid()) = user_id');
  });

  it('bloqueia IDOR em conta e categoria no banco', () => {
    expect(migration).toContain('public.assert_account_matches_user(user_id, account_id)');
    expect(migration).toContain(
      'public.assert_category_matches_user_and_type(user_id, category_id, type)'
    );
    expect(migration).toContain('and c.type = p_type');
  });

  it('aplica somente a diferenca ao editar valor de lancamento', () => {
    expect(migration).toContain('current_balance = current_balance - v_old_signed_amount');
    expect(migration).toContain('current_balance = current_balance + v_new_signed_amount');
  });

  it('reverte conta anterior e aplica nova conta ao mover lancamento', () => {
    expect(migration).toContain('where id = v_old_transaction.account_id');
    expect(migration).toContain('where id = p_account_id');
  });

  it('soft delete reverte efeito financeiro e nao apaga definitivamente', () => {
    expect(migration).toContain('create or replace function public.soft_delete_transaction');
    expect(migration).toContain('set deleted_at = timezone');
    expect(migration).toContain('current_balance = current_balance - v_signed_amount');
  });

  it('usa RPCs transacionais para criar, editar e excluir lancamentos', () => {
    expect(migration).toContain('create or replace function public.create_transaction');
    expect(migration).toContain('create or replace function public.update_transaction');
    expect(migration).toContain('create or replace function public.soft_delete_transaction');
    expect(migration).toContain('current_balance = current_balance + v_signed_amount');
    expect(migration).toContain('current_balance = current_balance - v_old_signed_amount');
    expect(migration).toContain('current_balance = current_balance - v_signed_amount');
  });

  it('previne duplicidade por identificador idempotente', () => {
    expect(migration).toContain('client_mutation_id uuid not null');
    expect(migration).toContain('transactions_user_client_mutation_unique');
    expect(migration).toContain('return v_transaction');
  });
});
