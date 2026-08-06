import { BarChart3, Home, Menu, Settings } from 'lucide-react';
import { NavLink } from 'react-router';

import { BrandMark } from '@/shared/components/brand/BrandMark';
import { IconButton } from '@/shared/components/ui/IconButton';
import { cn } from '@/shared/utils/cn';

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

const navigationItems = [
  { label: 'Inicio', href: '/', icon: Home },
  { label: 'Visao geral', href: '/', icon: BarChart3 },
  { label: 'Ajustes', href: '/', icon: Settings }
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 hidden border-r border-border bg-background/95 backdrop-blur xl:flex xl:flex-col',
        isCollapsed ? 'w-20' : 'w-72'
      )}
    >
      <div className="flex h-20 items-center justify-between px-5">
        <BrandMark collapsed={isCollapsed} />
        {!isCollapsed && (
          <IconButton label="Recolher menu" icon={<Menu size={18} />} onClick={onToggle} />
        )}
      </div>

      {isCollapsed && (
        <div className="flex justify-center px-3 pb-4">
          <IconButton label="Expandir menu" icon={<Menu size={18} />} onClick={onToggle} />
        </div>
      )}

      <nav className="flex flex-1 flex-col gap-2 px-3 py-4">
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex h-11 items-center gap-3 rounded-lg px-3 text-sm text-text-secondary transition hover:bg-surface-hover hover:text-text-primary',
                  isActive && item.label === 'Inicio' && 'bg-accent/15 text-accent',
                  isCollapsed && 'justify-center px-0'
                )
              }
              title={item.label}
            >
              <Icon size={18} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
