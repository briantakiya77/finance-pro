import { zodResolver } from '@hookform/resolvers/zod';
import { Info } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useCategoriesQuery } from '@/modules/categories/queries/categoriesQueries';
import { creditCardPurchaseSchema } from '@/modules/credit-cards/schemas/creditCardSchema';
import { buildInstallmentPreview } from '@/modules/credit-cards/services/installmentPreview';
import type {
  CreditCardListItem,
  CreditCardPurchaseFormValues,
  CreditCardPurchaseWithRelations
} from '@/modules/credit-cards/types/creditCards';
import {
  creditCardPurchaseModeOptions
} from '@/modules/credit-cards/types/creditCards';
import { Button, FieldError, FieldLabel, Input, Modal, Select } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/money';

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
    notes: purchase?.notes ?? '',
    purchaseMode: purchase?.installment_plan_id ? 'installment' : 'single',
    installmentCount: purchase?.installment_count?.toString() ?? '1'
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
  const isInstallmentEdit = Boolean(purchase?.installment_plan_id);
  const categoriesQuery = useCategoriesQuery('expense');
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset
  } = useForm<CreditCardPurchaseFormValues>({
    resolver: zodResolver(creditCardPurchaseSchema),
    defaultValues: mapPurchaseToFormValues(purchase, selectedCardId)
  });

  const purchaseMode = useWatch({
    control,
    name: 'purchaseMode'
  });
  const amount = useWatch({
    control,
    name: 'amount'
  });
  const installmentCount = useWatch({
    control,
    name: 'installmentCount'
  });

  useEffect(() => {
    reset(mapPurchaseToFormValues(purchase, selectedCardId));
  }, [purchase, reset, selectedCardId]);

  const categories = categoriesQuery.data ?? [];
  const installmentPreview = useMemo(
    () => buildInstallmentPreview(amount ?? '', Number(installmentCount ?? 0)),
    [amount, installmentCount]
  );

  const isInstallmentMode = purchaseMode === 'installment';

  return (
    <Modal
      title={
        purchase
          ? isInstallmentEdit
            ? 'Editar parcelamento'
            : 'Editar compra no cartao'
          : 'Nova compra no cartao'
      }
      description={
        isInstallmentEdit
          ? 'Parcelamentos permitem alterar apenas descricao, categoria e observacoes sem mexer na estrutura financeira.'
          : 'A compra entra como despesa na data correta e atualiza a fatura de forma atomica.'
      }
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Tipo de compra</span>
            <Select {...register('purchaseMode')} disabled={Boolean(purchase)}>
              {creditCardPurchaseModeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FieldLabel>

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Descricao</span>
            <Input {...register('description')} placeholder="Ex.: Mercado, assinatura, viagem" />
            <FieldError>{errors.description?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Valor total</span>
            <Input
              {...register('amount')}
              inputMode="decimal"
              placeholder="0,00"
              disabled={isInstallmentEdit}
            />
            <FieldError>{errors.amount?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Data da compra</span>
            <Input {...register('purchaseDate')} type="date" disabled={isInstallmentEdit} />
            <FieldError>{errors.purchaseDate?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Cartao</span>
            <Select {...register('creditCardId')} disabled={isInstallmentEdit}>
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

          {isInstallmentMode && (
            <FieldLabel className="space-y-2">
              <span>Quantidade de parcelas</span>
              <Input
                {...register('installmentCount')}
                inputMode="numeric"
                placeholder="10"
                disabled={Boolean(purchase)}
              />
              <FieldError>{errors.installmentCount?.message}</FieldError>
            </FieldLabel>
          )}

          <FieldLabel className="space-y-2 md:col-span-2">
            <span>Observacao</span>
            <Input {...register('notes')} placeholder="Opcional" />
            <FieldError>{errors.notes?.message}</FieldError>
          </FieldLabel>
        </div>

        {isInstallmentMode && installmentPreview.installments.length > 0 && (
          <div className="rounded-panel border border-border bg-surface-secondary/70 p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-accent">
                <Info size={16} />
              </span>
              <div className="space-y-2">
                <p className="text-sm font-medium text-text-primary">
                  Preview do parcelamento
                </p>
                <p className="text-caption text-text-secondary">
                  Total {formatCurrency(installmentPreview.totalAmount)} em{' '}
                  {installmentPreview.installmentCount}x com rateio exato server-side.
                </p>
                <p className="text-caption text-text-secondary">
                  1a parcela {formatCurrency(installmentPreview.installments[0] ?? '0.00')}
                  {installmentPreview.installments.length > 1
                    ? ` • demais a partir de ${formatCurrency(installmentPreview.installments[1] ?? '0.00')}`
                    : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Salvando...'
              : purchase
                ? isInstallmentEdit
                  ? 'Salvar plano'
                  : 'Salvar alteracoes'
                : isInstallmentMode
                  ? 'Criar parcelamento'
                  : 'Registrar compra'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
