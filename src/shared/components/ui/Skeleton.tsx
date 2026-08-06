import type { HTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-control bg-gradient-to-r from-surface-secondary via-surface-hover to-surface-secondary bg-[length:200%_100%]',
        className
      )}
      {...props}
    />
  );
}
