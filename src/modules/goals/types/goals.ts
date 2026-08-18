import type { Database } from '@/integrations/supabase';

export type FinancialGoalRow = Database['public']['Tables']['financial_goals']['Row'];
export type FinancialGoalContributionRow =
  Database['public']['Tables']['financial_goal_contributions']['Row'];
export type FinancialGoalStatus = Database['public']['Enums']['financial_goal_status'];
export type FinancialGoalType = Database['public']['Enums']['financial_goal_type'];

export type GoalsMutationResult<T> = {
  data: T | null;
  error: string | null;
};

export type FinancialGoalFormValues = {
  currentAmount: string;
  targetMonths: string;
  name: string;
  notes: string;
  targetAmount: string;
  targetDate: string;
  type: FinancialGoalType;
};

export type GoalProgressFormValues = {
  accountId: string;
  amount: string;
  contributionDate: string;
  description: string;
};

export const financialGoalTypeOptions = [
  { value: 'general', label: 'Geral' },
  { value: 'emergency_fund', label: 'Reserva de emergencia' },
  { value: 'purchase', label: 'Compra' },
  { value: 'investment', label: 'Investimento' }
] as const satisfies ReadonlyArray<{ value: FinancialGoalType; label: string }>;

export const emergencyTargetMonthOptions = [
  { value: '', label: 'Manual' },
  { value: '3', label: '3 meses' },
  { value: '6', label: '6 meses' },
  { value: '9', label: '9 meses' },
  { value: '12', label: '12 meses' }
] as const;
