import { Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { Outlet } from 'react-router';

import { BrandMark } from '@/shared/components/brand/BrandMark';
import { MobileNav } from '@/shared/components/navigation/MobileNav';
import { Sidebar } from '@/shared/components/navigation/Sidebar';
import { IconButton } from '@/shared/components/ui/IconButton';
import { cn } from '@/shared/utils/cn';

export function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-text-primary">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div
        className={cn(
          'min-h-screen pb-24 transition-[padding] duration-200 xl:pb-0',
          isSidebarCollapsed ? 'xl:pl-20' : 'xl:pl-72'
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
          <div className="flex h-20 items-center gap-4 px-4 sm:px-6 lg:px-8">
            <div className="xl:hidden">
              <BrandMark />
            </div>

            <IconButton
              label="Alternar sidebar"
              icon={<Menu size={18} />}
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className="hidden xl:inline-flex"
            />

            <div className="hidden min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-surface/70 px-4 py-2.5 text-sm text-text-secondary sm:flex">
              <Search size={18} className="shrink-0" />
              <span className="truncate">Finance Pro pronto para evoluir</span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-text-primary">Ambiente inicial</p>
                <p className="text-xs text-text-secondary">Dark mode ativo</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-sm font-semibold text-success">
                FP
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
