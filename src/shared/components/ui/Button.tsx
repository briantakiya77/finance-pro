import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/shared/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  children,
  className,
  icon,
  size = 'md',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center gap-2 rounded-control border text-sm transition-all duration-normal ease-[var(--ease-premium)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
        variant === 'primary' &&
          'border-transparent bg-accent-gradient font-medium text-text-primary shadow-glow hover:brightness-110',
        variant === 'secondary' &&
          'border-border bg-surface-secondary text-text-primary hover:border-accent/45 hover:bg-surface-hover',
        variant === 'ghost' &&
          'border-transparent bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
        variant === 'danger' &&
          'border-danger/25 bg-danger/10 text-danger hover:border-danger/45 hover:bg-danger/20',
        size === 'sm' && 'h-9 px-3',
        size === 'md' && 'h-11 px-4',
        size === 'icon' && 'h-10 w-10 p-0',
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
