import type { Database } from '@/integrations/supabase';
import type { AccountRow } from '@/modules/accounts/types/accounts';
import type { CategoryRow } from '@/modules/categories/types/categories';

export const creditCardColorValues = [
  '#8B5CF6',
  '#3B82F6',
  '#2ECC71',
  '#F59E0B',
  '#FF5A5F',
  '#9AA4B2'
] as const;

export const creditCardBrandValues = ['visa', 'mastercard', 'elo', 'amex', 'hipercard'] as const;

export const creditCardBrandOptions = [
  { value: '', label: 'Sem bandeira' },
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
  { value: 'hipercard', label: 'Hipercard' }
] as const;

export const creditCardColorOptions = [...creditCardColorValues];

export type CreditCardInvoiceStatus = Database['public']['Enums']['credit_card_invoice_status'];
export type CreditCardInstallmentPlanStatus =
  Database['public']['Enums']['credit_card_installment_plan_status'];
export type CreditCardRow = Database['public']['Tables']['credit_cards']['Row'];
export type CreditCardInsert = Database['public']['Tables']['credit_cards']['Insert'];
export type CreditCardUpdate = Database['public']['Tables']['credit_cards']['Update'];
export type CreditCardInvoiceRow = Database['public']['Tables']['credit_card_invoices']['Row'];
export type CreditCardTransactionRow =
  Database['public']['Tables']['credit_card_transactions']['Row'];
export type CreditCardInvoicePaymentRow =
  Database['public']['Tables']['credit_card_invoice_payments']['Row'];
export type CreditCardInstallmentPlanRow =
  Database['public']['Tables']['credit_card_installment_plans']['Row'];

export const creditCardPurchaseModeOptions = [
  { value: 'single', label: 'Compra unica' },
  { value: 'installment', label: 'Parcelada' }
] as const;

export type CreditCardPurchaseMode = (typeof creditCardPurchaseModeOptions)[number]['value'];

export type CreditCardFormValues = {
  name: string;
  bank: string;
  brand: string;
  lastFour: string;
  limitAmount: string;
  closingDay: string;
  dueDay: string;
  color: string;
  isActive: boolean;
};

export type CreditCardPurchaseFormValues = {
  creditCardId: string;
  categoryId: string;
  description: string;
  amount: string;
  purchaseDate: string;
  notes: string;
  purchaseMode: CreditCardPurchaseMode;
  installmentCount: string;
};

export type CreditCardPaymentFormValues = {
  accountId: string;
  amount: string;
  paymentDate: string;
};

export type CreditCardMutationResult<T> = {
  data: T | null;
  error: string | null;
};

export type CreditCardListItem = CreditCardRow & {
  utilizedAmount: string;
  availableLimit: string;
  currentInvoice: CreditCardInvoiceRow | null;
};

export type CreditCardInvoiceWithPayments = CreditCardInvoiceRow & {
  payments: CreditCardInvoicePaymentRow[];
};

export type CreditCardPurchaseWithRelations = CreditCardTransactionRow & {
  categories: Pick<CategoryRow, 'id' | 'name' | 'color' | 'icon' | 'type'> | null;
};

export type CreditCardInstallmentPlanWithRelations = CreditCardInstallmentPlanRow & {
  categories: Pick<CategoryRow, 'id' | 'name' | 'color' | 'icon' | 'type'> | null;
  transactions: CreditCardPurchaseWithRelations[];
};

export type CreditCardPaymentWithAccount = CreditCardInvoicePaymentRow & {
  accounts: Pick<AccountRow, 'id' | 'name' | 'bank'> | null;
};

export type CreditCardInvoiceDetail = CreditCardInvoiceRow & {
  purchases: CreditCardPurchaseWithRelations[];
  payments: CreditCardPaymentWithAccount[];
};
