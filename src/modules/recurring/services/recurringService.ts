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

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

function getLastDayOfMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function buildScheduledDate(referencePeriod: string, dayOfMonth: number) {
  const [yearText, monthText] = referencePeriod.split('-');
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const safeDay = Math.min(dayOfMonth, getLastDayOfMonth(year, monthIndex));
  return new Date(Date.UTC(year, monthIndex, safeDay)).toISOString().slice(0, 10);
}

function getRecurringProjectionDate(row: RecurringTransactionRow) {
  const today = new Date();
  const currentPeriod = getMonthStart(today);
  const currentScheduledDate = buildScheduledDate(currentPeriod, row.day_of_month);

  if (row.status !== 'active') {
    return currentScheduledDate;
  }

  if (row.last_generated_period) {
    const lastGenerated = new Date(`${row.last_generated_period}T00:00:00Z`);
    const nextMonth = new Date(
      Date.UTC(lastGenerated.getUTCFullYear(), lastGenerated.getUTCMonth() + 1, 1)
    );
    return buildScheduledDate(getMonthStart(nextMonth), row.day_of_month);
  }

  if (currentScheduledDate >= getToday()) {
    return currentScheduledDate;
  }

  const nextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
  return buildScheduledDate(getMonthStart(nextMonth), row.day_of_month);
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
      const [recurringResponse, installmentsResponse] = await Promise.all([
        requireSupabaseClient()
          .from('recurring_transactions')
          .select(
            'id,description,amount,day_of_month,status,last_generated_period,start_date,end_date'
          )
          .is('deleted_at', null)
          .neq('status', 'cancelled'),
        requireSupabaseClient()
          .from('credit_card_transactions')
          .select('id,description,amount,purchase_date,installment_number,installment_count')
          .not('installment_plan_id', 'is', null)
          .is('deleted_at', null)
          .gte('purchase_date', getToday())
          .order('purchase_date', { ascending: true })
          .limit(12)
      ]);

      if (recurringResponse.error) {
        return createRecurringErrorResult(recurringResponse.error);
      }

      if (installmentsResponse.error) {
        return createRecurringErrorResult(installmentsResponse.error);
      }

      const recurringItems: RecurringProjectionItem[] = (recurringResponse.data ?? []).map((row) => ({
        kind: 'recurring',
        id: row.id,
        title: row.description,
        amount: row.amount,
        scheduledDate: getRecurringProjectionDate({
          ...row,
          user_id: '',
          account_id: '',
          category_id: null,
          type: 'expense',
          frequency: 'monthly',
          notes: null,
          deleted_at: null,
          created_at: '',
          updated_at: ''
        } as RecurringTransactionRow),
        detail: `Todo dia ${row.day_of_month}`
      }));

      const installmentItems: RecurringProjectionItem[] = (installmentsResponse.data ?? []).map((row) => ({
        kind: 'installment',
        id: row.id,
        title: row.description,
        amount: row.amount,
        scheduledDate: row.purchase_date,
        detail: `${row.installment_number}/${row.installment_count}`
      }));

      return {
        data: [...recurringItems, ...installmentItems]
          .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))
          .slice(0, 12),
        error: null
      };
    } catch (error) {
      return createRecurringErrorResult(error);
    }
  }
};
