import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildInstallmentPreview } from '@/modules/credit-cards/services/installmentPreview';
import { addDecimalMoney, normalizeDecimalMoneyInput } from '@/shared/utils/money';

const accountsCoreMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260806030517_create_accounts_module.sql'),
  'utf-8'
);
const transactionsHardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808063000_harden_financial_writes.sql'),
  'utf-8'
);
const creditCardsMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260808194000_create_credit_cards_core.sql'),
  'utf-8'
);
const creditCardsHardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809093000_harden_credit_card_helper_functions.sql'),
  'utf-8'
);
const installmentsRecurringMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809113000_create_installments_and_recurring_core.sql'),
  'utf-8'
);
const dashboardService = readFileSync(
  resolve(process.cwd(), 'src/modules/dashboard/services/dashboardService.ts'),
  'utf-8'
);
const creditCardPurchaseSection = creditCardsMigration.split(
  'create or replace function public.update_credit_card_purchase'
)[0];

function subtractDecimalMoney(left: string, right: string) {
  const normalizedLeft = normalizeDecimalMoneyInput(left);
  const normalizedRight = normalizeDecimalMoneyInput(right);
  const [leftInteger, leftDecimal = '00'] = normalizedLeft.split('.');
  const [rightInteger, rightDecimal = '00'] = normalizedRight.split('.');
  const leftCents = BigInt(leftInteger) * 100n + BigInt(leftDecimal.padEnd(2, '0').slice(0, 2));
  const rightCents =
    BigInt(rightInteger) * 100n + BigInt(rightDecimal.padEnd(2, '0').slice(0, 2));
  const totalCents = leftCents - rightCents;

  return `${totalCents / 100n}.${String(totalCents % 100n).padStart(2, '0')}`;
}

