import { MoreHorizontal, Pencil, Star, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { IconButton } from '@/shared/components/ui/IconButton';
import { MenuItem, MenuSurface } from '@/shared/components/ui/Menu';

type AccountsActionMenuProps = {
  canMarkPrimary: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMarkPrimary: () => void;
};

export function AccountsActionMenu({
  canMarkPrimary,
  onEdit,
  onDelete,
  onMarkPrimary
}: AccountsActionMenuProps) {
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
        label="Acoes da conta"
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
            Editar conta
          </MenuItem>

          {canMarkPrimary && (
            <MenuItem
              type="button"
              onClick={() => {
                setIsOpen(false);
                onMarkPrimary();
              }}
            >
              <Star size={16} />
              Marcar principal
            </MenuItem>
          )}

          <MenuItem
            type="button"
            danger
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
          >
            <Trash2 size={16} />
            Excluir conta
          </MenuItem>
        </MenuSurface>
      )}
    </div>
  );
}
