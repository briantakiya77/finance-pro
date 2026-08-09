import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useAccountsQuery } from '@/modules/accounts/queries/accountsQueries';
import { useCategoriesQuery } from '@/modules/categories/queries/categoriesQueries';
import { financialEntryTypeOptions } from '@/modules/categories/types/categories';
import { recurringTransactionSchema } from '@/modules/recurring/schemas/recurringSchema';
import type {
  RecurringTransactionFormValues,
  RecurringTransactionWithRelations
} from '@/modules/recurring/types/recurring';
import { Button, FieldError, FieldLabel, Input, Modal, Select } from '@/shared/components/ui';

type RecurringTransactionFormModalProps = {
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: RecurringTransactionFormValues) => void;
  recurringTransaction?: RecurringTransactionWithRelations | null;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapRecurringTransactionToFormValues(
  recurringTransaction?: RecurringTransactionWithRelations | null
): RecurringTransactionFormValues {
  return {
    accountId: recurringTransaction?.account_id ?? '',
    categoryId: recurringTransaction?.category_id ?? '',
    type: recurringTransaction?.type ?? 'expense',
    description: recurringTransaction?.description ?? '',
    amount: recurringTransaction?.amount ?? '',
    dayOfMonth: recurringTransaction?.day_of_month?.toString() ?? '',
    startDate: recurringTransaction?.start_date ?? getTodayDate(),
    endDate: recurringTransaction?.end_date ?? '',
    notes: recurringTransaction?.notes ?? ''
  };
}

export function RecurringTransactionFormModal({
  isSubmitting,
  onClose,
  onSubmit,
  recurringTransaction
}: RecurringTransactionFormModalProps) {
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: mapRecurringTransactionToFormValues(recurringTransaction)
  });

  const selectedType = useWatch({
    control,
    name: 'type'
  });
  const accountsQuery = useAccountsQuery();
  const categoriesQuery = useCategoriesQuery(selectedType);

  useEffect(() => {
    reset(mapRecurringTransactionToFormValues(recurringTransaction));
  }, [recurringTransaction, reset]);

  const accounts = accountsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];

  return (
    <Modal
      title={recurringTransaction ? 'Editar recorrencia' : 'Nova recorrencia'}
      description="Crie uma regra mensal que gera lancamentos reais somente quando a competencia vence."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
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
            <span>Dia do mes</span>
            <Input {...register('dayOfMonth')} inputMode="numeric" placeholder="10" />
            <FieldError>{errors.dayOfMonth?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Descricao</span>
            <Input {...register('description')} placeholder="Ex.: Internet, salario, academia" />
            <FieldError>{errors.description?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor</span>
            <Input {...register('amount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Conta</span>
            <Select {...register('accountId')} disabled={accountsQuery.isLoading}>
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
            <Select {...register('categoryId')} disabled={categoriesQuery.isLoading}>
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
            <span>Data inicial</span>
            <Input {...register('startDate')} type="date" />
            <FieldError>{errors.startDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Data final</span>
            <Input {...register('endDate')} type="date" />
            <FieldError>{errors.endDate?.message}</FieldError>
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Salvando...'
              : recurringTransaction
                ? 'Salvar alteracoes'
                : 'Criar recorrencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
