import { BrandLogo } from '@/shared/components/brand/BrandLogo';
import { cn } from '@/shared/utils/cn';

type BrandMarkProps = {
  collapsed?: boolean;
  compact?: boolean;
  className?: string;
};

export function BrandMark({ collapsed = false, compact = false, className }: BrandMarkProps) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <BrandLogo
        variant="mark"
        theme="dark"
        size={compact || collapsed ? 'sm' : 'md'}
        decorative={collapsed}
      />
      {!collapsed && !compact && (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">Finance Pro</p>
        </div>
      )}
    </div>
  );
}
