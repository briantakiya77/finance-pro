import { Bell, Search, Settings } from 'lucide-react';

import { AuthProfileMenu } from '@/modules/auth/components/AuthProfileMenu';
import { BrandLogo } from '@/shared/components/brand/BrandLogo';
import { IconButton } from '@/shared/components/ui/IconButton';

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:h-[4.5rem] lg:px-8">
        <div className="xl:hidden">
          <BrandLogo variant="mark" theme="dark" size="sm" />
        </div>

        <label className="group hidden h-10 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-control border border-border bg-surface px-3.5 text-sm text-text-secondary transition-all duration-normal hover:border-border/90 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10 sm:flex">
          <Search size={18} className="shrink-0 transition-colors group-focus-within:text-accent" />
          <input
            type="search"
            aria-label="Pesquisa global"
            placeholder="Pesquisar no Finance Pro"
            className="min-w-0 flex-1 bg-transparent text-text-primary outline-none placeholder:text-text-secondary/70"
          />
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-caption text-text-secondary lg:inline-flex">
            Ctrl K
          </kbd>
        </label>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <IconButton label="Pesquisar" icon={<Search size={18} />} className="sm:hidden" />
          <IconButton label="Notificacoes" icon={<Bell size={18} />} />
          <IconButton label="Configuracoes" icon={<Settings size={18} />} />
          <AuthProfileMenu />
        </div>
      </div>
    </header>
  );
}
