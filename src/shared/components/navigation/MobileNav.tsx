import { CreditCard, Landmark, LayoutDashboard, ReceiptText, Repeat } from 'lucide-react';
import { NavLink } from 'react-router';

import { cn } from '@/shared/utils/cn';

const mobileItems = [
  { label: 'Inicio', href: '/', icon: LayoutDashboard },
  { label: 'Contas', href: '/contas', icon: Landmark },
  { label: 'Cartoes', href: '/cartoes', icon: CreditCard },
  { label: 'Recorr.', href: '/recorrencias', icon: Repeat },
  { label: 'Lancamentos', href: '/lancamentos', icon: ReceiptText }
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl xl:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-2">
        {mobileItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.label}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  'relative flex h-12 flex-col items-center justify-center gap-1 rounded-control text-caption text-text-secondary transition-all duration-normal hover:text-text-primary',
                  isActive && 'bg-accent-gradient-soft text-accent'
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
