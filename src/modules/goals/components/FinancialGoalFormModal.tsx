import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { financialGoalFormSchema } from '@/modules/goals/schemas/goalsSchema';
import type {
  FinancialGoalFormValues,
  FinancialGoalRow
} from '@/modules/goals/types/goals';
import { emergencyTargetMonthOptions, financialGoalTypeOptions } from '@/modules/goals/types/goals';
import { Button, FieldError, FieldLabel, Input, Modal, Select } from '@/shared/components/ui';

type FinancialGoalFormModalProps = {
  goal?: FinancialGoalRow | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: FinancialGoalFormValues) => void;
};

function mapGoalToFormValues(goal?: FinancialGoalRow | null): FinancialGoalFormValues {
  const normalizedType =
    goal?.type === 'emergency_fund' ||
    goal?.type === 'purchase' ||
    goal?.type === 'investment' ||
    goal?.type === 'general'
      ? goal.type
      : 'general';

  return {
    currentAmount: goal?.current_amount ?? '0.00',
    name: goal?.name ?? '',
    notes: goal?.notes ?? '',
    targetAmount: goal?.target_amount ?? '',
    targetDate: goal?.target_date ?? '',
    targetMonths: goal?.target_months ? String(goal.target_months) : '',
    type: normalizedType
  };
}

export function FinancialGoalFormModal({
  goal,
  isSubmitting,
  onClose,
  onSubmit
}: FinancialGoalFormModalProps) {
  const {
    formState: { errors },
    handleSubmit,
    watch,
    register,
    reset
  } = useForm<FinancialGoalFormValues>({
    resolver: zodResolver(financialGoalFormSchema),
    defaultValues: mapGoalToFormValues(goal)
  });

  useEffect(() => {
    reset(mapGoalToFormValues(goal));
  }, [goal, reset]);

  const goalType = watch('type');

  return (
    <Modal
      title={goal ? 'Editar meta financeira' : 'Nova meta financeira'}
      description="A meta e de acompanhamento: atualizar progresso nao move saldo bancario automaticamente."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Nome</span>
            <Input {...register('name')} placeholder="Reserva de emergencia" />
            <FieldError>{errors.name?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor da meta</span>
            <Input {...register('targetAmount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.targetAmount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor ja separado</span>
            <Input {...register('currentAmount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.currentAmount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Tipo</span>
            <Select {...register('type')}>
              {financialGoalTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError>{errors.type?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Horizonte recomendado</span>
            <Select {...register('targetMonths')} disabled={goalType !== 'emergency_fund'}>
              {emergencyTargetMonthOptions.map((option) => (
                <option key={option.value || 'manual'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError>{errors.targetMonths?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Prazo</span>
            <Input {...register('targetDate')} type="date" />
            <FieldError>{errors.targetDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Observacoes</span>
            <Input {...register('notes')} placeholder="Opcional" />
            <FieldError>{errors.notes?.message}</FieldError>
          </FieldLabel>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : goal ? 'Salvar alteracoes' : 'Criar meta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
