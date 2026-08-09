import type { Database } from '@/integrations/supabase';

export type FinancialGoalRow = Database['public']['Tables']['financial_goals']['Row'];
export type FinancialGoalStatus = Database['public']['Enums']['financial_goal_status'];
export type FinancialGoalType = Database['public']['Enums']['financial_goal_type'];

export type GoalsMutationResult<T> = {
  data: T | null;
  error: string | null;
};

export type FinancialGoalFormValues = {
  currentAmount: string;
  name: string;
  notes: string;
  targetAmount: string;
  targetDate: string;
  type: FinancialGoalType;
};

export type GoalProgressFormValues = {
  amount: string;
};

export const financialGoalTypeOptions = [
  { value: 'emergency_fund', label: 'Reserva de emergencia' },
  { value: 'purchase', label: 'Compra' },
  { value: 'travel', label: 'Viagem' },
  { value: 'education', label: 'Educacao' },
  { value: 'other', label: 'Outro' }
] as const satisfies ReadonlyArray<{ value: FinancialGoalType; label: string }>;
