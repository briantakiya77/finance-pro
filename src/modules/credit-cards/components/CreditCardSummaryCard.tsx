import { CalendarClock, CreditCard, Landmark } from 'lucide-react';

import { CreditCardActionMenu } from '@/modules/credit-cards/components/CreditCardActionMenu';
import { getInvoiceOutstandingAmount } from '@/modules/credit-cards/services/creditCardBilling';
import type { CreditCardListItem } from '@/modules/credit-cards/types/creditCards';
import { Badge, Card } from '@/shared/components/ui';
import { cn } from '@/shared/utils/cn';
import { formatCurrency } from '@/shared/utils/money';

type CreditCardSummaryCardProps = {
  card: CreditCardListItem;
  isSelected: boolean;
  onDelete: (card: CreditCardListItem) => void;
  onEdit: (card: CreditCardListItem) => void;
  onNewPurchase: (card: CreditCardListItem) => void;
  onSelect: (card: CreditCardListItem) => void;
};

function getStatusBadgeVariant(card: CreditCardListItem) {
  if (!card.is_active) {
    return 'warning' as const;
  }

  if ((card.currentInvoice?.status ?? 'open') === 'paid') {
    return 'success' as const;
  }

  return 'accent' as const;
}

export function CreditCardSummaryCard({
  card,
  isSelected,
  onDelete,
  onEdit,
  onNewPurchase,
  onSelect
}: CreditCardSummaryCardProps) {
  const outstanding = card.currentInvoice
    ? getInvoiceOutstandingAmount(card.currentInvoice)
    : '0.00';

  return (
    <Card
      interactive
      className={cn('cursor-pointer p-5 sm:p-6', isSelected && 'border-accent/50 shadow-glow')}
      onClick={() => onSelect(card)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-lg font-semibold text-text-primary">{card.name}</h2>
            <Badge variant={getStatusBadgeVariant(card)}>
              {!card.is_active
                ? 'Inativo'
                : card.currentInvoice?.status === 'paid'
                  ? 'Pago'
                  : 'Ativo'}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-2">
              <Landmark size={15} />
              {card.bank}
            </span>
            {card.brand && <span>{card.brand.toUpperCase()}</span>}
            {card.last_four && <span>Final {card.last_four}</span>}
          </div>
        </div>

        <CreditCardActionMenu
          onDelete={() => onDelete(card)}
          onEdit={() => onEdit(card)}
          onNewPurchase={() => onNewPurchase(card)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Limite total</p>
          <p className="mt-2 text-base font-semibold text-text-primary">
            {formatCurrency(card.limit_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Utilizado</p>
          <p className="mt-2 text-base font-semibold text-expense">
            {formatCurrency(card.utilizedAmount)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Disponivel</p>
          <p className="mt-2 text-base font-semibold text-income">
            {formatCurrency(card.availableLimit)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 border-t border-border pt-5 text-sm text-text-secondary sm:grid-cols-2">
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption uppercase tracking-wide text-text-secondary">Fechamento</p>
          <p className="mt-1 inline-flex items-center gap-2 text-text-primary">
            <CalendarClock size={15} />
            Dia {card.closing_day}
          </p>
        </div>
        <div className="rounded-control border border-border bg-background/60 px-3 py-3">
          <p className="text-caption uppercase tracking-wide text-text-secondary">Fatura atual</p>
          <p className="mt-1 inline-flex items-center gap-2 text-text-primary">
            <CreditCard size={15} />
            {formatCurrency(outstanding)} em aberto
          </p>
        </div>
      </div>
    </Card>
  );
}
