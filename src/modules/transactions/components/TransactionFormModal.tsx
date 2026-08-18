import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { useAccountsQuery } from '@/modules/accounts/queries/accountsQueries';
import { useCategoriesQuery } from '@/modules/categories/queries/categoriesQueries';
import { financialEntryTypeOptions } from '@/modules/categories/types/categories';
import { transactionFormSchema } from '@/modules/transactions/schemas/transactionSchema';
import type {
  TransactionFormValues,
  TransactionWithRelations
} from '@/modules/transactions/types/transactions';
import {
  Button,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
  Toast
} from '@/shared/components/ui';
import { formatCurrencyInput } from '@/shared/utils/money';

type TransactionFormModalProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: TransactionFormValues) => void;
  transaction?: TransactionWithRelations | null;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapTransactionToFormValues(
  transaction?: TransactionWithRelations | null
): TransactionFormValues {
  return {
    accountId: transaction?.account_id ?? '',
    amount: transaction ? formatCurrencyInput(transaction.amount) : '',
    categoryId: transaction?.category_id ?? '',
    description: transaction?.description ?? '',
    notes: transaction?.notes ?? '',
    transactionDate: transaction?.transaction_date ?? getTodayDate(),
    type: transaction?.type ?? 'expense'
  };
}

export function TransactionFormModal({
  isSubmitting,
  onClose,
  onSubmit,
  transaction
}: TransactionFormModalProps) {
  const [hasValidationFeedback, setHasValidationFeedback] = useState(false);
  const accountsQuery = useAccountsQuery();
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: mapTransactionToFormValues(transaction)
  });

  const selectedType = watch('type');
  const categoriesQuery = useCategoriesQuery(selectedType);
  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const hasNoAccounts = !accountsQuery.isLoading && accounts.length === 0;
  const hasNoCategories = !categoriesQuery.isLoading && categories.length === 0;

  useEffect(() => {
    reset(mapTransactionToFormValues(transaction));
    setHasValidationFeedback(false);
  }, [reset, transaction]);

  useEffect(() => {
    if (!transaction || transaction.type !== selectedType) {
      setValue('categoryId', '', { shouldValidate: true });
    }
  }, [selectedType, setValue, transaction]);

  function submitValidValues(values: TransactionFormValues) {
    setHasValidationFeedback(false);
    onSubmit(values);
  }

  return (
    <Modal
      title={transaction ? 'Editar lancamento' : 'Novo lancamento'}
      description="Registre uma receita ou despesa real vinculada a uma conta."
      onClose={onClose}
    >
      <form
        className="space-y-6"
        onSubmit={handleSubmit(submitValidValues, () => setHasValidationFeedback(true))}
      >
        {hasValidationFeedback && (
          <Toast variant="danger" title="Revise os campos">
            Corrija os dados destacados antes de salvar a movimentacao.
          </Toast>
        )}

        {hasNoAccounts && (
          <Toast variant="warning" title="Nenhuma conta ativa encontrada">
            Cadastre uma conta ativa antes de registrar receitas ou despesas.
          </Toast>
        )}

        {!hasNoAccounts && hasNoCategories && (
          <Toast variant="warning" title="Nenhuma categoria compativel encontrada">
            Crie ou reative uma categoria do tipo selecionado para continuar.
          </Toast>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2">
            <span>Tipo</span>
            <Select {...register('type')}>
              {financialEntryTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError>{errors.type?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor</span>
            <Controller
              control={control}
              name="amount"
              render={({ field }) => (
                <Input
                  ref={field.ref}
                  name={field.name}
                  value={field.value}
                  inputMode="decimal"
                  placeholder="R$ 0,00"
                  onBlur={(event) => {
                    field.onBlur();
                    const formattedValue = formatCurrencyInput(event.target.value);
                    setValue('amount', formattedValue, { shouldValidate: true });
                  }}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              )}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Descricao</span>
            <Input {...register('description')} placeholder="Ex.: Mercado, salario, freela" />
            <FieldError>{errors.description?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Conta</span>
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

          <FieldLabel className="space-y-2">
            <span>Categoria</span>
            <Select
              {...register('categoryId')}
              disabled={categoriesQuery.isLoading || hasNoAccounts || hasNoCategories}
            >
              <option value="">Selecione</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.categoryId?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Data</span>
            <Input {...register('transactionDate')} type="date" />
            <FieldError>{errors.transactionDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Observacao</span>
            <Input {...register('notes')} placeholder="Opcional" />
            <FieldError>{errors.notes?.message}</FieldError>
          </FieldLabel>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={
              isSubmitting ||
              accountsQuery.isLoading ||
              categoriesQuery.isLoading ||
              hasNoAccounts ||
              hasNoCategories
            }
          >
            {isSubmitting ? 'Salvando...' : transaction ? 'Salvar alteracoes' : 'Criar lancamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
