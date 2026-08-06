import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

export function MenuSurface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="menu"
      className={cn(
        'min-w-48 rounded-panel border border-border bg-surface-secondary p-1.5 shadow-elevated',
        className
      )}
      {...props}
    />
  );
}

type MenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  danger?: boolean;
};

export function MenuItem({ className, danger = false, ...props }: MenuItemProps) {
  return (
    <button
      role="menuitem"
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-control px-3 text-left text-sm transition-colors duration-fast',
        danger
          ? 'text-danger hover:bg-danger/10'
          : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        className
      )}
      {...props}
    />
  );
}
