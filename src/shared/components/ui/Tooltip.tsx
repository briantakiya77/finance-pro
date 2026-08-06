import type { PropsWithChildren } from 'react';

export function Tooltip({ children, label }: PropsWithChildren<{ label: string }>) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-control border border-border bg-surface-secondary px-2.5 py-1.5 text-caption text-text-primary shadow-elevated group-hover:block group-focus-within:block"
      >
        {label}
      </span>
    </span>
  );
}
