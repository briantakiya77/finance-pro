import { requireSupabaseClient } from '@/integrations/supabase';
import {
  financialGoalFormSchema,
  goalProgressSchema
} from '@/modules/goals/schemas/goalsSchema';
import type {
  FinancialGoalFormValues,
  FinancialGoalRow,
  GoalProgressFormValues,
  GoalsMutationResult
} from '@/modules/goals/types/goals';

const defaultGoalsErrorMessage =
  'Nao foi possivel concluir a operacao com metas financeiras. Tente novamente.';

const goalsErrorMessages: Record<string, string> = {
  'authenticated user required': 'Sua sessao expirou. Entre novamente para continuar.',
  'financial goal not found for current user': 'A meta selecionada nao pertence a sua sessao.',
  'target amount must be positive numeric(14,2)':
    'O valor alvo da meta deve ser positivo com duas casas decimais.',
  'current amount must be positive numeric(14,2)':
    'O valor atual da meta deve ser positivo com duas casas decimais.',
  'goal progress delta must be positive numeric(14,2)':
    'O progresso informado deve ser positivo com duas casas decimais.'
};

function mapGoalsError(error: unknown) {
  if (error instanceof Error && error.message in goalsErrorMessages) {
    return goalsErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultGoalsErrorMessage;
  }

  return defaultGoalsErrorMessage;
}

function createGoalsErrorResult<T>(error: unknown): GoalsMutationResult<T> {
  return {
    data: null,
    error: mapGoalsError(error)
  };
}

export const goalsService = {
  async listGoals(): Promise<GoalsMutationResult<FinancialGoalRow[]>> {
    try {
      const { data, error } = await requireSupabaseClient()
        .from('financial_goals')
        .select('*')
        .is('deleted_at', null)
        .order('status', { ascending: true })
        .order('target_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        return createGoalsErrorResult(error);
      }

      return {
        data: data ?? [],
        error: null
      };
    } catch (error) {
      return createGoalsErrorResult(error);
    }
  },

  async createGoal(values: FinancialGoalFormValues): Promise<GoalsMutationResult<FinancialGoalRow>> {
    const parsedValues = financialGoalFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultGoalsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('create_financial_goal', {
        p_current_amount: parsedValues.data.currentAmount,
        p_name: parsedValues.data.name,
        p_notes: parsedValues.data.notes || null,
        p_target_amount: parsedValues.data.targetAmount,
        p_target_date: parsedValues.data.targetDate || null,
        p_type: parsedValues.data.type
      });

      if (error) {
        return createGoalsErrorResult(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createGoalsErrorResult(error);
    }
  },

  async updateGoal(payload: {
    goalId: string;
    values: FinancialGoalFormValues;
  }): Promise<GoalsMutationResult<FinancialGoalRow>> {
    const parsedValues = financialGoalFormSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultGoalsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('update_financial_goal', {
        p_current_amount: parsedValues.data.currentAmount,
        p_goal_id: payload.goalId,
        p_name: parsedValues.data.name,
        p_notes: parsedValues.data.notes || null,
        p_target_amount: parsedValues.data.targetAmount,
        p_target_date: parsedValues.data.targetDate || null,
        p_type: parsedValues.data.type
      });

      if (error) {
        return createGoalsErrorResult(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createGoalsErrorResult(error);
    }
  },

  async updateGoalProgress(payload: {
    goalId: string;
    values: GoalProgressFormValues;
  }): Promise<GoalsMutationResult<FinancialGoalRow>> {
    const parsedValues = goalProgressSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultGoalsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('update_goal_progress', {
        p_amount_delta: parsedValues.data.amount,
        p_goal_id: payload.goalId
      });

      if (error) {
        return createGoalsErrorResult(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createGoalsErrorResult(error);
    }
  },

  async cancelGoal(goalId: string): Promise<GoalsMutationResult<FinancialGoalRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc('cancel_financial_goal', {
        p_goal_id: goalId
      });

      if (error) {
        return createGoalsErrorResult(error);
      }

      return {
        data,
        error: null
      };
    } catch (error) {
      return createGoalsErrorResult(error);
    }
  }
};
