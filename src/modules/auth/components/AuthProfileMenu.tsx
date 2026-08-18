import { LogOut, LoaderCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '@/modules/auth/hooks/useAuth';
import { BrandLogo } from '@/shared/components/brand/BrandLogo';
import { MenuItem, MenuSurface } from '@/shared/components/ui';

export function AuthProfileMenu() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  async function handleSignOut() {
    setIsSigningOut(true);

    const result = await signOut();

    setIsSigningOut(false);

    if (result.error) {
      return;
    }

    setIsOpen(false);
    navigate('/login', { replace: true });
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Abrir perfil"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => setIsOpen((current) => !current)}
        className="ml-1 flex h-10 items-center gap-3 rounded-control border border-border bg-surface px-1.5 pr-2.5 transition-all duration-normal hover:border-accent/35 hover:bg-surface-hover"
      >
        <BrandLogo variant="mark" theme="dark" size="sm" decorative />
        <span className="hidden text-left lg:block">
          <span className="block max-w-40 truncate text-caption font-medium text-text-primary">
            {user?.email ?? 'Finance Pro'}
          </span>
          <span className="block text-caption text-text-secondary">Perfil</span>
        </span>
      </button>

      {isOpen && (
        <MenuSurface className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 p-2">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-caption font-medium text-text-primary">
              {user?.email ?? 'Sessao ativa'}
            </p>
            <p className="mt-1 text-caption text-text-secondary">
              Seus dados privados permanecem vinculados a esta conta.
            </p>
          </div>

          <div className="pt-1">
            <MenuItem onClick={() => void handleSignOut()} disabled={isSigningOut} danger>
              {isSigningOut ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LogOut size={16} />
              )}
              <span>{isSigningOut ? 'Saindo...' : 'Sair'}</span>
            </MenuItem>
          </div>
        </MenuSurface>
      )}
    </div>
  );
}
