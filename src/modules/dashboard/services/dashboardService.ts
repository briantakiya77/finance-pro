import { requireSupabaseClient } from '@/integrations/supabase';
import type { TransactionWithRelations } from '@/modules/transactions/types/transactions';
import { addDecimalMoney } from '@/shared/utils/money';

export type DashboardSummary = {
  accountsCount: number;
  availableBalance: string;
  currentMonthExpense: string;
  currentMonthIncome: string;
};

export type DashboardSummaryResult = {
  data: DashboardSummary | null;
  error: string | null;
};

export type DashboardRecentTransactionsResult = {
  data: TransactionWithRelations[] | null;
  error: string | null;
};

function getCurrentMonthRange() {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    from: firstDay.toISOString().slice(0, 10),
    to: nextMonth.toISOString().slice(0, 10)
  };
}

function mapDashboardError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar o resumo financeiro.';
}

export const dashboardService = {
  async getSummary(): Promise<DashboardSummaryResult> {
    try {
      const { from, to } = getCurrentMonthRange();
      const client = requireSupabaseClient();

      await client.rpc('generate_due_recurring_transactions');

      const [accountsResponse, incomeResponse, expenseResponse, cardExpenseResponse] =
        await Promise.all([
          client
            .from('accounts')
            .select('current_balance', { count: 'exact' })
            .eq('is_active', true)
            .is('deleted_at', null),
          client
            .from('transactions')
            .select('amount')
            .eq('type', 'income')
            .gte('transaction_date', from)
            .lt('transaction_date', to)
            .is('deleted_at', null),
          client
            .from('transactions')
            .select('amount')
            .eq('type', 'expense')
            .gte('transaction_date', from)
            .lt('transaction_date', to)
            .is('deleted_at', null),
          client
            .from('credit_card_transactions')
            .select('amount')
            .gte('purchase_date', from)
            .lt('purchase_date', to)
            .is('deleted_at', null)
        ]);

      if (accountsResponse.error) {
        return { data: null, error: mapDashboardError(accountsResponse.error) };
      }

      if (incomeResponse.error) {
        return { data: null, error: mapDashboardError(incomeResponse.error) };
      }

      if (expenseResponse.error) {
        return { data: null, error: mapDashboardError(expenseResponse.error) };
      }

      if (cardExpenseResponse.error) {
        return { data: null, error: mapDashboardError(cardExpenseResponse.error) };
      }

      const bankExpenseTotal = (expenseResponse.data ?? []).reduce(
        (total, transaction) => addDecimalMoney(total, transaction.amount),
        '0.00'
      );
      const cardExpenseTotal = (cardExpenseResponse.data ?? []).reduce(
        (total, transaction) => addDecimalMoney(total, transaction.amount),
        '0.00'
      );

      return {
        data: {
          accountsCount: accountsResponse.count ?? 0,
          availableBalance: (accountsResponse.data ?? []).reduce(
            (total, account) => addDecimalMoney(total, account.current_balance),
            '0.00'
          ),
          currentMonthIncome: (incomeResponse.data ?? []).reduce(
            (total, transaction) => addDecimalMoney(total, transaction.amount),
            '0.00'
          ),
          currentMonthExpense: addDecimalMoney(bankExpenseTotal, cardExpenseTotal)
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: mapDashboardError(error) };
    }
  },

  async getRecentTransactions(): Promise<DashboardRecentTransactionsResult> {
    try {
      const { data, error } = await requireSupabaseClient()
        .from('transactions')
        .select(
          'id,user_id,account_id,category_id,type,description,amount,transaction_date,notes,client_mutation_id,deleted_at,created_at,updated_at,accounts(id,name,bank),categories(id,name,type,icon,color)'
        )
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        return { data: null, error: mapDashboardError(error) };
      }

      return {
        data: (data ?? []) as TransactionWithRelations[],
        error: null
      };
    } catch (error) {
      return { data: null, error: mapDashboardError(error) };
    }
  }
};
