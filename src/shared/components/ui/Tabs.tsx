import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

export function Tabs({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex rounded-control border border-border bg-background/70 p-1',
        className
      )}
      {...props}
    />
  );
}

type TabProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function Tab({ active = false, className, ...props }: TabProps) {
  return (
    <button
      role="tab"
      aria-selected={active}
      className={cn(
        'h-9 rounded-control px-3 text-sm text-text-secondary transition-all duration-normal',
        active ? 'bg-surface-secondary text-text-primary shadow-panel' : 'hover:text-text-primary',
        className
      )}
      {...props}
    />
  );
}
