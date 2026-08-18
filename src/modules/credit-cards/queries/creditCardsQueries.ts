import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { accountsQueryKey } from '@/modules/accounts/queries/accountsQueries';
import { dashboardQueryKey } from '@/modules/dashboard/queries/dashboardQueries';
import { creditCardsService } from '@/modules/credit-cards/services/creditCardsService';
import type {
  CreditCardFormValues,
  CreditCardPaymentFormValues,
  CreditCardPurchaseFormValues
} from '@/modules/credit-cards/types/creditCards';

export const creditCardsQueryKey = ['credit-cards'] as const;
export const creditCardDetailsQueryKey = ['credit-card-details'] as const;

export function useCreditCardsQuery() {
  return useQuery({
    queryKey: creditCardsQueryKey,
    queryFn: async () => {
      const result = await creditCardsService.listCreditCards();

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data ?? [];
    }
  });
}

export function useCreditCardDetailsQuery(cardId: string | null) {
  return useQuery({
    queryKey: [...creditCardDetailsQueryKey, cardId],
    enabled: Boolean(cardId),
    queryFn: async () => {
      const result = await creditCardsService.getCardDetails(cardId as string);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    }
  });
}

function useInvalidateCreditCardData() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: creditCardsQueryKey }),
      queryClient.invalidateQueries({ queryKey: creditCardDetailsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey }),
      queryClient.invalidateQueries({ queryKey: accountsQueryKey })
    ]);
  };
}

export function useCreateCreditCardMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (values: CreditCardFormValues) => {
      const result = await creditCardsService.createCreditCard(values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useUpdateCreditCardMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async ({ cardId, values }: { cardId: string; values: CreditCardFormValues }) => {
      const result = await creditCardsService.updateCreditCard(cardId, values);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useDeleteCreditCardMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const result = await creditCardsService.softDeleteCreditCard(cardId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useCreateCreditCardPurchaseMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (payload: {
      clientMutationId: string;
      values: CreditCardPurchaseFormValues;
    }) => {
      const result = await creditCardsService.createPurchase(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useUpdateCreditCardPurchaseMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (payload: {
      purchaseId: string;
      installmentPlanId?: string | null;
      values: CreditCardPurchaseFormValues;
    }) => {
      const result = await creditCardsService.updatePurchase(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useDeleteCreditCardPurchaseMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (purchaseId: string) => {
      const result = await creditCardsService.softDeletePurchase(purchaseId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function useCancelCreditCardInstallmentPlanMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (installmentPlanId: string) => {
      const result = await creditCardsService.cancelInstallmentPlan(installmentPlanId);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}

export function usePayCreditCardInvoiceMutation() {
  const invalidate = useInvalidateCreditCardData();

  return useMutation({
    mutationFn: async (payload: {
      clientMutationId: string;
      invoiceId: string;
      values: CreditCardPaymentFormValues;
    }) => {
      const result = await creditCardsService.payInvoice(payload);

      if (result.error) {
        throw new Error(result.error);
      }

      return result.data;
    },
    onSuccess: invalidate
  });
}
