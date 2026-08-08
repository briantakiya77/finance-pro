import type { Database } from '@/integrations/supabase';

export type FinancialEntryType = Database['public']['Enums']['financial_entry_type'];
export type CategoryRow = Database['public']['Tables']['categories']['Row'];

export type CategoryMutationResult<T = CategoryRow> = {
  data: T | null;
  error: string | null;
};

export const financialEntryTypeOptions = [
  { value: 'income', label: 'Receita' },
  { value: 'expense', label: 'Despesa' }
] as const satisfies ReadonlyArray<{ value: FinancialEntryType; label: string }>;
