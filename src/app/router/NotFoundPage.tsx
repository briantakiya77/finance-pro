import { Link } from 'react-router';

import { Card } from '@/shared/components/ui';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center">
      <Card className="p-8 sm:p-10">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-3 text-title font-semibold text-text-primary">Pagina nao encontrada</h1>
        <p className="mt-3 text-body text-text-secondary">
          A rota acessada ainda nao existe na base inicial do Finance Pro.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex h-11 w-fit items-center rounded-control bg-accent-gradient px-4 text-sm font-medium text-text-primary shadow-glow transition-all duration-normal hover:brightness-110"
        >
          Voltar ao inicio
        </Link>
      </Card>
    </section>
  );
}
