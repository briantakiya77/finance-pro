import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-caption font-medium',
        variant === 'default' && 'border-border bg-surface-secondary text-text-secondary',
        variant === 'accent' && 'border-accent/25 bg-accent/10 text-accent',
        variant === 'success' && 'border-success/25 bg-success/10 text-success',
        variant === 'warning' && 'border-warning/25 bg-warning/10 text-warning',
        variant === 'danger' && 'border-danger/25 bg-danger/10 text-danger',
        className
      )}
      {...props}
    />
  );
}
