import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement> & {
  interactive?: boolean;
  tone?: 'primary' | 'secondary';
};

export function Card({ className, interactive = false, tone = 'primary', ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-panel border border-border shadow-panel',
        tone === 'primary' ? 'bg-surface' : 'bg-surface-secondary',
        interactive &&
          'transition-all duration-normal ease-[var(--ease-premium)] hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-elevated',
        className
      )}
      {...props}
    />
  );
}
