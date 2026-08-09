import type { Database } from '@/integrations/supabase';

export type MonthlyPlanRow = Database['public']['Tables']['monthly_plans']['Row'];
export type CategoryBudgetRow = Database['public']['Tables']['category_budgets']['Row'];
export type FinancialGoalType = Database['public']['Enums']['financial_goal_type'];

export type MonthlyPlanOverview = Database['public']['Functions']['get_monthly_plan_overview']['Returns'][number];
export type CategoryBudgetProgress = Database['public']['Functions']['get_category_budget_progress']['Returns'][number];
export type FinancialProjectionRow = Database['public']['Functions']['get_financial_projection']['Returns'][number];
export type UpcomingCommitment = Database['public']['Functions']['get_upcoming_commitments']['Returns'][number];

export type PlanningMutationResult<T> = {
  data: T | null;
  error: string | null;
};

export type PlanningBudgetFormValue = {
  budgetAmount: string;
  categoryId: string;
  categoryName: string;
};

export type PlanningFormValues = {
  expectedIncome: string;
  notes: string;
  savingsTarget: string;
  spendingLimit: string;
  categoryBudgets: PlanningBudgetFormValue[];
};

export type PlanningDashboardSnapshot = {
  categoryBudgets: CategoryBudgetProgress[];
  monthlyPlan: MonthlyPlanOverview | null;
  projection: FinancialProjectionRow[];
  upcomingCommitments: UpcomingCommitment[];
};

export const projectionHorizonOptions = [
  { label: '3 meses', value: 3 },
  { label: '6 meses', value: 6 }
] as const;
