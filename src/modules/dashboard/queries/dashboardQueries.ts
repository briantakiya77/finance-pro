import { useQuery } from '@tanstack/react-query';

import { dashboardService } from '@/modules/dashboard/services/dashboardService';

export const dashboardQueryKey = ['dashboard'] as const;
export const dashboardSummaryQueryKey = [...dashboardQueryKey, 'summary'] as const;
export const dashboardRecentTransactionsQueryKey = [
  ...dashboardQueryKey,
  'recent-transactions'
] as const;

export function useDashboardSummaryQuery() {
  return useQuery({
    queryKey: dashboardSummaryQueryKey,
    queryFn: async () => {
      const result = await dashboardService.getSummary();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    }
  });
}

export function useDashboardRecentTransactionsQuery() {
  return useQuery({
    queryKey: dashboardRecentTransactionsQueryKey,
    queryFn: async () => {
      const result = await dashboardService.getRecentTransactions();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}
