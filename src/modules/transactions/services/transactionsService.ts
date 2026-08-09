import { requireSupabaseClient } from '@/integrations/supabase';
import { transactionFormSchema } from '@/modules/transactions/schemas/transactionSchema';
import type {
  TransactionCreatePayload,
  TransactionFormValues,
  TransactionListOptions,
  TransactionMutationResult,
  TransactionRow,
  TransactionUpdatePayload,
  TransactionWithRelations
} from '@/modules/transactions/types/transactions';

const defaultTransactionsErrorMessage =
  'Nao foi possivel concluir a operacao com lancamentos. Tente novamente.';

const transactionsErrorMessages: Record<string, string> = {
  'account not found for current user': 'A conta selecionada nao esta disponivel para sua sessao.',
  'category not found for current user and transaction type':
    'A categoria selecionada nao pertence ao tipo do lancamento.',
  'amount must be positive numeric(14,2)': 'Informe um valor positivo com ate duas casas decimais.',
  'new row violates row-level security policy for table "transactions"':
    'Sua sessao nao tem permissao para alterar este lancamento.'
};

function mapTransactionsError(error: unknown) {
  if (error instanceof Error && error.message in transactionsErrorMessages) {
    return transactionsErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultTransactionsErrorMessage;
  }

  return defaultTransactionsErrorMessage;
}

function createTransactionErrorResult<T>(error: unknown): TransactionMutationResult<T> {
  return {
    data: null,
    error: mapTransactionsError(error)
  };
}

function parseTransactionFormValues(values: TransactionFormValues) {
  const parsedValues = transactionFormSchema.safeParse(values);

  if (!parsedValues.success) {
    return {
      data: null,
      error: parsedValues.error.issues[0]?.message ?? defaultTransactionsErrorMessage
    };
  }

  return {
    data: parsedValues.data,
    error: null
  };
}

export const transactionsService = {
  async listTransactions(
    options: TransactionListOptions = {}
  ): Promise<TransactionMutationResult<TransactionWithRelations[]>> {
    const page = options.page ?? 0;
    const limit = options.limit ?? 25;
    const from = page * limit;
    const to = from + limit - 1;

    try {
      await requireSupabaseClient().rpc('generate_due_recurring_transactions');

      const { data, error } = await requireSupabaseClient()
        .from('transactions')
        .select(
          'id,user_id,account_id,category_id,type,description,amount,transaction_date,notes,client_mutation_id,deleted_at,created_at,updated_at,accounts(id,name,bank),categories(id,name,type,icon,color)'
        )
        .is('deleted_at', null)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return createTransactionErrorResult<TransactionWithRelations[]>(error);
      }

      return {
        data: (data ?? []) as TransactionWithRelations[],
        error: null
      };
    } catch (error) {
      return createTransactionErrorResult<TransactionWithRelations[]>(error);
    }
  },

  async createTransaction(
    payload: TransactionCreatePayload
  ): Promise<TransactionMutationResult<TransactionRow>> {
    const parsedValues = parseTransactionFormValues(payload.values);

    if (parsedValues.error || !parsedValues.data) {
      return {
        data: null,
        error: parsedValues.error
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('create_transaction', {
        p_account_id: parsedValues.data.accountId,
        p_category_id: parsedValues.data.categoryId || null,
        p_type: parsedValues.data.type,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_transaction_date: parsedValues.data.transactionDate,
        p_notes: parsedValues.data.notes || null,
        p_client_mutation_id: payload.clientMutationId
      });

      if (error) {
        return createTransactionErrorResult<TransactionRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransactionErrorResult<TransactionRow>(error);
    }
  },

  async updateTransaction(
    payload: TransactionUpdatePayload
  ): Promise<TransactionMutationResult<TransactionRow>> {
    const parsedValues = parseTransactionFormValues(payload.values);

    if (parsedValues.error || !parsedValues.data) {
      return {
        data: null,
        error: parsedValues.error
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('update_transaction', {
        p_transaction_id: payload.transactionId,
        p_account_id: parsedValues.data.accountId,
        p_category_id: parsedValues.data.categoryId || null,
        p_type: parsedValues.data.type,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_transaction_date: parsedValues.data.transactionDate,
        p_notes: parsedValues.data.notes || null
      });

      if (error) {
        return createTransactionErrorResult<TransactionRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransactionErrorResult<TransactionRow>(error);
    }
  },

  async softDeleteTransaction(
    transactionId: string
  ): Promise<TransactionMutationResult<TransactionRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('soft_delete_transaction', {
        p_transaction_id: transactionId
      });

      if (error) {
        return createTransactionErrorResult<TransactionRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransactionErrorResult<TransactionRow>(error);
    }
  }
};
