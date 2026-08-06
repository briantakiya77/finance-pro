import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountsService } from '@/modules/accounts/services/accountsService';
import type { AccountFormValues } from '@/modules/accounts/types/accounts';

export const accountsQueryKey = ['accounts'] as const;

export function useAccountsQuery() {
  return useQuery({
    queryKey: accountsQueryKey,
    queryFn: async () => {
      const result = await accountsService.listAccounts();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useCreateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: AccountFormValues) => {
      const result = await accountsService.createAccount(values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    }
  });
}

export function useUpdateAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, values }: { accountId: string; values: AccountFormValues }) => {
      const result = await accountsService.updateAccount(accountId, values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    }
  });
}

export function useDeleteAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const result = await accountsService.softDeleteAccount(accountId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    }
  });
}

export function useSetPrimaryAccountMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const result = await accountsService.setPrimaryAccount(accountId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: accountsQueryKey });
    }
  });
}
