import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardSummaryQueryKey } from '@/modules/dashboard/queries/dashboardQueries';
import { planningService } from '@/modules/planning/services/planningService';
import type { PlanningFormValues } from '@/modules/planning/types/planning';

export const monthlyPlansQueryKey = ['monthly-plans'] as const;
export const categoryBudgetsQueryKey = ['category-budgets'] as const;
export const financialProjectionQueryKey = ['financial-projection'] as const;
export const upcomingCommitmentsQueryKey = ['upcoming-commitments'] as const;

export function useMonthlyPlanOverviewQuery(referenceMonth: string) {
  return useQuery({
    queryKey: [...monthlyPlansQueryKey, referenceMonth],
    queryFn: async () => {
      const result = await planningService.getMonthlyPlanOverview(referenceMonth);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    }
  });
}

export function useCategoryBudgetProgressQuery(referenceMonth: string) {
  return useQuery({
    queryKey: [...categoryBudgetsQueryKey, referenceMonth],
    queryFn: async () => {
      const result = await planningService.listCategoryBudgetProgress(referenceMonth);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useFinancialProjectionQuery(horizonMonths: number) {
  return useQuery({
    queryKey: [...financialProjectionQueryKey, horizonMonths],
    queryFn: async () => {
      const result = await planningService.getFinancialProjection(horizonMonths);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useUpcomingCommitmentsQuery(horizonDays = 45) {
  return useQuery({
    queryKey: [...upcomingCommitmentsQueryKey, horizonDays],
    queryFn: async () => {
      const result = await planningService.listUpcomingCommitments(horizonDays);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useDashboardPlanningSnapshotQuery(referenceMonth: string, horizonMonths = 3) {
  return useQuery({
    queryKey: [
      ...monthlyPlansQueryKey,
      'dashboard',
      referenceMonth,
      horizonMonths
    ] as const,
    queryFn: async () => {
      const result = await planningService.getDashboardSnapshot(referenceMonth, horizonMonths);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    }
  });
}

export function useUpsertMonthlyPlanMutation(referenceMonth: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: PlanningFormValues) => {
      const result = await planningService.upsertMonthlyPlan(referenceMonth, values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: monthlyPlansQueryKey }),
        queryClient.invalidateQueries({ queryKey: categoryBudgetsQueryKey }),
        queryClient.invalidateQueries({ queryKey: financialProjectionQueryKey }),
        queryClient.invalidateQueries({ queryKey: upcomingCommitmentsQueryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey })
      ]);
    }
  });
}
