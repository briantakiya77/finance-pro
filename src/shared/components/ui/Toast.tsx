import { CheckCircle2, Info, TriangleAlert, XCircle } from 'lucide-react';
import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

type ToastVariant = 'info' | 'success' | 'warning' | 'danger';

type ToastProps = HTMLAttributes<HTMLDivElement> & {
  title?: string;
  variant?: ToastVariant;
};

const toastIcons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  danger: XCircle
};

export function Toast({ children, className, title, variant = 'info', ...props }: ToastProps) {
  const Icon = toastIcons[variant];

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-panel border bg-surface-secondary px-4 py-3 shadow-elevated',
        variant === 'info' && 'border-accent/25',
        variant === 'success' && 'border-success/25',
        variant === 'warning' && 'border-warning/25',
        variant === 'danger' && 'border-danger/25',
        className
      )}
      {...props}
    >
      <Icon
        size={18}
        className={cn(
          'mt-0.5 shrink-0',
          variant === 'info' && 'text-accent',
          variant === 'success' && 'text-success',
          variant === 'warning' && 'text-warning',
          variant === 'danger' && 'text-danger'
        )}
      />
      <div className="min-w-0 text-sm text-text-secondary">
        {title && <p className="font-semibold text-text-primary">{title}</p>}
        <div className={cn(title && 'mt-1')}>{children}</div>
      </div>
    </div>
  );
}
