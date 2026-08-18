import { describe, expect, it, vi } from 'vitest';

import { requireSupabaseClient } from '@/integrations/supabase';
import { dashboardService } from '@/modules/dashboard/services/dashboardService';

function createResolvedQuery(response: unknown) {
  const query = {
    eq: vi.fn(() => query),
    gte: vi.fn(() => query),
    is: vi.fn(() => query),
    limit: vi.fn(() => query),
    lt: vi.fn(() => query),
    order: vi.fn(() => query),
    select: vi.fn(() => query),
    then: (resolve: (value: unknown) => void) => Promise.resolve(response).then(resolve)
  };

  return query;
}

describe('dashboardService', () => {
  it('soma despesas bancarias com compras no cartao sem considerar pagamento de fatura como nova despesa', async () => {
    const client = requireSupabaseClient() as unknown as {
      from: ReturnType<typeof vi.fn>;
    };

    client.from.mockImplementation((tableName: string) => {
      if (tableName === 'accounts') {
        return createResolvedQuery({
          count: 2,
          data: [{ current_balance: '1000.00' }, { current_balance: '250.00' }],
          error: null
        });
      }

      if (tableName === 'transactions') {
        const incomeResponse = createResolvedQuery({
          data: [{ amount: '3000.00' }],
          error: null
        });
        const expenseResponse = createResolvedQuery({
          data: [{ amount: '400.00' }],
          error: null
        });
        return {
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) =>
              value === 'income' ? incomeResponse : expenseResponse
            )
          }))
        };
      }

      if (tableName === 'credit_card_transactions') {
        return createResolvedQuery({
          data: [{ amount: '250.00' }],
          error: null
        });
      }

      throw new Error(`Tabela nao tratada no teste: ${tableName}`);
    });

    const result = await dashboardService.getSummary();

    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      accountsCount: 2,
      availableBalance: '1250.00',
      currentMonthIncome: '3000.00',
      currentMonthExpense: '650.00'
    });
  });

  it('mescla caixa, compras no cartao e pagamentos de fatura sem incluir transferencias', async () => {
    const client = requireSupabaseClient() as unknown as {
      from: ReturnType<typeof vi.fn>;
    };

    client.from.mockImplementation((tableName: string) => {
      if (tableName === 'transactions') {
        return createResolvedQuery({
          data: [
            {
              id: 'tx-1',
              type: 'income',
              description: 'Salario',
              amount: '3000.00',
              transaction_date: '2026-08-18',
              created_at: '2026-08-18T08:00:00.000Z',
              accounts: { id: 'acc-1', name: 'Conta principal', bank: 'Banco 1' },
              categories: {
                id: 'cat-1',
                name: 'Salario',
                type: 'income',
                icon: 'briefcase-business',
                color: '#2ECC71'
              }
            }
          ],
          error: null
        });
      }

      if (tableName === 'credit_card_transactions') {
        return createResolvedQuery({
          data: [
            {
              id: 'purchase-1',
              description: 'Mercado',
              amount: '300.00',
              purchase_date: '2026-08-17',
              credit_cards: { id: 'card-1', name: 'Nubank', bank: 'Nubank' },
              installment_number: 2,
              installment_count: 10
            }
          ],
          error: null
        });
      }

      if (tableName === 'credit_card_invoice_payments') {
        return createResolvedQuery({
          data: [
            {
              id: 'payment-1',
              amount: '300.00',
              paid_at: '2026-08-18T09:30:00.000Z',
              accounts: { id: 'acc-1', name: 'Conta principal', bank: 'Banco 1' },
              credit_card_invoices: {
                id: 'invoice-1',
                reference_month: '2026-08-01',
                due_date: '2026-08-20',
                credit_cards: { id: 'card-1', name: 'Nubank', bank: 'Nubank' }
              }
            }
          ],
          error: null
        });
      }

      throw new Error(`Tabela nao tratada no teste: ${tableName}`);
    });

    const result = await dashboardService.getRecentTransactions();

    expect(result.error).toBeNull();
    expect(result.data).toHaveLength(3);
    expect(result.data?.[0]?.kind).toBe('credit-card-payment');
    expect(result.data?.[1]?.kind).toBe('bank-transaction');
    expect(result.data?.[2]?.kind).toBe('credit-card-purchase');
    expect(client.from).toHaveBeenCalledWith('transactions');
    expect(client.from).toHaveBeenCalledWith('credit_card_transactions');
    expect(client.from).toHaveBeenCalledWith('credit_card_invoice_payments');
    expect(client.from).not.toHaveBeenCalledWith('transfers');
  });
});
