import { MoreHorizontal, Pencil, Trash2, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/shared/components/ui/IconButton';
import { MenuItem, MenuSurface } from '@/shared/components/ui/Menu';

type CreditCardActionMenuProps = {
  onDelete: () => void;
  onEdit: () => void;
  onNewPurchase: () => void;
};

export function CreditCardActionMenu({
  onDelete,
  onEdit,
  onNewPurchase
}: CreditCardActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        label="Acoes do cartao"
        icon={<MoreHorizontal size={18} />}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <MenuSurface className="absolute right-0 top-12 z-20">
          <MenuItem
            type="button"
            onClick={() => {
              setIsOpen(false);
              onNewPurchase();
            }}
          >
            <Wallet size={16} />
            Nova compra
          </MenuItem>

          <MenuItem
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
          >
            <Pencil size={16} />
            Editar cartao
          </MenuItem>

          <MenuItem
            type="button"
            danger
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={16} />
            Excluir cartao
          </MenuItem>
        </MenuSurface>
      )}
    </div>
  );
}

type CreditCardPurchaseActionMenuProps = {
  onDelete: () => void;
  onEdit: () => void;
  deleteLabel?: string;
  editLabel?: string;
};

export function CreditCardPurchaseActionMenu({
  onDelete,
  onEdit,
  deleteLabel = 'Excluir compra',
  editLabel = 'Editar compra'
}: CreditCardPurchaseActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        label="Acoes da compra"
        icon={<MoreHorizontal size={18} />}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen && (
        <MenuSurface className="absolute right-0 top-12 z-20">
          <MenuItem
            type="button"
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
          >
            <Pencil size={16} />
            {editLabel}
          </MenuItem>

          <MenuItem
            type="button"
            danger
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={16} />
            {deleteLabel}
          </MenuItem>
        </MenuSurface>
      )}
    </div>
  );
}
