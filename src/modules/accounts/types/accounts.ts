import type { Database } from '@/integrations/supabase';

export const accountTypeValues = ['corrente', 'poupanca', 'investimento', 'carteira'] as const;
export const accountColorValues = [
  '#8B5CF6',
  '#3B82F6',
  '#2ECC71',
  '#F59E0B',
  '#FF5A5F',
  '#9AA4B2'
] as const;
export const accountIconValues = [
  'landmark',
  'wallet',
  'piggy-bank',
  'banknote',
  'chart-column'
] as const;

export const accountTypeOptions = accountTypeValues.map((value) => ({
  value,
  label:
    value === 'corrente'
      ? 'Corrente'
      : value === 'poupanca'
        ? 'Poupanca'
        : value === 'investimento'
          ? 'Investimento'
          : 'Carteira'
}));

export const accountColorOptions = [...accountColorValues];

export const accountIconOptions = accountIconValues.map((value) => ({
  value,
  label:
    value === 'landmark'
      ? 'Banco'
      : value === 'wallet'
        ? 'Carteira'
        : value === 'piggy-bank'
          ? 'Poupanca'
          : value === 'banknote'
            ? 'Saldo'
            : 'Investimento'
}));

export type AccountType = Database['public']['Enums']['account_type'];
export type AccountRow = Database['public']['Tables']['accounts']['Row'];
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
export type AccountUpdate = Database['public']['Tables']['accounts']['Update'];

export type AccountFormValues = {
  name: string;
  bank: string;
  type: AccountType;
  color: string;
  icon: string;
  initialBalance: string;
  currentBalance: string;
  isActive: boolean;
  isPrimary: boolean;
};

export type AccountMutationResult<T = AccountRow> = {
  data: T | null;
  error: string | null;
};
