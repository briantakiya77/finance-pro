import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from 'react';
import { forwardRef } from 'react';

import { cn } from '@/shared/utils/cn';

export const FieldLabel = ({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn('block text-sm text-text-secondary', className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-control border border-border bg-background/70 px-3.5 text-sm text-text-primary outline-none transition-all duration-normal placeholder:text-text-secondary/55 hover:border-border/90 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full rounded-control border border-border bg-background/70 px-3.5 text-sm text-text-primary outline-none transition-all duration-normal hover:border-border/90 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Select.displayName = 'Select';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[96px] w-full resize-none rounded-control border border-border bg-background/70 px-3.5 py-3 text-sm text-text-primary outline-none transition-all duration-normal placeholder:text-text-secondary/55 hover:border-border/90 focus:border-accent focus:ring-2 focus:ring-accent/15 disabled:opacity-50',
      className
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function FieldError({ children }: { children?: string }) {
  return children ? <p className="mt-1.5 text-caption text-danger">{children}</p> : null;
}
