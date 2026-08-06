import { BarChart3, Home, Settings } from 'lucide-react';
import { NavLink } from 'react-router';

import { cn } from '@/shared/utils/cn';

const mobileItems = [
  { label: 'Inicio', href: '/', icon: Home },
  { label: 'Resumo', href: '/', icon: BarChart3 },
  { label: 'Ajustes', href: '/', icon: Settings }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur xl:hidden">
      <div className="mx-auto grid max-w-md grid-cols-3 gap-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs text-text-secondary transition hover:text-text-primary',
                  isActive && item.label === 'Inicio' && 'bg-accent/15 text-accent'
                )
              }
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
