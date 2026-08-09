import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809153000_create_planning_goals_projection_core.sql'
  ),
  'utf-8'
);

describe('planning, goals and projection migration', () => {
  it('cria as tabelas e constraints centrais do modulo', () => {
    expect(migration).toContain('create table public.monthly_plans');
    expect(migration).toContain('create table public.category_budgets');
    expect(migration).toContain('create table public.financial_goals');
    expect(migration).toContain('monthly_plans_reference_month_first_day');
    expect(migration).toContain('create unique index monthly_plans_user_reference_month_unique');
    expect(migration).toContain('create unique index category_budgets_plan_category_unique');
  });

  it('mantem apenas um plano por usuario e mes normalizado', () => {
    expect(migration).toContain('on conflict (user_id, reference_month) do update');
    expect(migration).toContain('v_reference_month := public.normalize_reference_month');
  });

  it('valida ownership e categoria expense nas rotinas de orcamento', () => {
    expect(migration).toContain('assert_monthly_plan_matches_user');
    expect(migration).toContain('assert_expense_category_matches_user');
    expect(migration).toContain("c.type = 'expense'");
    expect(migration).toContain(
      "raise exception 'category budget requires active expense category for current user'"
    );
  });

  it('calcula gasto real combinando conta e cartao sem duplicar pagamento de fatura', () => {
    expect(migration).toContain('create or replace function public.monthly_realized_expense');
    expect(migration).toContain("and t.type = 'expense'");
    expect(migration).toContain('from public.credit_card_transactions ct');
    expect(migration).not.toMatch(/monthly_realized_expense[\s\S]*credit_card_invoice_payments/i);
  });

  it('usa receitas reais menos despesas reais para a meta de economia', () => {
    expect(migration).toContain('v_realized_income := public.monthly_realized_income');
    expect(migration).toContain('v_realized_expense := public.monthly_realized_expense');
    expect(migration).toContain(
      'v_realized_savings := (v_realized_income - v_realized_expense)::numeric(14, 2);'
    );
  });

  it('trata estouro de orcamento como status visual sem bloquear lancamentos', () => {
    expect(migration).toContain("when coalesce(spent.spent_amount, 0) > cb.budget_amount then 'above_limit'");
    expect(migration).toContain(
      "when cb.budget_amount > 0 and coalesce(spent.spent_amount, 0) >= cb.budget_amount * 0.8 then 'near_limit'"
    );
    expect(migration).not.toContain('budget exceeded');
  });

  it('implementa metas financeiras sem alterar saldo bancario', () => {
    expect(migration).toContain('create or replace function public.create_financial_goal');
    expect(migration).toContain('create or replace function public.update_financial_goal');
    expect(migration).toContain('create or replace function public.update_goal_progress');
    expect(migration).toContain('public.resolve_goal_status');
    expect(migration).not.toMatch(/create_financial_goal[\s\S]*current_balance = current_balance/i);
    expect(migration).not.toMatch(/update_goal_progress[\s\S]*current_balance = current_balance/i);
  });

  it('marca meta como concluida automaticamente ao atingir o alvo', () => {
    expect(migration).toContain('if p_current_amount >= p_target_amount then');
    expect(migration).toContain("return 'completed';");
  });

  it('protege usuario A contra acesso a dados de usuario B', () => {
    expect(migration).toContain("raise exception 'monthly plan not found for current user'");
    expect(migration).toContain("raise exception 'financial goal not found for current user'");
    expect(migration).toContain('where id = p_goal_id');
    expect(migration).toContain('and user_id = v_user_id');
  });

  it('projeta caixa com recorrencias e faturas sem alterar saldo real', () => {
    expect(migration).toContain('create or replace function public.get_financial_projection');
    expect(migration).toContain("and rt.status = 'active'");
    expect(migration).toContain('projected_invoice_payment');
    expect(migration).toContain('sum(mn.net_change) over');
    expect(migration).not.toMatch(/get_financial_projection[\s\S]*update public\.accounts/i);
  });

  it('considera horizonte de 3 e 6 meses sem gerar milhares de eventos futuros', () => {
    expect(migration).toContain('v_horizon integer := greatest(1, least(coalesce(p_horizon_months, 3), 6));');
    expect(migration).toContain('from generate_series(0, v_horizon - 1)');
  });

  it('lista proximos compromissos de recorrencias, faturas, parcelas e metas', () => {
    expect(migration).toContain('create or replace function public.get_upcoming_commitments');
    expect(migration).toContain("'recurring'::text as kind");
    expect(migration).toContain("'invoice'::text as kind");
    expect(migration).toContain("'installment'::text as kind");
    expect(migration).toContain("'goal'::text as kind");
  });

  it('ativa rls, grants controlados e revoga helpers internos', () => {
    expect(migration).toContain('alter table public.monthly_plans enable row level security;');
    expect(migration).toContain('alter table public.category_budgets enable row level security;');
    expect(migration).toContain('alter table public.financial_goals enable row level security;');
    expect(migration).toContain('grant execute on function public.upsert_monthly_plan');
    expect(migration).toContain('grant execute on function public.get_financial_projection');
    expect(migration).toContain('revoke execute on function public.monthly_realized_income');
    expect(migration).toContain('revoke execute on function public.monthly_realized_expense');
  });
});
