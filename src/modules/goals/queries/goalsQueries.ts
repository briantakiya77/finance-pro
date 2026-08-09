import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardSummaryQueryKey } from '@/modules/dashboard/queries/dashboardQueries';
import { goalsService } from '@/modules/goals/services/goalsService';
import type { FinancialGoalFormValues, GoalProgressFormValues } from '@/modules/goals/types/goals';
import { financialProjectionQueryKey, upcomingCommitmentsQueryKey } from '@/modules/planning/queries/planningQueries';

export const financialGoalsQueryKey = ['financial-goals'] as const;

export function useFinancialGoalsQuery() {
  return useQuery({
    queryKey: financialGoalsQueryKey,
    queryFn: async () => {
      const result = await goalsService.listGoals();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

function useInvalidateGoalData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: financialGoalsQueryKey }),
      queryClient.invalidateQueries({ queryKey: upcomingCommitmentsQueryKey }),
      queryClient.invalidateQueries({ queryKey: financialProjectionQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey })
    ]);
  };
}

export function useCreateFinancialGoalMutation() {
  const invalidate = useInvalidateGoalData();

  return useMutation({
    mutationFn: async (values: FinancialGoalFormValues) => {
      const result = await goalsService.createGoal(values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useUpdateFinancialGoalMutation() {
  const invalidate = useInvalidateGoalData();

  return useMutation({
    mutationFn: async (payload: { goalId: string; values: FinancialGoalFormValues }) => {
      const result = await goalsService.updateGoal(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useUpdateGoalProgressMutation() {
  const invalidate = useInvalidateGoalData();

  return useMutation({
    mutationFn: async (payload: { goalId: string; values: GoalProgressFormValues }) => {
      const result = await goalsService.updateGoalProgress(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useCancelFinancialGoalMutation() {
  const invalidate = useInvalidateGoalData();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const result = await goalsService.cancelGoal(goalId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}
