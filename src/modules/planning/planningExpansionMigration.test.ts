import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260818183000_expand_planning_budgets_goals.sql'
  ),
  'utf-8'
);

describe('planning expansion migration', () => {
  it('expande planejamento sem criar arquitetura paralela', () => {
    expect(migration).toContain('alter table public.monthly_plans');
    expect(migration).toContain('add column if not exists minimum_reserve_amount');
    expect(migration).toContain('create or replace function public.get_monthly_plan_overview');
    expect(migration).toContain('create or replace function public.get_category_budget_progress');
  });

  it('calcula realizado e previsto por categoria sem somar pagamento de fatura como nova despesa', () => {
    expect(migration).toContain('create or replace function public.list_monthly_budget_events');
    expect(migration).toContain("'credit_card_purchase'::text as source_kind");
    expect(migration).toContain("'recurring_commitment'::text as source_kind");
    expect(migration).not.toMatch(/list_monthly_budget_events[\s\S]*credit_card_invoice_payments/i);
  });

  it('centraliza thresholds de alerta e projecao excedente', () => {
    expect(migration).toContain('create or replace function public.resolve_budget_status');
    expect(migration).toContain("return 'attention';");
    expect(migration).toContain("return 'critical';");
    expect(migration).toContain("return 'exceeded';");
    expect(migration).toContain('projected_overage_amount');
  });

  it('implementa aportes atomicos de metas com ownership e rls', () => {
    expect(migration).toContain('create table if not exists public.financial_goal_contributions');
    expect(migration).toContain('create or replace function public.create_goal_contribution');
    expect(migration).toContain('for update;');
    expect(migration).toContain("raise exception 'financial goal not found for current user'");
    expect(migration).toContain('alter table public.financial_goal_contributions enable row level security;');
  });

  it('protege capacidade segura de gasto com reserva minima e caixa comprometido', () => {
    expect(migration).toContain('minimum_reserve_amount');
    expect(migration).toContain('create or replace function public.get_month_invoice_cash_obligation');
    expect(migration).toContain('safe_to_spend');
    expect(migration).toContain('projected_month_end_balance');
  });
});
