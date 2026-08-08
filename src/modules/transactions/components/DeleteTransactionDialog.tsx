import { Button, Modal } from '@/shared/components/ui';

type DeleteTransactionDialogProps = {
  description: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteTransactionDialog({
  description,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteTransactionDialogProps) {
  return (
    <Modal
      title="Excluir lancamento"
      description="A exclusao e logica e reverte o efeito financeiro no saldo da conta."
      onClose={onCancel}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" disabled={isDeleting} onClick={onConfirm}>
            {isDeleting ? 'Excluindo...' : 'Excluir lancamento'}
          </Button>
        </div>
      }
    >
      <p className="text-sm text-text-secondary">
        Confirme a exclusao de <span className="font-medium text-text-primary">{description}</span>.
      </p>
    </Modal>
  );
}
