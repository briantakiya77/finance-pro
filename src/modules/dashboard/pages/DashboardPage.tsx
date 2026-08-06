import { ArrowUpRight, Layers, ShieldCheck, Zap } from 'lucide-react';

const foundationItems = [
  {
    title: 'Arquitetura escalavel',
    description: 'Pastas separadas por responsabilidade para crescimento incremental.',
    icon: Layers
  },
  {
    title: 'Base segura',
    description: 'Ambiente preparado para Supabase sem segredos expostos no codigo.',
    icon: ShieldCheck
  },
  {
    title: 'Performance desde o inicio',
    description: 'React Query pronto para cache, reuso de estado e leituras eficientes.',
    icon: Zap
  }
];

export default function DashboardPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="flex min-h-[58vh] flex-col justify-center gap-8">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            <span className="h-2 w-2 rounded-full bg-success" />
            Fundacao inicial
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-text-primary sm:text-5xl lg:text-6xl">
            Finance Pro
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-text-secondary sm:text-lg">
            Interface limpa, responsiva e preparada para receber os proximos modulos do aplicativo
            financeiro com consistencia, seguranca e performance.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {foundationItems.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-surface/75 p-5 shadow-glow"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-accent/15 text-accent">
                  <Icon size={22} />
                </div>
                <h2 className="text-base font-semibold text-text-primary">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{item.description}</p>
              </article>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-6 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
          <span>Pronto para evoluir sem implementar regras financeiras nesta etapa.</span>
          <span className="inline-flex items-center gap-2 text-accent">
            Estrutura profissional <ArrowUpRight size={16} />
          </span>
        </div>
      </div>
    </section>
  );
}
