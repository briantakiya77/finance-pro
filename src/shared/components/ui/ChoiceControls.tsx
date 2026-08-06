import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';

import { cn } from '@/shared/utils/cn';

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
};

export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(
  ({ className, label, ...props }, ref) => (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 text-sm text-text-secondary',
        className
      )}
    >
      <input ref={ref} type="checkbox" className="peer sr-only" {...props} />
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-control border border-border bg-background transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background after:h-2 after:w-1 after:rotate-45 after:border-b-2 after:border-r-2 after:border-text-primary after:opacity-0 after:content-[''] peer-checked:after:opacity-100" />
      <span>{label}</span>
    </label>
  )
);
Checkbox.displayName = 'Checkbox';

export const Switch = forwardRef<HTMLInputElement, ChoiceProps>(
  ({ className, label, ...props }, ref) => (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-4 text-sm text-text-secondary',
        className
      )}
    >
      <span>{label}</span>
      <input ref={ref} type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span className="relative h-6 w-11 shrink-0 rounded-full border border-border bg-surface-hover transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:left-0.5 after:top-0.5 after:h-4.5 after:w-4.5 after:rounded-full after:bg-text-secondary after:transition after:content-[''] peer-checked:after:translate-x-5 peer-checked:after:bg-text-primary" />
    </label>
  )
);
Switch.displayName = 'Switch';

export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(
  ({ className, label, ...props }, ref) => (
    <label
      className={cn(
        'flex cursor-pointer items-center gap-3 text-sm text-text-secondary',
        className
      )}
    >
      <input ref={ref} type="radio" className="peer sr-only" {...props} />
      <span className="h-5 w-5 shrink-0 rounded-full border border-border bg-background shadow-[inset_0_0_0_4px_rgb(var(--background))] transition peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50" />
      <span>{label}</span>
    </label>
  )
);
Radio.displayName = 'Radio';
