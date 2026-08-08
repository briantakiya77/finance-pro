import type { Database } from '@/integrations/supabase';
import type { AccountRow } from '@/modules/accounts/types/accounts';
import type { CategoryRow, FinancialEntryType } from '@/modules/categories/types/categories';

export type TransactionRow = Database['public']['Tables']['transactions']['Row'];

export type TransactionWithRelations = TransactionRow & {
  accounts: Pick<AccountRow, 'bank' | 'id' | 'name'> | null;
  categories: Pick<CategoryRow, 'color' | 'icon' | 'id' | 'name' | 'type'> | null;
};

export type TransactionFormValues = {
  accountId: string;
  amount: string;
  categoryId: string;
  description: string;
  notes: string;
  transactionDate: string;
  type: FinancialEntryType;
};

export type TransactionMutationResult<T = TransactionRow> = {
  data: T | null;
  error: string | null;
};

export type TransactionCreatePayload = {
  clientMutationId: string;
  values: TransactionFormValues;
};

export type TransactionUpdatePayload = {
  transactionId: string;
  values: TransactionFormValues;
};

export type TransactionListOptions = {
  limit?: number;
  page?: number;
};
