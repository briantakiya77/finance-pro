import { requireSupabaseClient } from '@/integrations/supabase';
import { transferFormSchema } from '@/modules/transfers/schemas/transferSchema';
import type {
  TransferCreatePayload,
  TransferFormValues,
  TransferListOptions,
  TransferMutationResult,
  TransferRow,
  TransferUpdatePayload
} from '@/modules/transfers/types/transfers';

const defaultTransfersErrorMessage =
  'Nao foi possivel concluir a operacao com transferencias. Tente novamente.';

const transfersErrorMessages: Record<string, string> = {
  'transfer accounts must be different':
    'A conta de origem deve ser diferente da conta de destino.',
  'transfer accounts not found for current user':
    'As contas da transferencia nao pertencem a sua sessao atual.',
  'transfer not found for current user': 'A transferencia solicitada nao esta disponivel.',
  'amount must be positive numeric(14,2)': 'Informe um valor positivo com ate duas casas decimais.',
  'new row violates row-level security policy for table "transfers"':
    'Sua sessao nao tem permissao para alterar esta transferencia.'
};

function mapTransfersError(error: unknown) {
  if (error instanceof Error && error.message in transfersErrorMessages) {
    return transfersErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultTransfersErrorMessage;
  }

  return defaultTransfersErrorMessage;
}

function createTransferErrorResult<T>(error: unknown): TransferMutationResult<T> {
  return {
    data: null,
    error: mapTransfersError(error)
  };
}

function normalizeMoneyValue(value: string) {
  return value.replace(',', '.');
}

function parseTransferFormValues(values: TransferFormValues) {
  const parsedValues = transferFormSchema.safeParse(values);

  if (!parsedValues.success) {
    return {
      data: null,
      error: parsedValues.error.issues[0]?.message ?? defaultTransfersErrorMessage
    };
  }

  return {
    data: parsedValues.data,
    error: null
  };
}

export const transfersService = {
  async listTransfers(
    options: TransferListOptions = {}
  ): Promise<TransferMutationResult<TransferRow[]>> {
    const page = options.page ?? 0;
    const limit = options.limit ?? 25;
    const from = page * limit;
    const to = from + limit - 1;

    try {
      const { data, error } = await requireSupabaseClient()
        .from('transfers')
        .select(
          'id,user_id,from_account_id,to_account_id,amount,description,transfer_date,client_mutation_id,deleted_at,created_at,updated_at'
        )
        .is('deleted_at', null)
        .order('transfer_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        return createTransferErrorResult<TransferRow[]>(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createTransferErrorResult<TransferRow[]>(error);
    }
  },

  async createTransfer(payload: TransferCreatePayload): Promise<TransferMutationResult<TransferRow>> {
    const parsedValues = parseTransferFormValues(payload.values);

    if (parsedValues.error || !parsedValues.data) {
      return {
        data: null,
        error: parsedValues.error
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('create_transfer', {
        p_from_account_id: parsedValues.data.fromAccountId,
        p_to_account_id: parsedValues.data.toAccountId,
        p_amount: normalizeMoneyValue(parsedValues.data.amount),
        p_description: parsedValues.data.description || null,
        p_transfer_date: parsedValues.data.transferDate,
        p_client_mutation_id: payload.clientMutationId
      });

      if (error) {
        return createTransferErrorResult<TransferRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransferErrorResult<TransferRow>(error);
    }
  },

  async updateTransfer(payload: TransferUpdatePayload): Promise<TransferMutationResult<TransferRow>> {
    const parsedValues = parseTransferFormValues(payload.values);

    if (parsedValues.error || !parsedValues.data) {
      return {
        data: null,
        error: parsedValues.error
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('update_transfer', {
        p_transfer_id: payload.transferId,
        p_from_account_id: parsedValues.data.fromAccountId,
        p_to_account_id: parsedValues.data.toAccountId,
        p_amount: normalizeMoneyValue(parsedValues.data.amount),
        p_description: parsedValues.data.description || null,
        p_transfer_date: parsedValues.data.transferDate
      });

      if (error) {
        return createTransferErrorResult<TransferRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransferErrorResult<TransferRow>(error);
    }
  },

  async softDeleteTransfer(transferId: string): Promise<TransferMutationResult<TransferRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('soft_delete_transfer', {
        p_transfer_id: transferId
      });

      if (error) {
        return createTransferErrorResult<TransferRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createTransferErrorResult<TransferRow>(error);
    }
  }
};
