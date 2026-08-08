import type { ReactNode } from 'react';

import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

type AuthStatusMessageProps = {
  children: ReactNode;
  tone?: 'error' | 'success' | 'info';
};

export function AuthStatusMessage({ children, tone = 'info' }: AuthStatusMessageProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-control border px-4 py-3 text-sm',
        tone === 'error' && 'border-danger/25 bg-danger/10 text-danger',
        tone === 'success' && 'border-success/25 bg-success/10 text-success',
        tone === 'info' && 'border-accent/25 bg-accent/10 text-text-primary'
      )}
      role="status"
    >
      {tone === 'error' && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
      {tone === 'success' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
      {tone === 'info' && <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />}
      <div>{children}</div>
    </div>
  );
}
