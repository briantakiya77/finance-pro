import { describe, expect, it } from 'vitest';

import {
  getAvailableLimit,
  getClosingDate,
  getDueDate,
  getInvoiceOutstandingAmount,
  getInvoiceStatus,
  getReferenceMonthFromPurchaseDate,
  sumInvoicesUtilizedAmount
} from '@/modules/credit-cards/services/creditCardBilling';

describe('creditCardBilling', () => {
  it('coloca compra antes do fechamento na mesma competencia', () => {
    expect(getReferenceMonthFromPurchaseDate('2026-08-08', 10)).toBe('2026-08-01');
  });

  it('coloca compra apos o fechamento na competencia seguinte', () => {
    expect(getReferenceMonthFromPurchaseDate('2026-08-12', 10)).toBe('2026-09-01');
  });

  it('calcula data de fechamento respeitando meses curtos', () => {
    expect(getClosingDate('2026-02-01', 31)).toBe('2026-02-28');
  });

  it('mantem o vencimento no mesmo mes quando due day e maior que closing day', () => {
    expect(getDueDate('2026-08-01', 10, 15)).toBe('2026-08-15');
  });

  it('leva o vencimento para o proximo mes quando due day e menor ou igual ao fechamento', () => {
    expect(getDueDate('2026-08-01', 25, 10)).toBe('2026-09-10');
  });

  it('marca fatura como paga quando paid_amount cobre o total', () => {
    expect(
      getInvoiceStatus({
        closing_date: '2026-08-10',
        paid_amount: '500.00',
        status: 'open',
        total_amount: '500.00'
      })
    ).toBe('paid');
  });

  it('marca fatura como fechada apos a data de fechamento', () => {
    expect(
      getInvoiceStatus(
        {
          closing_date: '2026-08-10',
          paid_amount: '0.00',
          status: 'open',
          total_amount: '500.00'
        },
        new Date('2026-08-11T12:00:00.000Z')
      )
    ).toBe('closed');
  });

  it('soma apenas saldo em aberto para limite utilizado', () => {
    expect(
      sumInvoicesUtilizedAmount([
        { total_amount: '500.00', paid_amount: '0.00', status: 'open' },
        { total_amount: '200.00', paid_amount: '50.00', status: 'closed' },
        { total_amount: '100.00', paid_amount: '100.00', status: 'paid' }
      ])
    ).toBe('650.00');
  });

  it('deriva o limite disponivel sem armazenar valor duplicado', () => {
    expect(getAvailableLimit('2000.00', '650.00')).toBe('1350.00');
  });

  it('calcula o saldo restante da fatura', () => {
    expect(
      getInvoiceOutstandingAmount({
        total_amount: '780.00',
        paid_amount: '280.00'
      })
    ).toBe('500.00');
  });
});
