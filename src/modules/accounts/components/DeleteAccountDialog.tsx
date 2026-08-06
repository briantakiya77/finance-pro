type DeleteAccountDialogProps = {
  accountName: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteAccountDialog({
  accountName,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteAccountDialogProps) {
  return (
    <Modal title="Confirmar exclusao" onClose={onCancel} className="max-w-md">
      <p className="text-sm leading-6 text-text-secondary">
        A conta <span className="font-semibold text-text-primary">{accountName}</span> sera removida
        da listagem por exclusao logica. Os dados continuam preservados para auditoria.
      </p>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={isDeleting}>
          {isDeleting ? 'Excluindo...' : 'Confirmar exclusao'}
        </Button>
      </div>
    </Modal>
  );
}
import { Button, Modal } from '@/shared/components/ui';
