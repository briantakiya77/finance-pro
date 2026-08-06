import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect } from 'react';

import { IconButton } from '@/shared/components/ui/IconButton';
import { cn } from '@/shared/utils/cn';

type ModalProps = PropsWithChildren<{
  description?: ReactNode;
  footer?: ReactNode;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
  className?: string;
}>;

export function Modal({
  children,
  className,
  description,
  footer,
  isOpen = true,
  onClose,
  title
}: ModalProps) {
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => event.target === event.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="design-system-modal-title"
            className={cn(
              'max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-panel border border-border bg-surface shadow-elevated',
              className
            )}
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2
                  id="design-system-modal-title"
                  className="text-heading font-semibold text-text-primary"
                >
                  {title}
                </h2>
                {description && (
                  <div className="mt-1.5 text-sm text-text-secondary">{description}</div>
                )}
              </div>
              <IconButton label="Fechar" icon={<X size={18} />} onClick={onClose} />
            </div>
            <div className="px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="border-t border-border px-5 py-4 sm:px-6">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
