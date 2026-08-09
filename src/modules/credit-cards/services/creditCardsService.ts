import { requireSupabaseClient } from '@/integrations/supabase';
import {
  creditCardFormSchema,
  creditCardPaymentSchema,
  creditCardPurchaseSchema
} from '@/modules/credit-cards/schemas/creditCardSchema';
import {
  getAvailableLimit,
  getInvoiceStatus,
  sumInvoicesUtilizedAmount
} from '@/modules/credit-cards/services/creditCardBilling';
import type {
  CreditCardFormValues,
  CreditCardInvoiceDetail,
  CreditCardInvoiceRow,
  CreditCardInstallmentPlanRow,
  CreditCardListItem,
  CreditCardMutationResult,
  CreditCardPaymentFormValues,
  CreditCardPaymentWithAccount,
  CreditCardPurchaseFormValues,
  CreditCardPurchaseWithRelations,
  CreditCardRow,
  CreditCardTransactionRow,
  CreditCardUpdate
} from '@/modules/credit-cards/types/creditCards';

const defaultCreditCardsErrorMessage =
  'Nao foi possivel concluir a operacao com cartoes de credito. Tente novamente.';

const creditCardsErrorMessages: Record<string, string> = {
  'credit card not found for current user':
    'O cartao selecionado nao esta disponivel para sua sessao.',
  'category not found for current user and transaction type':
    'Selecione uma categoria de despesa valida.',
  'invoice not found for current user': 'A fatura selecionada nao esta disponivel para sua sessao.',
  'account not found for current user': 'A conta selecionada nao esta disponivel para sua sessao.',
  'credit card limit exceeded': 'A compra ultrapassa o limite disponivel do cartao.',
  'invoice payment exceeds outstanding amount': 'O pagamento informado supera o saldo da fatura.',
  'credit card purchase not found for current user':
    'A compra selecionada nao esta disponivel para sua sessao.',
  'new row violates row-level security policy for table "credit_cards"':
    'Sua sessao nao tem permissao para alterar este cartao.',
  'installment count must be between 2 and 60': 'As parcelas devem ficar entre 2 e 60.',
  'installment purchases must be edited through installment plan metadata':
    'Edite parcelamentos apenas pela descricao, categoria e observacoes do plano.',
  'installment purchases must be cancelled through installment plan':
    'Parcelas devem ser canceladas pelo plano parcelado.',
  'installment plan not found for current user':
    'O parcelamento selecionado nao esta disponivel para sua sessao.',
  'installment plan with paid invoices cannot be cancelled safely':
    'Este parcelamento ja possui faturas com pagamento e nao pode ser cancelado com seguranca.',
  'cancelled installment plan cannot be updated':
    'Parcelamentos cancelados nao podem ser alterados.',
  'recurring transaction not found for current user':
    'A recorrencia selecionada nao esta disponivel para sua sessao.',
  'cancelled recurring transaction cannot be updated':
    'Recorrencias canceladas nao podem ser alteradas.',
  'cancelled recurring transaction cannot be resumed':
    'Recorrencias canceladas nao podem ser retomadas.',
  'day of month must be between 1 and 31': 'Informe um dia do mes entre 1 e 31.',
  'end date must be equal or after start date':
    'A data final precisa ser igual ou posterior a inicial.'
};

function mapCreditCardsError(error: unknown) {
  if (error instanceof Error && error.message in creditCardsErrorMessages) {
    return creditCardsErrorMessages[error.message];
  }

  if (error instanceof Error) {
    return error.message || defaultCreditCardsErrorMessage;
  }

  return defaultCreditCardsErrorMessage;
}

function createCreditCardsErrorResult<T>(error: unknown): CreditCardMutationResult<T> {
  return {
    data: null,
    error: mapCreditCardsError(error)
  };
}

function mapCardFormValuesToInsert(
  values:
    | CreditCardFormValues
    | {
        name: string;
        bank: string;
        brand: string;
        lastFour: string;
        limitAmount: string;
        closingDay: number;
        dueDay: number;
        color: string;
        isActive: boolean;
      }
) {
  return {
    name: values.name.trim(),
    bank: values.bank.trim(),
    brand: values.brand || null,
    last_four: values.lastFour || null,
    limit_amount: values.limitAmount,
    closing_day: Number(values.closingDay),
    due_day: Number(values.dueDay),
    color: values.color,
    is_active: values.isActive
  };
}

