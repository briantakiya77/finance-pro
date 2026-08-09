import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260809113000_create_installments_and_recurring_core.sql'
  ),
  'utf-8'
);

describe('credit card installments migration', () => {
  it('cria a estrutura pai e filho do parcelamento', () => {
    expect(migration).toContain('create table public.credit_card_installment_plans');
    expect(migration).toContain('add column installment_plan_id uuid');
    expect(migration).toContain('add column installment_number smallint');
    expect(migration).toContain('add column installment_count smallint');
    expect(migration).toContain('credit_card_transactions_installment_consistency');
  });

  it('protege o parcelamento com idempotencia no plano e nas parcelas', () => {
    expect(migration).toContain('credit_card_installment_plans_user_mutation_unique');
    expect(migration).toContain('credit_card_transactions_installment_plan_number_unique');
    expect(migration).toContain('where user_id = v_user_id');
    expect(migration).toContain('and client_mutation_id = p_client_mutation_id');
  });

  it('garante soma exata das parcelas com rateio em centavos', () => {
    expect(migration).toContain('v_total_cents := (p_total_amount * 100)::bigint');
    expect(migration).toContain('v_base_cents := v_total_cents / p_installment_count');
    expect(migration).toContain('v_remainder := v_total_cents % p_installment_count');
    expect(migration).toContain('when v_index <= v_remainder then 1 else 0 end');
  });

  it('posiciona cada parcela no mes correto com data segura', () => {
    expect(migration).toContain('create or replace function public.shift_month_preserving_day');
    expect(migration).toContain('public.make_safe_date(');
    expect(migration).toContain('v_installment_date := public.shift_month_preserving_day');
    expect(migration).toContain(
      'public.compute_credit_card_reference_month(v_installment_date, v_card.closing_day)'
    );
  });

  it('aplica a regra de fechamento existente em cada parcela', () => {
    expect(migration).toContain('v_invoice := public.ensure_credit_card_invoice(');
    expect(migration).toContain('v_card.closing_day');
    expect(migration).toContain('v_card.due_day');
    expect(migration).toContain('update public.credit_card_invoices');
  });

  it('compromete o limite pelo valor total da compra parcelada', () => {
    expect(migration).toContain('v_utilized_amount := public.credit_card_utilized_amount');
    expect(migration).toContain('if v_utilized_amount + p_total_amount > v_card.limit_amount then');
    expect(migration).toContain("raise exception 'credit card limit exceeded'");
  });

  it('mantem atomicidade em uma rpc dedicada para parcelamento', () => {
    expect(migration).toContain(
      'create or replace function public.create_credit_card_installment_purchase'
    );
    expect(migration).toContain('for update;');
    expect(migration).toContain('insert into public.credit_card_installment_plans');
    expect(migration).toContain('insert into public.credit_card_transactions');
  });

  it('bloqueia categoria errada e acesso de outro usuario', () => {
    expect(migration).toContain(
      "assert_category_matches_user_and_type(v_user_id, p_category_id, 'expense')"
    );
    expect(migration).toContain("raise exception 'credit card not found for current user'");
    expect(migration).toContain("raise exception 'installment plan not found for current user'");
  });

  it('bloqueia edicao estrutural de parcelas ja criadas', () => {
    expect(migration).toContain(
      "raise exception 'installment purchases must be edited through installment plan metadata'"
    );
    expect(migration).toContain(
      "raise exception 'installment purchases must be cancelled through installment plan'"
    );
    expect(migration).toContain('create or replace function public.update_credit_card_installment_plan');
  });

  it('permite cancelamento apenas quando financeiramente seguro', () => {
    expect(migration).toContain('create or replace function public.cancel_credit_card_installment_plan');
    expect(migration).toContain('and i.paid_amount > 0');
    expect(migration).toContain(
      "raise exception 'installment plan with paid invoices cannot be cancelled safely'"
    );
    expect(migration).toContain('set deleted_at = timezone');
  });

  it('libera limite progressivamente conforme pagamento das faturas', () => {
    expect(migration).toContain('paid_amount = paid_amount + p_amount');
    expect(migration).toContain('perform public.refresh_credit_card_invoice_status(p_invoice_id);');
    expect(migration).toContain('perform public.refresh_credit_card_installment_plan_status');
  });

  it('nao cria despesa duplicada no pagamento da fatura do cartao', () => {
    const paymentSection = migration.split(
      'create or replace function public.create_recurring_generated_transaction'
    )[0];

    expect(paymentSection).not.toMatch(/pay_credit_card_invoice[\s\S]*insert into public\.transactions/i);
  });

  it('restringe leitura do plano ao proprio usuario com rls', () => {
    expect(migration).toContain('alter table public.credit_card_installment_plans enable row level security;');
    expect(migration).toContain('create policy "authenticated users can select own installment plans"');
  });
});
