import logoUrl from '@/assets/logo.svg';
import { cn } from '@/shared/utils/cn';

type BrandMarkProps = {
  collapsed?: boolean;
  className?: string;
};

export function BrandMark({ collapsed = false, className }: BrandMarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <img src={logoUrl} alt="Logo temporaria Finance Pro" className="h-10 w-10 shrink-0" />
      {!collapsed && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">Finance Pro</p>
          <p className="truncate text-xs text-text-secondary">Base operacional</p>
        </div>
      )}
    </div>
  );
}
