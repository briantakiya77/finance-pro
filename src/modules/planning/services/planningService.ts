import { requireSupabaseClient } from '@/integrations/supabase';
import { planningFormSchema } from '@/modules/planning/schemas/planningSchema';
import type {
  CategoryBudgetProgress,
  FinancialProjectionRow,
  MonthlyPlanOverview,
  PlanningDashboardSnapshot,
  PlanningFormValues,
  PlanningMutationResult,
  UpcomingCommitment
} from '@/modules/planning/types/planning';

const defaultPlanningErrorMessage =
  'Nao foi possivel concluir a operacao com planejamento financeiro. Tente novamente.';

const planningErrorMessages: Record<string, string> = {
  'authenticated user required': 'Sua sessao expirou. Entre novamente para continuar.',
  'monthly plan not found for current user':
    'O planejamento mensal selecionado nao pertence a sua sessao.',
  'category budget requires active expense category for current user':
    'Orcamentos so podem usar categorias de despesa ativas da sua conta.',
  'expected income must be null or positive numeric(14,2)':
    'Receita esperada deve ser vazia ou positiva com duas casas decimais.',
  'savings target must be positive numeric(14,2)':
    'Meta de economia deve ser positiva com duas casas decimais.',
  'spending limit must be null or positive numeric(14,2)':
    'Limite de gasto deve ser vazio ou positivo com duas casas decimais.',
  'budget amount must be positive numeric(14,2)':
    'Cada orcamento por categoria deve ser zero ou positivo com duas casas decimais.'
};

function mapPlanningError(error: unknown) {
  if (error instanceof Error && error.message in planningErrorMessages) {
    return planningErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultPlanningErrorMessage;
  }

  return defaultPlanningErrorMessage;
}

function createPlanningErrorResult<T>(error: unknown): PlanningMutationResult<T> {
  return {
    data: null,
    error: mapPlanningError(error)
  };
}

export function getCurrentReferenceMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export function normalizeReferenceMonthInput(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value.slice(0, 7)}-01`;
  }

  return getCurrentReferenceMonth();
}

export function formatReferenceMonthLabel(referenceMonth: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${referenceMonth}T00:00:00Z`));
}

export function formatMonthInputValue(referenceMonth: string) {
  return referenceMonth.slice(0, 7);
}

export function getUsageTone(status: string) {
  if (status === 'above_limit') {
    return 'danger' as const;
  }

  if (status === 'near_limit') {
    return 'warning' as const;
  }

  return 'success' as const;
}

export function getProgressPercentage(currentAmount: string | number, targetAmount: string | number) {
  const current = Number(currentAmount);
  const target = Number(targetAmount);

  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Number(((current / target) * 100).toFixed(2));
}

export const planningService = {
  async getMonthlyPlanOverview(
    referenceMonth: string
  ): Promise<PlanningMutationResult<MonthlyPlanOverview | null>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('get_monthly_plan_overview', {
        p_reference_month: normalizeReferenceMonthInput(referenceMonth)
      });

      if (error) {
        return createPlanningErrorResult(error);
      }

      return {
        data: data?.[0] ?? null,
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  },

  async listCategoryBudgetProgress(
    referenceMonth: string
  ): Promise<PlanningMutationResult<CategoryBudgetProgress[]>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('get_category_budget_progress', {
        p_reference_month: normalizeReferenceMonthInput(referenceMonth)
      });

      if (error) {
        return createPlanningErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  },

  async getFinancialProjection(
    horizonMonths: number
  ): Promise<PlanningMutationResult<FinancialProjectionRow[]>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('get_financial_projection', {
        p_horizon_months: horizonMonths
      });

      if (error) {
        return createPlanningErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  },

  async listUpcomingCommitments(
    horizonDays = 45
  ): Promise<PlanningMutationResult<UpcomingCommitment[]>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('get_upcoming_commitments', {
        p_horizon_days: horizonDays
      });

      if (error) {
        return createPlanningErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  },

  async getDashboardSnapshot(
    referenceMonth: string,
    horizonMonths = 3
  ): Promise<PlanningMutationResult<PlanningDashboardSnapshot>> {
    try {
      const [monthlyPlanResult, budgetResult, projectionResult, commitmentsResult] =
        await Promise.all([
          this.getMonthlyPlanOverview(referenceMonth),
          this.listCategoryBudgetProgress(referenceMonth),
          this.getFinancialProjection(horizonMonths),
          this.listUpcomingCommitments(45)
        ]);

      if (monthlyPlanResult.error) {
        return createPlanningErrorResult(monthlyPlanResult.error);
      }

      if (budgetResult.error) {
        return createPlanningErrorResult(budgetResult.error);
      }

      if (projectionResult.error) {
        return createPlanningErrorResult(projectionResult.error);
      }

      if (commitmentsResult.error) {
        return createPlanningErrorResult(commitmentsResult.error);
      }

      return {
        data: {
          monthlyPlan: monthlyPlanResult.data,
          categoryBudgets: budgetResult.data ?? [],
          projection: projectionResult.data ?? [],
          upcomingCommitments: commitmentsResult.data ?? []
        },
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  },

  async upsertMonthlyPlan(
    referenceMonth: string,
    values: PlanningFormValues
  ): Promise<PlanningMutationResult<MonthlyPlanOverview>> {
    const parsedValues = planningFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultPlanningErrorMessage
      };
    }

    try {
      const { data: plan, error: planError } = await requireSupabaseClient().rpc(
        'upsert_monthly_plan',
        {
          p_reference_month: normalizeReferenceMonthInput(referenceMonth),
          p_expected_income: parsedValues.data.expectedIncome || null,
          p_notes: parsedValues.data.notes || null,
          p_savings_target: parsedValues.data.savingsTarget,
          p_spending_limit: parsedValues.data.spendingLimit || null
        }
      );

      if (planError) {
        return createPlanningErrorResult(planError);
      }

      await Promise.all(
        parsedValues.data.categoryBudgets.map((budget) =>
          requireSupabaseClient().rpc('upsert_category_budget', {
            p_monthly_plan_id: plan.id,
            p_category_id: budget.categoryId,
            p_budget_amount: budget.budgetAmount || '0.00'
          })
        )
      );

      const overviewResult = await this.getMonthlyPlanOverview(referenceMonth);

      if (overviewResult.error || !overviewResult.data) {
        return createPlanningErrorResult(overviewResult.error ?? defaultPlanningErrorMessage);
      }

      return {
        data: overviewResult.data,
        error: null
      };
    } catch (error) {
      return createPlanningErrorResult(error);
    }
  }
};
