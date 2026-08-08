import type { ReactNode } from 'react';

import { Link } from 'react-router';

import { BrandMark } from '@/shared/components/brand/BrandMark';
import { Badge, Card } from '@/shared/components/ui';

type AuthPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  sideNote?: ReactNode;
};

export function AuthPageShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  sideNote
}: AuthPageShellProps) {
  return (
    <section className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-accent-gradient opacity-70" />
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-2xl">
          <BrandMark className="mb-10" />
          <Badge variant="accent" className="mb-5">
            <span className="h-2 w-2 rounded-full bg-success" />
            {eyebrow}
          </Badge>
          <h1 className="text-display font-semibold text-text-primary">{title}</h1>
          <p className="mt-5 max-w-xl text-body text-text-secondary">{description}</p>

          <div className="mt-8 flex flex-wrap gap-3 text-sm text-text-secondary">
            <Link
              to="/login"
              className="inline-flex h-11 items-center rounded-control border border-border bg-surface-secondary px-4 transition-all duration-normal hover:border-accent/35 hover:bg-surface-hover hover:text-text-primary"
            >
              Entrar
            </Link>
            <Link
              to="/cadastro"
              className="inline-flex h-11 items-center rounded-control border border-transparent bg-accent-gradient px-4 font-medium text-text-primary shadow-glow transition-all duration-normal hover:brightness-110"
            >
              Criar conta
            </Link>
          </div>

          {sideNote && (
            <Card className="mt-8 p-5" tone="secondary">
              {sideNote}
            </Card>
          )}
        </div>

        <Card className="p-6 sm:p-8" tone="secondary">
          <div className="mb-8 grid grid-cols-3 gap-2" aria-hidden="true">
            <span className="h-1 rounded-full bg-accent-secondary" />
            <span className="h-1 rounded-full bg-accent" />
            <span className="h-1 rounded-full bg-success" />
          </div>

          {children}

          {footer && <div className="mt-6 border-t border-border pt-4">{footer}</div>}
        </Card>
      </div>
    </section>
  );
}
