import type { Database } from '@/integrations/supabase';

export type TransferRow = Database['public']['Tables']['transfers']['Row'];

export type TransferFormValues = {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description: string;
  transferDate: string;
};

export type TransferMutationResult<T = TransferRow> = {
  data: T | null;
  error: string | null;
};

export type TransferCreatePayload = {
  clientMutationId: string;
  values: TransferFormValues;
};

export type TransferUpdatePayload = {
  transferId: string;
  values: TransferFormValues;
};

export type TransferListOptions = {
  limit?: number;
  page?: number;
};
