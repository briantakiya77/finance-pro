import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const hardeningMigration = readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/20260808063000_harden_financial_writes.sql'),
  'utf8'
);

describe('financial hardening migration', () => {
  it('revoga escrita direta em transactions para authenticated', () => {
    expect(hardeningMigration).toContain(
      'revoke insert, update on public.transactions from authenticated;'
    );
    expect(hardeningMigration).toContain(
      'drop policy if exists "authenticated users can insert valid own transactions"'
    );
    expect(hardeningMigration).toContain(
      'drop policy if exists "authenticated users can update valid own transactions"'
    );
  });

  it('usa security definer somente nas rpcs financeiras criticas', () => {
    expect(hardeningMigration).toContain('create or replace function public.create_transaction(');
    expect(hardeningMigration).toContain('create or replace function public.update_transaction(');
    expect(hardeningMigration).toContain(
      'create or replace function public.soft_delete_transaction(p_transaction_id uuid)'
    );
    expect(hardeningMigration).toContain('security definer');
    expect(hardeningMigration).toContain("set search_path = public");
  });

  it('protege current_balance contra update direto no cliente', () => {
    expect(hardeningMigration).toContain('create or replace function public.guard_account_balances()');
    expect(hardeningMigration).toContain("raise exception 'current_balance is system managed'");
    expect(hardeningMigration).toContain('create trigger accounts_guard_account_balances');
  });

  it('define a regra de initial_balance com ajuste por diferenca', () => {
    expect(hardeningMigration).toContain(
      'new.current_balance := old.current_balance + (new.initial_balance - old.initial_balance);'
    );
    expect(hardeningMigration).toContain('new.current_balance := new.initial_balance;');
  });

  it('resolve idempotencia concorrente com on conflict antes do ajuste de saldo', () => {
    expect(hardeningMigration).toContain('on conflict (user_id, client_mutation_id) do nothing');
    expect(hardeningMigration).toContain('if v_transaction.id is null then');
    expect(hardeningMigration).toContain('current_balance = current_balance + v_signed_amount');
  });

  it('permite que apenas as rpcs ajustem saldo com contexto interno', () => {
    expect(hardeningMigration).toContain(
      "perform set_config('app.finance_allow_balance_update', 'on', true);"
    );
  });
});
