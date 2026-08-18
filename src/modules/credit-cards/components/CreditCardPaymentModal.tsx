import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useAccountsQuery } from '@/modules/accounts/queries/accountsQueries';
import { creditCardPaymentSchema } from '@/modules/credit-cards/schemas/creditCardSchema';
import { getInvoiceOutstandingAmount } from '@/modules/credit-cards/services/creditCardBilling';
import type {
  CreditCardInvoiceDetail,
  CreditCardPaymentFormValues
} from '@/modules/credit-cards/types/creditCards';
import { Button, FieldError, FieldLabel, Input, Modal, Select, Toast } from '@/shared/components/ui';
import { formatCurrency, formatCurrencyInput } from '@/shared/utils/money';

type CreditCardPaymentModalProps = {
  invoice: CreditCardInvoiceDetail;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreditCardPaymentFormValues) => void;
};

function mapPaymentDefaults(invoice: CreditCardInvoiceDetail): CreditCardPaymentFormValues {
  return {
    accountId: '',
    amount: formatCurrencyInput(getInvoiceOutstandingAmount(invoice)),
    paymentDate: new Date().toISOString().slice(0, 10)
  };
}

export function CreditCardPaymentModal({
  invoice,
  isSubmitting,
  onClose,
  onSubmit
}: CreditCardPaymentModalProps) {
  const [hasValidationFeedback, setHasValidationFeedback] = useState(false);
  const accountsQuery = useAccountsQuery();
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<CreditCardPaymentFormValues>({
    resolver: zodResolver(creditCardPaymentSchema),
    defaultValues: mapPaymentDefaults(invoice)
  });

  useEffect(() => {
    reset(mapPaymentDefaults(invoice));
  }, [invoice, reset]);

  const accounts = (accountsQuery.data ?? []).filter((account) => account.is_active);
  const hasNoAccounts = accounts.length === 0;
  const submitValidValues = (values: CreditCardPaymentFormValues) => {
    setHasValidationFeedback(false);
    onSubmit(values);
  };

  return (
    <Modal
      title="Pagar fatura"
      description={`Saldo restante da fatura: ${formatCurrency(getInvoiceOutstandingAmount(invoice))}`}
      onClose={onClose}
    >
      <form
        className="space-y-6"
        onSubmit={handleSubmit(submitValidValues, () => setHasValidationFeedback(true))}
      >
        {hasValidationFeedback && (
          <Toast variant="danger" title="Revise os campos">
            Revise os dados do pagamento antes de continuar.
          </Toast>
        )}

        {hasNoAccounts && !accountsQuery.isLoading && (
          <Toast variant="danger" title="Nenhuma conta disponivel">
            Cadastre ou reative uma conta antes de pagar a fatura.
          </Toast>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Conta de pagamento</span>
            <Select {...register('accountId')} disabled={accountsQuery.isLoading || hasNoAccounts}>
              <option value="">Selecione</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.bank}
                </option>
              ))}
            </Select>
            <FieldError>{errors.accountId?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Valor</span>
            <Input
              {...register('amount')}
              inputMode="decimal"
              placeholder="R$ 0,00"
              onBlur={(event) => {
                event.target.value = formatCurrencyInput(event.target.value);
              }}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Data do pagamento</span>
            <Input {...register('paymentDate')} type="date" />
            <FieldError>{errors.paymentDate?.message}</FieldError>
          </FieldLabel>
        </div>

        <div className="rounded-control border border-border bg-background/70 px-4 py-3 text-sm text-text-secondary">
          Este pagamento reduz o saldo da conta escolhida e aumenta o valor pago da fatura, sem
          registrar nova despesa.
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || accountsQuery.isLoading || hasNoAccounts}
          >
            {isSubmitting ? 'Processando...' : 'Confirmar pagamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
