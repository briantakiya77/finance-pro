import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260808194000_create_credit_cards_core.sql'
);
const migration = readFileSync(migrationPath, 'utf-8');

describe('credit cards migration', () => {
  it('cria as tabelas principais do modulo', () => {
    expect(migration).toContain('create table public.credit_cards');
    expect(migration).toContain('create table public.credit_card_invoices');
    expect(migration).toContain('create table public.credit_card_transactions');
    expect(migration).toContain('create table public.credit_card_invoice_payments');
  });

  it('garante uma unica fatura por cartao e competencia', () => {
    expect(migration).toContain('create unique index credit_card_invoices_card_month_unique');
  });

  it('protege compras e pagamentos com idempotencia', () => {
    expect(migration).toContain('credit_card_transactions_user_mutation_unique');
    expect(migration).toContain('credit_card_invoice_payments_user_mutation_unique');
    expect(migration).toContain('on conflict (user_id, client_mutation_id) do nothing');
  });

  it('exige bloqueio transacional para proteger o limite', () => {
    expect(migration).toMatch(/from public\.credit_cards[\s\S]*for update;/);
    expect(migration).toContain('credit_card_utilized_amount(p_credit_card_id)');
    expect(migration).toContain("raise exception 'credit card limit exceeded'");
  });

  it('cria as rpcs financeiras criticas esperadas', () => {
    expect(migration).toContain('create or replace function public.create_credit_card_purchase');
    expect(migration).toContain('create or replace function public.update_credit_card_purchase');
    expect(migration).toContain(
      'create or replace function public.soft_delete_credit_card_purchase'
    );
    expect(migration).toContain('create or replace function public.pay_credit_card_invoice');
  });

  it('aplica rls nas novas tabelas', () => {
    expect(migration).toContain('alter table public.credit_cards enable row level security;');
    expect(migration).toContain(
      'alter table public.credit_card_invoices enable row level security;'
    );
    expect(migration).toContain(
      'alter table public.credit_card_transactions enable row level security;'
    );
    expect(migration).toContain(
      'alter table public.credit_card_invoice_payments enable row level security;'
    );
  });

  it('restringe acesso aos dados do proprio usuario', () => {
    expect(migration).toContain(
      'create policy "authenticated users can select own active credit cards"'
    );
    expect(migration).toContain('create policy "authenticated users can select own invoices"');
    expect(migration).toContain(
      'create policy "authenticated users can select own credit card purchases"'
    );
    expect(migration).toContain(
      'create policy "authenticated users can select own invoice payments"'
    );
  });

  it('valida categoria de despesa no servidor', () => {
    expect(migration).toContain(
      "assert_category_matches_user_and_type(v_user_id, p_category_id, 'expense')"
    );
    expect(migration).toContain(
      "raise exception 'category not found for current user and transaction type'"
    );
  });

  it('pagamento reduz saldo da conta sem criar despesa duplicada', () => {
    expect(migration).toContain("set_config('app.finance_allow_balance_update', 'on', true)");
    expect(migration).not.toMatch(
      /create or replace function public\.pay_credit_card_invoice[\s\S]*insert into public\.transactions/i
    );
  });
});
