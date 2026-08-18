import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountsQueryKey } from '@/modules/accounts/queries/accountsQueries';
import { dashboardQueryKey } from '@/modules/dashboard/queries/dashboardQueries';
import { transactionsService } from '@/modules/transactions/services/transactionsService';
import type {
  TransactionCreatePayload,
  TransactionListOptions,
  TransactionUpdatePayload
} from '@/modules/transactions/types/transactions';

export const transactionsQueryKey = ['transactions'] as const;

export function useTransactionsQuery(options: TransactionListOptions = {}) {
  return useQuery({
    queryKey: [...transactionsQueryKey, options],
    queryFn: async () => {
      const result = await transactionsService.listTransactions(options);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

function useInvalidateFinancialData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionsQueryKey }),
      queryClient.invalidateQueries({ queryKey: accountsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey })
    ]);
  };
}

export function useCreateTransactionMutation() {
  const invalidateFinancialData = useInvalidateFinancialData();

  return useMutation({
    mutationFn: async (payload: TransactionCreatePayload) => {
      const result = await transactionsService.createTransaction(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidateFinancialData
  });
}

export function useUpdateTransactionMutation() {
  const invalidateFinancialData = useInvalidateFinancialData();

  return useMutation({
    mutationFn: async (payload: TransactionUpdatePayload) => {
      const result = await transactionsService.updateTransaction(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidateFinancialData
  });
}

export function useDeleteTransactionMutation() {
  const invalidateFinancialData = useInvalidateFinancialData();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const result = await transactionsService.softDeleteTransaction(transactionId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidateFinancialData
  });
}
