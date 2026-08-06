import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col justify-center">
      <p className="text-sm text-accent">404</p>
      <h1 className="mt-3 text-3xl font-semibold text-text-primary">Pagina nao encontrada</h1>
      <p className="mt-3 text-text-secondary">
        A rota acessada ainda nao existe na base inicial do Finance Pro.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex w-fit rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
      >
        Voltar ao inicio
      </Link>
    </section>
  );
}
