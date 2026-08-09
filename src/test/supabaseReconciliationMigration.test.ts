import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809161043_reconcile_remote_financial_schema.sql'
  ),
  'utf-8'
);

describe('supabase reconciliation migration', () => {
  it('recria apenas os blocos ausentes com criacao defensiva', () => {
    expect(migration).toContain('create table if not exists public.credit_card_installment_plans');
    expect(migration).toContain('create table if not exists public.recurring_transactions');
    expect(migration).toContain('create table if not exists public.recurring_transaction_occurrences');
    expect(migration).toContain('create table if not exists public.monthly_plans');
    expect(migration).toContain('create table if not exists public.category_budgets');
    expect(migration).toContain('create table if not exists public.financial_goals');
    expect(migration).not.toContain('create table if not exists public.ai_conversations');
    expect(migration).not.toContain('create table if not exists public.ai_messages');
  });

  it('reconcilia colunas faltantes sem depender de replay historico', () => {
    expect(migration).toContain("table_name = 'credit_card_transactions'");
    expect(migration).toContain("column_name = 'installment_plan_id'");
    expect(migration).toContain("column_name = 'installment_number'");
    expect(migration).toContain("column_name = 'installment_count'");
    expect(migration).toContain("table_name = 'transactions'");
    expect(migration).toContain("column_name = 'recurring_transaction_id'");
    expect(migration).toContain("column_name = 'recurrence_period'");
  });

  it('restaura as rpcs de parcelamento, recorrencia e planejamento', () => {
    expect(migration).toContain('create or replace function public.create_credit_card_installment_purchase');
    expect(migration).toContain('create or replace function public.update_credit_card_installment_plan');
    expect(migration).toContain('create or replace function public.cancel_credit_card_installment_plan');
    expect(migration).toContain('create or replace function public.generate_due_recurring_transactions()');
    expect(migration).toContain('create or replace function public.upsert_monthly_plan');
    expect(migration).toContain('create or replace function public.get_monthly_plan_overview');
    expect(migration).toContain('create or replace function public.get_financial_projection');
    expect(migration).toContain('create or replace function public.get_upcoming_commitments');
  });

  it('mantem seguranca com rls, policies, grants minimos e revokes em helpers', () => {
    expect(migration).toContain('alter table public.credit_card_installment_plans enable row level security;');
    expect(migration).toContain('alter table public.recurring_transactions enable row level security;');
    expect(migration).toContain('alter table public.monthly_plans enable row level security;');
    expect(migration).toContain('create policy "authenticated users can select own installment plans"');
    expect(migration).toContain('create policy "authenticated users can select own recurring transactions"');
    expect(migration).toContain('create policy "authenticated users can select own monthly plans"');
    expect(migration).toContain('grant select on public.financial_goals to authenticated;');
    expect(migration).toContain('grant execute on function public.get_monthly_plan_overview(date) to authenticated;');
    expect(migration).toContain('revoke execute on function public.uuid_from_text(text) from public, anon, authenticated;');
    expect(migration).toContain(
      'revoke execute on function public.monthly_realized_expense(uuid, date) from public, anon, authenticated;'
    );
  });

  it('nao contem operacoes destrutivas', () => {
    expect(migration).not.toMatch(/\bdrop\s+(table|column|type)\b/i);
    expect(migration).not.toMatch(/\btruncate\b/i);
    expect(migration).not.toMatch(/\bdelete\s+from\b/i);
    expect(migration).not.toMatch(/\breset\b/i);
  });
});