function mapCardFormValuesToUpdate(
  values:
    | CreditCardFormValues
    | {
        name: string;
        bank: string;
        brand: string;
        lastFour: string;
        limitAmount: string;
        closingDay: number;
        dueDay: number;
        color: string;
        isActive: boolean;
      }
): CreditCardUpdate {
  return mapCardFormValuesToInsert(values);
}

async function fetchInvoicesByCardIds(cardIds: string[]) {
  if (cardIds.length === 0) {
    return { data: [], error: null };
  }

  return requireSupabaseClient()
    .from('credit_card_invoices')
    .select(
      'id,user_id,credit_card_id,reference_month,closing_date,due_date,status,total_amount,paid_amount,paid_at,created_at,updated_at'
    )
    .in('credit_card_id', cardIds)
    .order('reference_month', { ascending: false });
}

function buildCardListItem(
  card: CreditCardRow,
  invoices: CreditCardInvoiceRow[]
): CreditCardListItem {
  const resolvedInvoices: CreditCardInvoiceRow[] = invoices.map((invoice) => ({
    ...invoice,
    status: getInvoiceStatus(invoice)
  }));
  const currentInvoice =
    resolvedInvoices.find((invoice) => invoice.status !== 'paid') ?? resolvedInvoices[0] ?? null;
  const utilizedAmount = sumInvoicesUtilizedAmount(resolvedInvoices);

  return {
    ...card,
    currentInvoice,
    utilizedAmount,
    availableLimit: getAvailableLimit(card.limit_amount, utilizedAmount)
  };
}

function mapPurchasePayload(values: CreditCardPurchaseFormValues) {
  return {
    p_credit_card_id: values.creditCardId,
    p_category_id: values.categoryId,
    p_description: values.description,
    p_amount: values.amount,
    p_total_amount: values.amount,
    p_purchase_date: values.purchaseDate,
    p_notes: values.notes || null,
    p_installment_count: Number(values.installmentCount)
  };
}

