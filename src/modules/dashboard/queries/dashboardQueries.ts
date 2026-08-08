import { useQuery } from '@tanstack/react-query';

import { dashboardService } from '@/modules/dashboard/services/dashboardService';

export const dashboardSummaryQueryKey = ['dashboard', 'summary'] as const;

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
