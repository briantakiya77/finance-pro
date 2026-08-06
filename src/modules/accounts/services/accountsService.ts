import { requireSupabaseClient } from '@/integrations/supabase';
import { accountFormSchema } from '@/modules/accounts/schemas/accountSchema';
import type {
  AccountFormValues,
  AccountInsert,
  AccountMutationResult,
  AccountRow,
  AccountUpdate
} from '@/modules/accounts/types/accounts';

const defaultAccountsErrorMessage =
  'Nao foi possivel concluir a operacao com contas bancarias. Tente novamente.';

const accountsErrorMessages: Record<string, string> = {
  'duplicate key value violates unique constraint "accounts_user_id_primary_unique"':
    'Ja existe uma conta principal definida.',
  'new row violates row-level security policy for table "accounts"':
    'Sua sessao nao tem permissao para alterar esta conta.'
};

function mapAccountsError(error: unknown) {
  if (error instanceof Error && error.message in accountsErrorMessages) {
    return accountsErrorMessages[error.message];
  }

  return defaultAccountsErrorMessage;
}

function normalizeMoneyValue(value: string) {
  return value.replace(',', '.');
}

function mapFormValuesToInsert(values: AccountFormValues): AccountInsert {
  return {
    name: values.name.trim(),
    bank: values.bank.trim(),
    type: values.type,
    color: values.color,
    icon: values.icon,
    initial_balance: normalizeMoneyValue(values.initialBalance),
    current_balance: normalizeMoneyValue(values.currentBalance),
    is_active: values.isActive,
    is_primary: values.isPrimary
  };
}

function mapFormValuesToUpdate(values: AccountFormValues): AccountUpdate {
  return mapFormValuesToInsert(values);
}

function createAccountErrorResult<T>(error: unknown): AccountMutationResult<T> {
  return {
    data: null,
    error: mapAccountsError(error)
  };
}

export const accountsService = {
  async listAccounts(): Promise<AccountMutationResult<AccountRow[]>> {
    try {
      const { data, error } = await requireSupabaseClient()
        .from('accounts')
        .select('*')
        .is('deleted_at', null)
        .order('is_primary', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) {
        return createAccountErrorResult<AccountRow[]>(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createAccountErrorResult<AccountRow[]>(error);
    }
  },

  async createAccount(values: AccountFormValues): Promise<AccountMutationResult<AccountRow>> {
    const parsedValues = accountFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultAccountsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient()
        .from('accounts')
        .insert(mapFormValuesToInsert(parsedValues.data))
        .select()
        .single();

      if (error) {
        return createAccountErrorResult<AccountRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createAccountErrorResult<AccountRow>(error);
    }
  },

  async updateAccount(
    accountId: string,
    values: AccountFormValues
  ): Promise<AccountMutationResult<AccountRow>> {
    const parsedValues = accountFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultAccountsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient()
        .from('accounts')
        .update(mapFormValuesToUpdate(parsedValues.data))
        .eq('id', accountId)
        .select()
        .single();

      if (error) {
        return createAccountErrorResult<AccountRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createAccountErrorResult<AccountRow>(error);
    }
  },

  async softDeleteAccount(accountId: string): Promise<AccountMutationResult<AccountRow>> {
    try {
      const { error } = await requireSupabaseClient()
        .from('accounts')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false,
          is_primary: false
        })
        .eq('id', accountId);

      if (error) {
        return createAccountErrorResult<AccountRow>(error);
      }

      return {
        data: null,
        error: null
      };
    } catch (error) {
      return createAccountErrorResult<AccountRow>(error);
    }
  },

  async setPrimaryAccount(accountId: string): Promise<AccountMutationResult<AccountRow>> {
    try {
      const { data, error } = await requireSupabaseClient()
        .from('accounts')
        .update({
          is_primary: true
        })
        .eq('id', accountId)
        .select()
        .single();

      if (error) {
        return createAccountErrorResult<AccountRow>(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createAccountErrorResult<AccountRow>(error);
    }
  }
};
