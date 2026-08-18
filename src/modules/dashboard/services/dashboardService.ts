import { requireSupabaseClient } from '@/integrations/supabase';
import type {
  CreditCardInvoicePaymentRow,
  CreditCardRow,
  CreditCardTransactionRow
} from '@/modules/credit-cards/types/creditCards';
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
  data: DashboardFeedItem[] | null;
  error: string | null;
};

type DashboardBankTransaction = {
  kind: 'bank-transaction';
  occurredAt: string;
  sortDate: string;
  transaction: TransactionWithRelations;
};

type DashboardCreditCardPurchase = {
  kind: 'credit-card-purchase';
  occurredAt: string;
  sortDate: string;
  purchase: CreditCardTransactionRow & {
    categories: {
      id: string;
      name: string;
      type: string;
      icon: string;
      color: string;
    } | null;
    credit_cards: Pick<CreditCardRow, 'id' | 'name' | 'bank'> | null;
  };
};

type DashboardCreditCardInvoicePayment = {
  kind: 'credit-card-payment';
  occurredAt: string;
  sortDate: string;
  payment: CreditCardInvoicePaymentRow & {
    accounts: {
      id: string;
      name: string;
      bank: string;
    } | null;
    credit_card_invoices: {
      id: string;
      reference_month: string;
      due_date: string;
      credit_cards: Pick<CreditCardRow, 'id' | 'name' | 'bank'> | null;
    } | null;
  };
};

export type DashboardFeedItem =
  | DashboardBankTransaction
  | DashboardCreditCardPurchase
  | DashboardCreditCardInvoicePayment;

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
      const client = requireSupabaseClient();
      const [transactionsResponse, purchasesResponse, paymentsResponse] = await Promise.all([
        client
          .from('transactions')
          .select(
            'id,user_id,account_id,category_id,type,description,amount,transaction_date,notes,client_mutation_id,deleted_at,created_at,updated_at,accounts(id,name,bank),categories(id,name,type,icon,color)'
          )
          .is('deleted_at', null)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
        client
          .from('credit_card_transactions')
          .select(
            'id,user_id,credit_card_id,invoice_id,category_id,description,amount,purchase_date,notes,client_mutation_id,installment_plan_id,installment_number,installment_count,deleted_at,created_at,updated_at,categories(id,name,type,icon,color),credit_cards(id,name,bank)'
          )
          .is('deleted_at', null)
          .order('purchase_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5),
        client
          .from('credit_card_invoice_payments')
          .select(
            'id,user_id,invoice_id,account_id,amount,paid_at,client_mutation_id,created_at,accounts(id,name,bank),credit_card_invoices(id,reference_month,due_date,credit_cards(id,name,bank))'
          )
          .order('paid_at', { ascending: false })
          .limit(5)
      ]);

      if (transactionsResponse.error) {
        return { data: null, error: mapDashboardError(transactionsResponse.error) };
      }

      if (purchasesResponse.error) {
        return { data: null, error: mapDashboardError(purchasesResponse.error) };
      }

      if (paymentsResponse.error) {
        return { data: null, error: mapDashboardError(paymentsResponse.error) };
      }

      const feed: DashboardFeedItem[] = [
        ...((transactionsResponse.data ?? []) as TransactionWithRelations[]).map((transaction) => ({
          kind: 'bank-transaction' as const,
          occurredAt: transaction.transaction_date,
          sortDate: `${transaction.transaction_date}T00:00:00.000Z`,
          transaction
        })),
        ...((purchasesResponse.data ?? []) as DashboardCreditCardPurchase['purchase'][]).map(
          (purchase) => ({
            kind: 'credit-card-purchase' as const,
            occurredAt: purchase.purchase_date,
            sortDate: `${purchase.purchase_date}T00:00:00.000Z`,
            purchase
          })
        ),
        ...((paymentsResponse.data ?? []) as DashboardCreditCardInvoicePayment['payment'][]).map(
          (payment) => ({
            kind: 'credit-card-payment' as const,
            occurredAt: payment.paid_at,
            sortDate: payment.paid_at,
            payment
          })
        )
      ]
        .sort((left, right) => Date.parse(right.sortDate) - Date.parse(left.sortDate))
        .slice(0, 5);

      return { data: feed, error: null };
    } catch (error) {
      return { data: null, error: mapDashboardError(error) };
    }
  }
};
