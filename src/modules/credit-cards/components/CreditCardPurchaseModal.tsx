import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useCategoriesQuery } from '@/modules/categories/queries/categoriesQueries';
import { creditCardPurchaseSchema } from '@/modules/credit-cards/schemas/creditCardSchema';
import type {
  CreditCardListItem,
  CreditCardPurchaseFormValues,
  CreditCardPurchaseWithRelations
} from '@/modules/credit-cards/types/creditCards';
import { Button, FieldError, FieldLabel, Input, Modal, Select } from '@/shared/components/ui';

type CreditCardPurchaseModalProps = {
  cards: CreditCardListItem[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: CreditCardPurchaseFormValues) => void;
  purchase?: CreditCardPurchaseWithRelations | null;
  selectedCardId?: string | null;
};

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function mapPurchaseToFormValues(
  purchase?: CreditCardPurchaseWithRelations | null,
  selectedCardId?: string | null
): CreditCardPurchaseFormValues {
  return {
    creditCardId: purchase?.credit_card_id ?? selectedCardId ?? '',
    categoryId: purchase?.category_id ?? '',
    description: purchase?.description ?? '',
    amount: purchase?.amount ?? '',
    purchaseDate: purchase?.purchase_date ?? getTodayDate(),
    notes: purchase?.notes ?? ''
  };
}

export function CreditCardPurchaseModal({
  cards,
  isSubmitting,
  onClose,
  onSubmit,
  purchase,
  selectedCardId
}: CreditCardPurchaseModalProps) {
  const categoriesQuery = useCategoriesQuery('expense');
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<CreditCardPurchaseFormValues>({
    resolver: zodResolver(creditCardPurchaseSchema),
    defaultValues: mapPurchaseToFormValues(purchase, selectedCardId)
  });

  useEffect(() => {
    reset(mapPurchaseToFormValues(purchase, selectedCardId));
  }, [purchase, reset, selectedCardId]);

  const categories = categoriesQuery.data ?? [];

  return (
    <Modal
      title={purchase ? 'Editar compra no cartao' : 'Nova compra no cartao'}
      description="A compra entra como despesa na data da compra e atualiza a fatura de forma atomica."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Descricao</span>
            <Input {...register('description')} placeholder="Ex.: Mercado, assinatura, viagem" />
            <FieldError>{errors.description?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor</span>
            <Input {...register('amount')} inputMode="decimal" placeholder="0,00" />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Data da compra</span>
            <Input {...register('purchaseDate')} type="date" />
            <FieldError>{errors.purchaseDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Cartao</span>
            <Select {...register('creditCardId')}>
              <option value="">Selecione</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} - {card.bank}
                </option>
              ))}
            </Select>
            <FieldError>{errors.creditCardId?.message}</FieldError>
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
            {isSubmitting ? 'Salvando...' : purchase ? 'Salvar alteracoes' : 'Registrar compra'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