export const creditCardsService = {
  async listCreditCards(): Promise<CreditCardMutationResult<CreditCardListItem[]>> {
    try {
      const { data: cards, error: cardsError } = await requireSupabaseClient()
        .from('credit_cards')
        .select(
          'id,user_id,name,bank,brand,last_four,limit_amount,closing_day,due_day,color,is_active,deleted_at,created_at,updated_at'
        )
        .is('deleted_at', null)
        .order('is_active', { ascending: false })
        .order('updated_at', { ascending: false });

      if (cardsError) {
        return createCreditCardsErrorResult<CreditCardListItem[]>(cardsError);
      }

      const cardRows = cards ?? [];
      const invoicesResponse = await fetchInvoicesByCardIds(cardRows.map((card) => card.id));

      if (invoicesResponse.error) {
        return createCreditCardsErrorResult<CreditCardListItem[]>(invoicesResponse.error);
      }

      const invoices = invoicesResponse.data ?? [];

      return {
        data: cardRows.map((card) =>
          buildCardListItem(
            card,
            invoices.filter((invoice) => invoice.credit_card_id === card.id)
          )
        ),
        error: null
      };
    } catch (error) {
      return createCreditCardsErrorResult<CreditCardListItem[]>(error);
    }
  },

  async getCardDetails(cardId: string): Promise<
    CreditCardMutationResult<{
      card: CreditCardListItem;
      invoices: CreditCardInvoiceDetail[];
    }>
  > {
    try {
      const { data: card, error: cardError } = await requireSupabaseClient()
        .from('credit_cards')
        .select(
          'id,user_id,name,bank,brand,last_four,limit_amount,closing_day,due_day,color,is_active,deleted_at,created_at,updated_at'
        )
        .eq('id', cardId)
        .is('deleted_at', null)
        .single();

      if (cardError) {
        return createCreditCardsErrorResult(cardError);
      }

      const { data: invoices, error: invoicesError } = await requireSupabaseClient()
        .from('credit_card_invoices')
        .select(
          'id,user_id,credit_card_id,reference_month,closing_date,due_date,status,total_amount,paid_amount,paid_at,created_at,updated_at'
        )
        .eq('credit_card_id', cardId)
        .order('reference_month', { ascending: false })
        .limit(12);

      if (invoicesError) {
        return createCreditCardsErrorResult(invoicesError);
      }

      const invoiceRows: CreditCardInvoiceRow[] = (invoices ?? []).map((invoice) => ({
        ...invoice,
        status: getInvoiceStatus(invoice)
      }));
      const invoiceIds = invoiceRows.map((invoice) => invoice.id);

      const [purchasesResponse, paymentsResponse] = await Promise.all([
        invoiceIds.length === 0
          ? Promise.resolve({ data: [] as CreditCardPurchaseWithRelations[], error: null })
          : requireSupabaseClient()
              .from('credit_card_transactions')
              .select(
                'id,user_id,credit_card_id,invoice_id,category_id,description,amount,purchase_date,notes,client_mutation_id,installment_plan_id,installment_number,installment_count,deleted_at,created_at,updated_at,categories(id,name,color,icon,type)'
              )
              .in('invoice_id', invoiceIds)
              .is('deleted_at', null)
              .order('purchase_date', { ascending: false })
              .order('created_at', { ascending: false }),
        invoiceIds.length === 0
          ? Promise.resolve({ data: [] as CreditCardPaymentWithAccount[], error: null })
          : requireSupabaseClient()
              .from('credit_card_invoice_payments')
              .select(
                'id,user_id,invoice_id,account_id,amount,paid_at,client_mutation_id,created_at,accounts(id,name,bank)'
              )
              .in('invoice_id', invoiceIds)
              .order('paid_at', { ascending: false })
      ]);

      if (purchasesResponse.error) {
        return createCreditCardsErrorResult(purchasesResponse.error);
      }

      if (paymentsResponse.error) {
        return createCreditCardsErrorResult(paymentsResponse.error);
      }

      const purchases = (purchasesResponse.data ?? []) as CreditCardPurchaseWithRelations[];
      const payments = (paymentsResponse.data ?? []) as CreditCardPaymentWithAccount[];

      return {
        data: {
          card: buildCardListItem(card, invoiceRows),
          invoices: invoiceRows.map((invoice) => ({
            ...invoice,
            purchases: purchases.filter((purchase) => purchase.invoice_id === invoice.id),
            payments: payments.filter((payment) => payment.invoice_id === invoice.id)
          }))
        },
        error: null
      };
    } catch (error) {
      return createCreditCardsErrorResult(error);
    }
  },

  async createCreditCard(
    values: CreditCardFormValues
  ): Promise<CreditCardMutationResult<CreditCardRow>> {
    const parsedValues = creditCardFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultCreditCardsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient()
        .from('credit_cards')
        .insert(mapCardFormValuesToInsert(parsedValues.data))
        .select(
          'id,user_id,name,bank,brand,last_four,limit_amount,closing_day,due_day,color,is_active,deleted_at,created_at,updated_at'
        )
        .single();

      if (error) {
        return createCreditCardsErrorResult<CreditCardRow>(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult<CreditCardRow>(error);
    }
  },

  async updateCreditCard(
    cardId: string,
    values: CreditCardFormValues
  ): Promise<CreditCardMutationResult<CreditCardRow>> {
    const parsedValues = creditCardFormSchema.safeParse(values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultCreditCardsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient()
        .from('credit_cards')
        .update(mapCardFormValuesToUpdate(parsedValues.data))
        .eq('id', cardId)
        .select(
          'id,user_id,name,bank,brand,last_four,limit_amount,closing_day,due_day,color,is_active,deleted_at,created_at,updated_at'
        )
        .single();

      if (error) {
        return createCreditCardsErrorResult<CreditCardRow>(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult<CreditCardRow>(error);
    }
  },

  async softDeleteCreditCard(cardId: string): Promise<CreditCardMutationResult<null>> {
    try {
      const { error } = await requireSupabaseClient()
        .from('credit_cards')
        .update({
          deleted_at: new Date().toISOString(),
          is_active: false
        })
        .eq('id', cardId);

      if (error) {
        return createCreditCardsErrorResult<null>(error);
      }

      return { data: null, error: null };
    } catch (error) {
      return createCreditCardsErrorResult<null>(error);
    }
  },

  async createPurchase(payload: {
    clientMutationId: string;
    values: CreditCardPurchaseFormValues;
  }): Promise<CreditCardMutationResult<CreditCardTransactionRow | CreditCardInstallmentPlanRow>> {
    const parsedValues = creditCardPurchaseSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultCreditCardsErrorMessage
      };
    }

    try {
      if (parsedValues.data.purchaseMode === 'installment') {
        const { data, error } = await requireSupabaseClient().rpc(
          'create_credit_card_installment_purchase',
          {
            ...mapPurchasePayload(parsedValues.data),
            p_client_mutation_id: payload.clientMutationId
          }
        );

        if (error) {
          return createCreditCardsErrorResult(error);
        }

        return { data, error: null };
      }

      const { data, error } = await requireSupabaseClient().rpc('create_credit_card_purchase', {
        p_credit_card_id: parsedValues.data.creditCardId,
        p_category_id: parsedValues.data.categoryId,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_purchase_date: parsedValues.data.purchaseDate,
        p_notes: parsedValues.data.notes || null,
        p_client_mutation_id: payload.clientMutationId
      });

      if (error) {
        return createCreditCardsErrorResult<CreditCardTransactionRow>(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult(error);
    }
  },

  async updatePurchase(payload: {
    purchaseId: string;
    installmentPlanId?: string | null;
    values: CreditCardPurchaseFormValues;
  }): Promise<CreditCardMutationResult<CreditCardTransactionRow | CreditCardInstallmentPlanRow>> {
    const parsedValues = creditCardPurchaseSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultCreditCardsErrorMessage
      };
    }

    try {
      if (payload.installmentPlanId) {
        const { data, error } = await requireSupabaseClient().rpc(
          'update_credit_card_installment_plan',
          {
            p_installment_plan_id: payload.installmentPlanId,
            p_category_id: parsedValues.data.categoryId,
            p_description: parsedValues.data.description,
            p_notes: parsedValues.data.notes || null
          }
        );

        if (error) {
          return createCreditCardsErrorResult(error);
        }

        return { data, error: null };
      }

      const { data, error } = await requireSupabaseClient().rpc('update_credit_card_purchase', {
        p_credit_card_transaction_id: payload.purchaseId,
        p_credit_card_id: parsedValues.data.creditCardId,
        p_category_id: parsedValues.data.categoryId,
        p_description: parsedValues.data.description,
        p_amount: parsedValues.data.amount,
        p_purchase_date: parsedValues.data.purchaseDate,
        p_notes: parsedValues.data.notes || null
      });

      if (error) {
        return createCreditCardsErrorResult<CreditCardTransactionRow>(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult(error);
    }
  },

  async softDeletePurchase(
    purchaseId: string
  ): Promise<CreditCardMutationResult<CreditCardTransactionRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc(
        'soft_delete_credit_card_purchase',
        {
          p_credit_card_transaction_id: purchaseId
        }
      );

      if (error) {
        return createCreditCardsErrorResult<CreditCardTransactionRow>(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult<CreditCardTransactionRow>(error);
    }
  },

  async cancelInstallmentPlan(
    installmentPlanId: string
  ): Promise<CreditCardMutationResult<CreditCardInstallmentPlanRow>> {
    try {
      const { data, error } = await requireSupabaseClient().rpc(
        'cancel_credit_card_installment_plan',
        {
          p_installment_plan_id: installmentPlanId
        }
      );

      if (error) {
        return createCreditCardsErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult(error);
    }
  },

  async payInvoice(payload: {
    clientMutationId: string;
    invoiceId: string;
    values: CreditCardPaymentFormValues;
  }): Promise<CreditCardMutationResult<unknown>> {
    const parsedValues = creditCardPaymentSchema.safeParse(payload.values);

    if (!parsedValues.success) {
      return {
        data: null,
        error: parsedValues.error.issues[0]?.message ?? defaultCreditCardsErrorMessage
      };
    }

    try {
      const { data, error } = await requireSupabaseClient().rpc('pay_credit_card_invoice', {
        p_invoice_id: payload.invoiceId,
        p_account_id: parsedValues.data.accountId,
        p_amount: parsedValues.data.amount,
        p_client_mutation_id: payload.clientMutationId
      });

      if (error) {
        return createCreditCardsErrorResult(error);
      }

      return { data, error: null };
    } catch (error) {
      return createCreditCardsErrorResult(error);
    }
  }
};
