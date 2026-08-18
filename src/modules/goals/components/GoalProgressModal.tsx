import type { AccountRow } from '@/modules/accounts/types/accounts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { goalProgressSchema } from '@/modules/goals/schemas/goalsSchema';
import type { GoalProgressFormValues } from '@/modules/goals/types/goals';
import { Button, FieldError, FieldLabel, Input, Modal, Select } from '@/shared/components/ui';

type GoalProgressModalProps = {
  accounts: AccountRow[];
  goalName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: GoalProgressFormValues) => void;
};

export function GoalProgressModal({
  accounts,
  goalName,
  isSubmitting,
  onClose,
  onSubmit
}: GoalProgressModalProps) {
  const {
    formState: { errors },
    handleSubmit,
    register
  } = useForm<GoalProgressFormValues>({
    resolver: zodResolver(goalProgressSchema),
    defaultValues: {
      accountId: '',
      amount: '',
      contributionDate: new Date().toISOString().slice(0, 10),
      description: ''
    }
  });

  return (
    <Modal
      title="Adicionar progresso"
      description={`Registre quanto ja foi separado para a meta ${goalName}.`}
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2">
            <span>Valor do aporte</span>
            <Input {...register('amount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Data</span>
            <Input {...register('contributionDate')} type="date" />
            <FieldError>{errors.contributionDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Conta de origem</span>
            <Select {...register('accountId')}>
              <option value="">Nao vincular conta</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <FieldError>{errors.accountId?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Descricao</span>
            <Input {...register('description')} placeholder="Opcional" />
            <FieldError>{errors.description?.message}</FieldError>
          </FieldLabel>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Adicionar progresso'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
