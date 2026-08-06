import { ChevronLeft, Landmark, LayoutDashboard } from 'lucide-react';
import { NavLink } from 'react-router';

import { BrandMark } from '@/shared/components/brand/BrandMark';
import { IconButton } from '@/shared/components/ui/IconButton';
import { cn } from '@/shared/utils/cn';

type SidebarProps = {
  isCollapsed: boolean;
  onToggle: () => void;
};

const navigationItems = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Contas', href: '/contas', icon: Landmark }
];

export function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  return (
    <aside
      style={{ width: isCollapsed ? 84 : 256 }}
      className="fixed inset-y-0 left-0 z-40 hidden overflow-hidden border-r border-border bg-background transition-[width] duration-slow ease-[var(--ease-premium)] xl:flex xl:flex-col"
    >
      <div className="flex h-[4.5rem] items-center justify-between gap-2 border-b border-border px-4">
        <BrandMark collapsed={isCollapsed} />
        {!isCollapsed && (
          <IconButton label="Recolher menu" icon={<ChevronLeft size={18} />} onClick={onToggle} />
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1.5 px-3 py-5">
        {isCollapsed && (
          <IconButton
            label="Expandir menu"
            icon={<ChevronLeft size={18} className="rotate-180" />}
            onClick={onToggle}
            className="mx-auto mb-2"
          />
        )}
        {!isCollapsed && (
          <p className="mb-2 px-3 text-caption font-medium uppercase text-text-secondary/70">
            Visao geral
          </p>
        )}
        {navigationItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'relative flex h-11 items-center gap-3 overflow-hidden rounded-control px-3 text-sm text-text-secondary transition-all duration-normal hover:bg-surface-hover hover:text-text-primary',
                  isActive && 'bg-accent-gradient-soft text-text-primary',
                  isCollapsed && 'justify-center px-0'
                )
              }
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent" />
                  )}
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-control border border-border bg-surface p-2',
            isCollapsed && 'justify-center border-transparent bg-transparent p-0'
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-caption font-semibold">
            FP
          </span>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-caption font-medium text-text-primary">Finance Pro</p>
              <p className="truncate text-caption text-text-secondary">Espaco pessoal</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
