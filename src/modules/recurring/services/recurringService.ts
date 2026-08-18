import { requireSupabaseClient } from '@/integrations/supabase';
import { recurringTransactionSchema } from '@/modules/recurring/schemas/recurringSchema';
import type {
  RecurringMutationResult,
  RecurringProjectionItem,
  RecurringTransactionFormValues,
  RecurringTransactionRow,
  RecurringTransactionWithRelations
} from '@/modules/recurring/types/recurring';

const defaultRecurringErrorMessage =
  'Nao foi possivel concluir a operacao com recorrencias. Tente novamente.';

const recurringErrorMessages: Record<string, string> = {
  'account not found for current user': 'A conta selecionada nao esta disponivel para sua sessao.',
  'category not found for current user and transaction type':
    'A categoria selecionada nao pertence ao tipo da recorrencia.',
  'day of month must be between 1 and 31': 'Informe um dia do mes entre 1 e 31.',
  'end date must be equal or after start date':
    'A data final precisa ser igual ou posterior a inicial.',
  'recurring transaction not found for current user':
    'A recorrencia selecionada nao esta disponivel para sua sessao.',
  'cancelled recurring transaction cannot be updated':
    'Recorrencias canceladas nao podem ser alteradas.',
  'cancelled recurring transaction cannot be resumed':
    'Recorrencias canceladas nao podem ser retomadas.'
};

function mapRecurringError(error: unknown) {
  if (error instanceof Error && error.message in recurringErrorMessages) {
    return recurringErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultRecurringErrorMessage;
  }

  return defaultRecurringErrorMessage;
}

function createRecurringErrorResult<T>(error: unknown): RecurringMutationResult<T> {
  return {
    data: null,
    error: mapRecurringError(error)
  };
}

export const recurringService = {
  async generateDueTransactions(): Promise<RecurringMutationResult<number>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('generate_due_recurring_transactions');

      if (error) {
        return createRecurringErrorResult<number>(error);
      }

      return { data: data ?? 0, error: null };
    } catch (error) {
      return createRecurringErrorResult<number>(error);
    }
  },

  async listRecurringTransactions(): Promise<
    RecurringMutationResult<RecurringTransactionWithRelations[]>
  > {
    try {
      await this.generateDueTransactions();

      const { data, error } = await requireSupabaseClient()
        .from('recurring_transactions')
        .select(
          'id,user_id,account_id,category_id,type,description,amount,frequency,day_of_month,start_date,end_date,status,last_generated_period,notes,deleted_at,created_at,updated_at,accounts(id,name,bank),categories(id,name,color,icon,type)'
        )
        .is('deleted_at', null)
        .order('status', { ascending: true })
        .order('day_of_month', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) {
        return createRecurringErrorResult<RecurringTransactionWithRelations[]>(error);
      }

      return {
        data: (data ?? []) as RecurringTransactionWithRelations[],
        error: null
      };
    } catch (error) {
      return createRecurringErrorResult<RecurringTransactionWithRelations[]>(error);
    }
  },

  async createRecurringTransaction(
    values: RecurringTransactionFormValues
  ): Promise<RecurringMutationResult<RecurringTransactionRow>> {
    const parsedValues = recurringTransactionSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultRecurringErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('create_recurring_transaction', {
        p_account_id: parsedValues.data.accountId,
        p_category_id: parsedValues.data.categoryId,
        p_type: parsedValues.data.type,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_frequency: parsedValues.data.frequency,
        p_day_of_month: parsedValues.data.dayOfMonth,
        p_start_date: parsedValues.data.startDate,
        p_end_date: parsedValues.data.endDate || null,
        p_notes: parsedValues.data.notes || null
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  },

  async updateRecurringTransaction(payload: {
    recurringTransactionId: string;
    values: RecurringTransactionFormValues;
  }): Promise<RecurringMutationResult<RecurringTransactionRow>> {
    const parsedValues = recurringTransactionSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultRecurringErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('update_recurring_transaction', {
        p_recurring_transaction_id: payload.recurringTransactionId,
        p_account_id: parsedValues.data.accountId,
        p_category_id: parsedValues.data.categoryId,
        p_type: parsedValues.data.type,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_frequency: parsedValues.data.frequency,
        p_day_of_month: parsedValues.data.dayOfMonth,
        p_start_date: parsedValues.data.startDate,
        p_end_date: parsedValues.data.endDate || null,
        p_notes: parsedValues.data.notes || null
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  },

  async pauseRecurringTransaction(
    recurringTransactionId: string
  ): Promise<RecurringMutationResult<RecurringTransactionRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('pause_recurring_transaction', {
        p_recurring_transaction_id: recurringTransactionId
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  },

  async resumeRecurringTransaction(
    recurringTransactionId: string
  ): Promise<RecurringMutationResult<RecurringTransactionRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('resume_recurring_transaction', {
        p_recurring_transaction_id: recurringTransactionId
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  },

  async cancelRecurringTransaction(
    recurringTransactionId: string
  ): Promise<RecurringMutationResult<RecurringTransactionRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('cancel_recurring_transaction', {
        p_recurring_transaction_id: recurringTransactionId
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  },

  async getProjection(): Promise<RecurringMutationResult<RecurringProjectionItem[]>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('get_upcoming_commitments', {
        p_horizon_days: 60
      });

      if (error) {
        return createRecurringErrorResult(error);
      }

      return {
        data: (data ?? []).map((item) => ({
          kind: item.kind as RecurringProjectionItem['kind'],
          id: item.source_id,
          title: item.title,
          amount: item.amount,
          scheduledDate: item.due_date,
          detail: item.detail
        })),
        error: null
      };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  }
};
