import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountsQueryKey } from '@/modules/accounts/queries/accountsQueries';
import { dashboardSummaryQueryKey } from '@/modules/dashboard/queries/dashboardQueries';
import { recurringService } from '@/modules/recurring/services/recurringService';
import type { RecurringTransactionFormValues } from '@/modules/recurring/types/recurring';
import { transactionsQueryKey } from '@/modules/transactions/queries/transactionsQueries';

export const recurringTransactionsQueryKey = ['recurring-transactions'] as const;
export const recurringProjectionQueryKey = ['recurring-projection'] as const;

function useInvalidateRecurringData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: recurringTransactionsQueryKey }),
      queryClient.invalidateQueries({ queryKey: recurringProjectionQueryKey }),
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardSummaryQueryKey })
    ]);
  };
}

export function useRecurringTransactionsQuery() {
  return useQuery({
    queryKey: recurringTransactionsQueryKey,
    queryFn: async () => {
      const result = await recurringService.listRecurringTransactions();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useRecurringProjectionQuery() {
  return useQuery({
    queryKey: recurringProjectionQueryKey,
    queryFn: async () => {
      const result = await recurringService.getProjection();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useCreateRecurringTransactionMutation() {
  const invalidate = useInvalidateRecurringData();

  return useMutation({
    mutationFn: async (values: RecurringTransactionFormValues) => {
      const result = await recurringService.createRecurringTransaction(values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useUpdateRecurringTransactionMutation() {
  const invalidate = useInvalidateRecurringData();

  return useMutation({
    mutationFn: async (payload: {
      recurringTransactionId: string;
      values: RecurringTransactionFormValues;
    }) => {
      const result = await recurringService.updateRecurringTransaction(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function usePauseRecurringTransactionMutation() {
  const invalidate = useInvalidateRecurringData();

  return useMutation({
    mutationFn: async (recurringTransactionId: string) => {
      const result = await recurringService.pauseRecurringTransaction(recurringTransactionId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useResumeRecurringTransactionMutation() {
  const invalidate = useInvalidateRecurringData();

  return useMutation({
    mutationFn: async (recurringTransactionId: string) => {
      const result = await recurringService.resumeRecurringTransaction(recurringTransactionId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useCancelRecurringTransactionMutation() {
  const invalidate = useInvalidateRecurringData();

  return useMutation({
    mutationFn: async (recurringTransactionId: string) => {
      const result = await recurringService.cancelRecurringTransaction(recurringTransactionId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}