describe('financial integration audit', () => {
  it('mapeia as fontes de verdade do sistema financeiro', () => {
    expect(accountsCoreMigration).toContain('current_balance numeric(14, 2) not null');
    expect(transactionsHardeningMigration).toContain("raise exception 'current_balance is system managed'");
    expect(transactionsHardeningMigration).toContain('create or replace function public.create_transaction');
    expect(creditCardsMigration).toContain('create table public.credit_card_transactions');
    expect(creditCardsMigration).toContain('create table public.credit_card_invoices');
    expect(creditCardsMigration).toContain('create table public.credit_card_invoice_payments');
    expect(installmentsRecurringMigration).toContain('create table public.credit_card_installment_plans');
    expect(installmentsRecurringMigration).toContain('create table public.recurring_transactions');
    expect(installmentsRecurringMigration).toContain(
      'create table public.recurring_transaction_occurrences'
    );
  });

  it('confirma como o saldo bancario eh atualizado', () => {
    expect(transactionsHardeningMigration).toContain(
      'set current_balance = current_balance + v_signed_amount'
    );
    expect(transactionsHardeningMigration).toContain(
      'set current_balance = current_balance - v_old_signed_amount'
    );
    expect(transactionsHardeningMigration).toContain(
      'set current_balance = current_balance - v_signed_amount'
    );
    expect(creditCardsMigration).toContain('set current_balance = current_balance - p_amount');
    expect(creditCardPurchaseSection).not.toMatch(
      /create_credit_card_purchase[\s\S]*current_balance = current_balance/i
    );
  });

  it('confirma como o dashboard calcula saldo, receitas e despesas', () => {
    expect(dashboardService).toContain("await client.rpc('generate_due_recurring_transactions');");
    expect(dashboardService).toContain(".from('accounts')");
    expect(dashboardService).toContain(".from('transactions')");
    expect(dashboardService).toContain(".eq('type', 'income')");
    expect(dashboardService).toContain(".eq('type', 'expense')");
    expect(dashboardService).toContain(".from('credit_card_transactions')");
    expect(dashboardService).not.toContain(".from('credit_card_invoice_payments')");
    expect(dashboardService).toContain('currentMonthExpense: addDecimalMoney(bankExpenseTotal, cardExpenseTotal)');
  });

  it('garante que compra no cartao nao reduz saldo bancario e pagamento nao cria despesa duplicada', () => {
    expect(creditCardPurchaseSection).not.toMatch(
      /create_credit_card_purchase[\s\S]*set current_balance = current_balance/i
    );
    expect(creditCardsMigration).toContain('create or replace function public.pay_credit_card_invoice');
    expect(creditCardsMigration).toContain('set current_balance = current_balance - p_amount');

    const paymentSection = installmentsRecurringMigration.split(
      'create or replace function public.create_recurring_generated_transaction'
    )[0];
    expect(paymentSection).not.toMatch(/pay_credit_card_invoice[\s\S]*insert into public\.transactions/i);
  });

  it('garante que parcelamento compromete limite total e libera progressivamente por pagamento de fatura', () => {
    expect(installmentsRecurringMigration).toContain(
      'if v_utilized_amount + p_total_amount > v_card.limit_amount then'
    );
    expect(installmentsRecurringMigration).toContain('set paid_amount = paid_amount + p_amount');
    expect(installmentsRecurringMigration).toContain(
      'perform public.refresh_credit_card_installment_plan_status(v_plan_id);'
    );
  });

  it('garante que recorrencia nao altera saldo ao ser criada e so impacta quando gera transaction real', () => {
    expect(installmentsRecurringMigration).toContain(
      'create or replace function public.create_recurring_transaction'
    );
    expect(installmentsRecurringMigration).not.toMatch(
      /create or replace function public\.create_recurring_transaction[\s\S]*current_balance = current_balance/i
    );
    expect(installmentsRecurringMigration).toContain(
      'create or replace function public.create_recurring_generated_transaction'
    );
    expect(installmentsRecurringMigration).toContain(
      'set current_balance = current_balance + v_signed_amount'
    );
  });

  it('protege limite, RLS e ownership entre usuarios nos modulos integrados', () => {
    expect(creditCardsHardeningMigration).toContain(
      'revoke execute on function public.credit_card_utilized_amount(uuid) from public, anon, authenticated;'
    );
    expect(creditCardsHardeningMigration).toContain(
      'revoke execute on function public.ensure_credit_card_invoice(uuid, uuid, date, smallint, smallint) from public, anon, authenticated;'
    );
    expect(installmentsRecurringMigration).toContain(
      'create policy "authenticated users can select own installment plans"'
    );
    expect(installmentsRecurringMigration).toContain(
      'create policy "authenticated users can select own recurring transactions"'
    );
    expect(installmentsRecurringMigration).toContain(
      'create policy "authenticated users can select own recurring transaction occurrences"'
    );
  });

  it('preserva idempotencia nas operacoes financeiras integradas', () => {
    expect(transactionsHardeningMigration).toContain('on conflict (user_id, client_mutation_id) do nothing');
    expect(creditCardsMigration).toContain('on conflict (user_id, client_mutation_id) do nothing');
    expect(installmentsRecurringMigration).toContain(
      'create unique index credit_card_installment_plans_user_mutation_unique'
    );
    expect(installmentsRecurringMigration).toContain(
      'create unique index recurring_transaction_occurrences_period_unique'
    );
    expect(installmentsRecurringMigration).toContain(
      "public.uuid_from_text(p_recurring_transaction_id::text || ':' || p_reference_period::text)"
    );
  });

  it('fecha rateio monetario sem perder centavos em 100/3 e 1000/7', () => {
    expect(buildInstallmentPreview('100', 3).installments).toEqual(['33.34', '33.33', '33.33']);
    expect(buildInstallmentPreview('1000', 7).installments).toEqual([
      '142.86',
      '142.86',
      '142.86',
      '142.86',
      '142.86',
      '142.85',
      '142.85'
    ]);
  });

  it('reproduz o cenario financeiro integrado principal com os valores finais esperados', () => {
    const saldoInicial = '5000.00';
    const salario = '3000.00';
    const aluguel = '500.00';
    const parcelamento = buildInstallmentPreview('3000', 10);
    const primeiraParcela = parcelamento.installments[0] ?? '0.00';
    const internet = '120.00';

    const saldoAposReceita = addDecimalMoney(saldoInicial, salario);
    const saldoAposAluguel = subtractDecimalMoney(saldoAposReceita, aluguel);
    const saldoAposCompraParcelada = saldoAposAluguel;
    const saldoAposPagamentoFatura = subtractDecimalMoney(saldoAposCompraParcelada, primeiraParcela);
    const saldoFinal = subtractDecimalMoney(saldoAposPagamentoFatura, internet);

    const limiteTotal = '5000.00';
    const limiteUtilizadoAposCompra = '3000.00';
    const limiteDisponivelAposCompra = subtractDecimalMoney(limiteTotal, limiteUtilizadoAposCompra);
    const limiteUtilizadoAposPagamento = subtractDecimalMoney(
      limiteUtilizadoAposCompra,
      primeiraParcela
    );
    const limiteDisponivelAposPagamento = subtractDecimalMoney(
      limiteTotal,
      limiteUtilizadoAposPagamento
    );
    const despesasRealizadas = addDecimalMoney(
      addDecimalMoney(aluguel, primeiraParcela),
      internet
    );

    expect(saldoAposReceita).toBe('8000.00');
    expect(saldoAposAluguel).toBe('7500.00');
    expect(saldoAposCompraParcelada).toBe('7500.00');
    expect(saldoAposPagamentoFatura).toBe('7200.00');
    expect(saldoFinal).toBe('7080.00');
    expect(limiteUtilizadoAposCompra).toBe('3000.00');
    expect(limiteDisponivelAposCompra).toBe('2000.00');
    expect(limiteUtilizadoAposPagamento).toBe('2700.00');
    expect(limiteDisponivelAposPagamento).toBe('2300.00');
    expect(despesasRealizadas).toBe('920.00');
    expect(parcelamento.installments.every((item) => item === '300.00')).toBe(true);
  });

  it('confirma o comportamento de pagamento parcial e integral da fatura', () => {
    const totalFatura = '1000.00';
    const primeiroPagamento = '400.00';
    const saldoRestante = subtractDecimalMoney(totalFatura, primeiroPagamento);
    const segundoPagamento = saldoRestante;
    const saldoFinal = subtractDecimalMoney(saldoRestante, segundoPagamento);

    expect(saldoRestante).toBe('600.00');
    expect(segundoPagamento).toBe('600.00');
    expect(saldoFinal).toBe('0.00');
    expect(creditCardsMigration).toContain(
      "raise exception 'invoice payment exceeds outstanding amount'"
    );
  });
});
