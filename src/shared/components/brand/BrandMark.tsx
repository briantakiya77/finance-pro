import logoUrl from '@/assets/logo.svg';
import { cn } from '@/shared/utils/cn';

type BrandMarkProps = {
  collapsed?: boolean;
  compact?: boolean;
  className?: string;
};

export function BrandMark({ collapsed = false, compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <img src={logoUrl} alt="Finance Pro" className="h-9 w-9 shrink-0" />
      {!collapsed && !compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">Finance Pro</p>
          <p className="truncate text-caption text-text-secondary">Controle inteligente</p>
        </div>
      )}
    </div>
  );
}
