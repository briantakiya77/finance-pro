import { Button, Modal } from '@/shared/components/ui';

type DeleteCreditCardDialogProps = {
  cardName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteCreditCardDialog({
  cardName,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteCreditCardDialogProps) {
  return (
    <Modal
      title="Excluir cartao"
      description={
        <>
          O cartao <strong>{cardName}</strong> sera desativado com exclusao logica.
        </>
      }
      onClose={onCancel}
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          O historico das compras e das faturas sera preservado. Novas compras ficarao bloqueadas
          apos a exclusao logica.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? 'Excluindo...' : 'Excluir cartao'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type DeleteCreditCardPurchaseDialogProps = {
  description: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteCreditCardPurchaseDialog({
  description,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteCreditCardPurchaseDialogProps) {
  return (
    <Modal
      title="Excluir compra"
      description={
        <>
          A compra <strong>{description}</strong> sera removida com exclusao logica.
        </>
      }
      onClose={onCancel}
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          O valor sera revertido da fatura de forma atomica e o historico permanecera auditavel.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? 'Excluindo...' : 'Excluir compra'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

type CancelInstallmentPlanDialogProps = {
  description: string;
  isCancelling: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CancelInstallmentPlanDialog({
  description,
  isCancelling,
  onCancel,
  onConfirm
}: CancelInstallmentPlanDialogProps) {
  return (
    <Modal
      title="Cancelar parcelamento"
      description={
        <>
          O parcelamento <strong>{description}</strong> sera interrompido se nenhuma fatura ligada
          a ele tiver pagamento registrado.
        </>
      }
      onClose={onCancel}
    >
      <div className="space-y-6">
        <p className="text-sm text-text-secondary">
          As parcelas ainda ativas serao revertidas das faturas correspondentes. Caso exista
          qualquer pagamento, o cancelamento sera bloqueado para preservar a integridade
          financeira.
        </p>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Fechar
          </Button>
          <Button type="button" variant="danger" disabled={isCancelling} onClick={onConfirm}>
            {isCancelling ? 'Cancelando...' : 'Cancelar parcelamento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
