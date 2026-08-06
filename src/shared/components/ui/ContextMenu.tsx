import type { PropsWithChildren, ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { MenuSurface } from '@/shared/components/ui/Menu';

type ContextMenuProps = PropsWithChildren<{
  trigger: ReactNode;
}>;

export function ContextMenu({ children, trigger }: ContextMenuProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!position) return;

    const close = () => setPosition(null);
    document.addEventListener('click', close);
    document.addEventListener('scroll', close, true);
    window.addEventListener('blur', close);

    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('blur', close);
    };
  }, [position]);

  return (
    <div
      onContextMenu={(event) => {
        event.preventDefault();
        setPosition({ x: event.clientX, y: event.clientY });
      }}
    >
      {trigger}
      {position && (
        <MenuSurface
          className="fixed z-50"
          style={{ left: position.x, top: position.y }}
          onClick={() => setPosition(null)}
        >
          {children}
        </MenuSurface>
      )}
    </div>
  );
}
