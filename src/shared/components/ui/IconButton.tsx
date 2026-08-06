import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Button } from '@/shared/components/ui/Button';
import { Tooltip } from '@/shared/components/ui/Tooltip';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
};

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <Tooltip label={label}>
      <Button
        aria-label={label}
        className={className}
        icon={icon}
        size="icon"
        variant="ghost"
        {...props}
      />
    </Tooltip>
  );
}
