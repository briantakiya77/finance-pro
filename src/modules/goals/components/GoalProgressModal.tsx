import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { goalProgressSchema } from '@/modules/goals/schemas/goalsSchema';
import type { GoalProgressFormValues } from '@/modules/goals/types/goals';
import { Button, FieldError, FieldLabel, Input, Modal } from '@/shared/components/ui';

type GoalProgressModalProps = {
  goalName: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: GoalProgressFormValues) => void;
};

export function GoalProgressModal({
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
      amount: ''
    }
  });

  return (
    <Modal
      title="Adicionar progresso"
      description={`Registre quanto ja foi separado para a meta ${goalName}.`}
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <FieldLabel className="space-y-2">
          <span>Valor adicional</span>
          <Input {...register('amount')} inputMode="decimal" placeholder="0,00" />
          <FieldError>{errors.amount?.message}</FieldError>
        </FieldLabel>

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
