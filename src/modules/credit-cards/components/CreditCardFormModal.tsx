import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { creditCardFormSchema } from '@/modules/credit-cards/schemas/creditCardSchema';
import {
  creditCardBrandOptions,
  creditCardColorOptions,
  type CreditCardFormValues,
  type CreditCardRow
} from '@/modules/credit-cards/types/creditCards';
import {
  Button,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select,
  Switch
} from '@/shared/components/ui';

type CreditCardFormModalProps = {
  card?: CreditCardRow | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreditCardFormValues) => void;
};

function mapCardToFormValues(card?: CreditCardRow | null): CreditCardFormValues {
  return {
    name: card?.name ?? '',
    bank: card?.bank ?? '',
    brand: card?.brand ?? '',
    lastFour: card?.last_four ?? '',
    limitAmount: card?.limit_amount ?? '0.00',
    closingDay: String(card?.closing_day ?? 10),
    dueDay: String(card?.due_day ?? 15),
    color: card?.color ?? creditCardColorOptions[0],
    isActive: card?.is_active ?? true
  };
}

export function CreditCardFormModal({
  card,
  isSubmitting,
  onClose,
  onSubmit
}: CreditCardFormModalProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardFormSchema),
    defaultValues: mapCardToFormValues(card)
  });

  useEffect(() => {
    reset(mapCardToFormValues(card));
  }, [card, reset]);

  const selectedColor = watch('color');

  return (
    <Modal
      title={card ? 'Editar cartao de credito' : 'Novo cartao de credito'}
      description="Cadastre limite, fechamento e vencimento sem armazenar dados sensiveis."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2">
            <span>Nome</span>
            <Input {...register('name')} placeholder="Cartao principal" />
            <FieldError>{errors.name?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Banco</span>
            <Input {...register('bank')} placeholder="Nubank" />
            <FieldError>{errors.bank?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Bandeira</span>
            <Select {...register('brand')}>
              {creditCardBrandOptions.map((option) => (
                <option key={option.value || 'none'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <FieldError>{errors.brand?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Ultimos 4 digitos</span>
            <Input {...register('lastFour')} inputMode="numeric" maxLength={4} placeholder="1234" />
            <FieldError>{errors.lastFour?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Limite total</span>
            <Input {...register('limitAmount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.limitAmount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Fechamento</span>
            <Input {...register('closingDay')} inputMode="numeric" placeholder="10" />
            <FieldError>{errors.closingDay?.message as string | undefined}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Vencimento</span>
            <Input {...register('dueDay')} inputMode="numeric" placeholder="15" />
            <FieldError>{errors.dueDay?.message as string | undefined}</FieldError>
          </FieldLabel>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-text-secondary">Cor</span>
          <div className="flex flex-wrap gap-3">
            {creditCardColorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-10 w-10 rounded-full border-2 transition-all duration-normal ${
                  selectedColor === color
                    ? 'scale-105 border-text-primary shadow-glow'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setValue('color', color, { shouldValidate: true })}
                aria-label={`Selecionar cor ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-control border border-border bg-background/70 px-4 py-3">
          <Switch {...register('isActive')} label="Cartao ativo para novas compras" />
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : card ? 'Salvar alteracoes' : 'Criar cartao'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
