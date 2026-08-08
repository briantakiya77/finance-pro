import { motion } from 'framer-motion';
import { ArrowUpRight, Landmark, TrendingDown, TrendingUp, WalletCards } from 'lucide-react';

import { useDashboardSummaryQuery } from '@/modules/dashboard/queries/dashboardQueries';
import { Badge, Card } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/money';

const chartBars = [32, 46, 38, 58, 49, 72, 61, 80, 68, 86, 74, 92];

export default function DashboardPage() {
  const summaryQuery = useDashboardSummaryQuery();
  const summary = summaryQuery.data;
  const summaryCards = [
    {
      label: 'Receitas',
      value: formatCurrency(summary?.currentMonthIncome ?? '0.00'),
      detail: 'Este mes',
      icon: TrendingUp,
      tone: 'income'
    },
    {
      label: 'Despesas',
      value: formatCurrency(summary?.currentMonthExpense ?? '0.00'),
      detail: 'Este mes',
      icon: TrendingDown,
      tone: 'expense'
    },
    {
      label: 'Contas',
      value: String(summary?.accountsCount ?? 0),
      detail: 'Contas ativas',
      icon: Landmark,
      tone: 'accent'
    }
  ] as const;

  return (
    <motion.section
      className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="accent">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Visao geral
          </Badge>
          <h1 className="mt-4 text-title font-semibold text-text-primary">Finance Pro</h1>
          <p className="mt-2 text-body text-text-secondary">
            Seu panorama financeiro em um unico lugar.
          </p>
        </div>
        <p className="text-caption text-text-secondary">Atualizado agora</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <Card className="relative overflow-hidden p-5 sm:p-6" interactive>
          <div className="absolute inset-x-0 top-0 h-px bg-accent-gradient" />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-text-secondary">Saldo disponivel</p>
              <p className="mt-2 text-display font-semibold text-text-primary">
                {formatCurrency(summary?.availableBalance ?? '0.00')}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
              <WalletCards size={22} />
            </span>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Suas contas</p>
              <p className="mt-1 text-caption text-text-secondary">
                {summaryQuery.isLoading
                  ? 'Atualizando saldos'
                  : `${summary?.accountsCount ?? 0} contas ativas`}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm text-accent">
              Ver contas <ArrowUpRight size={16} />
            </span>
          </div>
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Planejamento mensal</p>
              <p className="mt-1 text-caption text-text-secondary">Aguardando movimentacoes</p>
            </div>
            <Badge>0% utilizado</Badge>
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full w-0 rounded-full bg-income" />
          </div>
          <div className="mt-3 flex justify-between text-caption text-text-secondary">
            <span>R$ 0,00</span>
            <span>Sem orcamento definido</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summaryCards.map((item, index) => {
          const Icon = item.icon;

          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index, duration: 0.32 }}
            >
              <Card className="h-full p-5" interactive>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-text-secondary">{item.label}</p>
                    <p
                      className={
                        item.tone === 'income'
                          ? 'mt-2 text-heading font-semibold text-income'
                          : item.tone === 'expense'
                            ? 'mt-2 text-heading font-semibold text-expense'
                            : 'mt-2 text-heading font-semibold text-text-primary'
                      }
                    >
                      {item.value}
                    </p>
                    <p className="mt-1.5 text-caption text-text-secondary">{item.detail}</p>
                  </div>
                  <span
                    className={
                      item.tone === 'income'
                        ? 'text-income'
                        : item.tone === 'expense'
                          ? 'text-expense'
                          : 'text-accent'
                    }
                  >
                    <Icon size={20} />
                  </span>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Fluxo mensal</h2>
              <p className="mt-1 text-caption text-text-secondary">Visualizacao preparada</p>
            </div>
            <Badge variant="accent">12 meses</Badge>
          </div>
          <div
            className="mt-8 flex h-44 items-end gap-2 border-b border-border px-1 pb-1 sm:gap-3"
            role="img"
            aria-label="Grafico demonstrativo do fluxo mensal"
          >
            {chartBars.map((height, index) => (
              <motion.span
                key={`${height}-${index}`}
                className="min-w-0 flex-1 rounded-t-sm bg-accent-gradient opacity-75"
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.02 * index, duration: 0.5 }}
              />
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <h2 className="text-heading font-semibold text-text-primary">Distribuicao</h2>
          <p className="mt-1 text-caption text-text-secondary">Sem dados financeiros ainda</p>
          <div className="mt-8 flex items-center justify-center">
            <div className="relative flex aspect-square w-40 items-center justify-center rounded-full bg-[conic-gradient(rgb(var(--accent))_0deg,rgb(var(--accent-secondary))_120deg,rgb(var(--surface-hover))_120deg)]">
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface-secondary">
                <span className="text-heading font-semibold text-text-primary">0%</span>
                <span className="mt-1 text-caption text-text-secondary">categorizado</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </motion.section>
  );
}
