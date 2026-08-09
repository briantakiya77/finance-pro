import type { Database } from '@/integrations/supabase';
import type { AccountRow } from '@/modules/accounts/types/accounts';
import type { CategoryRow, FinancialEntryType } from '@/modules/categories/types/categories';
import type { TransactionRow } from '@/modules/transactions/types/transactions';

export type RecurringTransactionRow = Database['public']['Tables']['recurring_transactions']['Row'];
export type RecurringTransactionOccurrenceRow =
  Database['public']['Tables']['recurring_transaction_occurrences']['Row'];
export type RecurringTransactionStatus =
  Database['public']['Enums']['recurring_transaction_status'];
export type RecurringTransactionFrequency =
  Database['public']['Enums']['recurring_transaction_frequency'];

export type RecurringTransactionFormValues = {
  accountId: string;
  categoryId: string;
  type: FinancialEntryType;
  description: string;
  amount: string;
  dayOfMonth: string;
  startDate: string;
  endDate: string;
  notes: string;
};

export type RecurringMutationResult<T> = {
  data: T | null;
  error: string | null;
};

export type RecurringTransactionWithRelations = RecurringTransactionRow & {
  accounts: Pick<AccountRow, 'id' | 'name' | 'bank'> | null;
  categories: Pick<CategoryRow, 'id' | 'name' | 'color' | 'icon' | 'type'> | null;
};

export type RecurringOccurrenceWithRelations = RecurringTransactionOccurrenceRow & {
  transactions: TransactionRow | null;
};

export type RecurringProjectionItem = {
  kind: 'recurring' | 'installment';
  id: string;
  title: string;
  amount: string;
  scheduledDate: string;
  detail: string;
};
