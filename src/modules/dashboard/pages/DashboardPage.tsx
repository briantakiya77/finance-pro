import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  CreditCard,
  Landmark,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards
} from 'lucide-react';

import { useCreditCardsQuery } from '@/modules/credit-cards/queries/creditCardsQueries';
import {
  getInvoiceOutstandingAmount,
  getInvoiceStatus
} from '@/modules/credit-cards/services/creditCardBilling';
import {
  useDashboardRecentTransactionsQuery,
  useDashboardSummaryQuery
} from '@/modules/dashboard/queries/dashboardQueries';
import { useFinancialGoalsQuery } from '@/modules/goals/queries/goalsQueries';
import { useDashboardPlanningSnapshotQuery } from '@/modules/planning/queries/planningQueries';
import {
  formatReferenceMonthLabel,
  getCurrentReferenceMonth,
  getUsageLabel,
  getUsageTone
} from '@/modules/planning/services/planningService';
import { Badge, Card } from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/money';

const chartBars = [32, 46, 38, 58, 49, 72, 61, 80, 68, 86, 74, 92];

export default function DashboardPage() {
  const summaryQuery = useDashboardSummaryQuery();
  const recentTransactionsQuery = useDashboardRecentTransactionsQuery();
  const creditCardsQuery = useCreditCardsQuery();
  const goalsQuery = useFinancialGoalsQuery();
  const currentReferenceMonth = getCurrentReferenceMonth();
  const planningSnapshotQuery = useDashboardPlanningSnapshotQuery(currentReferenceMonth, 3);
  const summary = summaryQuery.data;
  const recentTransactions = recentTransactionsQuery.data ?? [];
  const planningSnapshot = planningSnapshotQuery.data;
  const monthlyPlan = planningSnapshot?.monthlyPlan ?? null;
  const categoryBudgets = planningSnapshot?.categoryBudgets ?? [];
  const projection = planningSnapshot?.projection ?? [];
  const commitments = planningSnapshot?.upcomingCommitments ?? [];
  const creditCards = (creditCardsQuery.data ?? []).slice(0, 3);
  const topBudgetCategories = categoryBudgets.slice(0, 4);
  const donutTotalSpent = topBudgetCategories.reduce(
    (total, item) => total + Number(item.spent_amount),
    0
  );
  const projectionHeadline =
    projection.find((item) => item.reference_month === currentReferenceMonth) ?? projection[0] ?? null;
  const activeGoals = (goalsQuery.data ?? []).filter((goal) => goal.status !== 'cancelled');
  const primaryGoal = activeGoals[0] ?? null;
  const emergencyGoal =
    activeGoals.find((goal) => goal.type === 'emergency_fund') ?? null;
  const summaryCards = [
    {
      label: 'Receitas',
      value: formatCurrency(summary?.currentMonthIncome ?? '0.00'),
      detail: 'Realizadas no mes',
      icon: TrendingUp,
      tone: 'income'
    },
    {
      label: 'Despesas',
      value: formatCurrency(summary?.currentMonthExpense ?? '0.00'),
      detail: 'Realizadas no mes',
      icon: TrendingDown,
      tone: 'expense'
    },
    {
      label: 'Receitas previstas',
      value: formatCurrency(projectionHeadline?.projected_income ?? '0.00'),
      detail: 'Ainda nao realizadas',
      icon: TrendingUp,
      tone: 'income'
    },
    {
      label: 'Despesas previstas',
      value: formatCurrency(monthlyPlan?.forecast_expense ?? projectionHeadline?.projected_expense ?? '0.00'),
      detail: 'Ainda nao realizadas',
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

  function formatTransactionDate(date: string) {
    const normalizedDate = date.includes('T') ? new Date(date) : new Date(`${date}T00:00:00Z`);
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(normalizedDate);
  }

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
              <p className="mt-1 text-caption text-text-secondary">
                {monthlyPlan
                  ? formatReferenceMonthLabel(monthlyPlan.reference_month)
                  : 'Defina um planejamento para o mes atual'}
              </p>
            </div>
            <Badge variant={monthlyPlan ? 'accent' : 'default'}>
              {monthlyPlan?.spending_usage_percentage
                ? `${monthlyPlan.spending_usage_percentage}% utilizado`
                : 'Sem planejamento'}
            </Badge>
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-accent-gradient"
              style={{
                width: `${Math.min(Number(monthlyPlan?.spending_usage_percentage ?? 0), 100)}%`
              }}
            />
          </div>
          <div className="mt-3 flex justify-between text-caption text-text-secondary">
            <span>{formatCurrency(monthlyPlan?.realized_expense ?? '0.00')}</span>
            <span>
              {monthlyPlan?.monthly_budget_total
                ? formatCurrency(monthlyPlan.monthly_budget_total)
                : 'Definir planejamento'}
            </span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
              <h2 className="text-heading font-semibold text-text-primary">Saldo projetado</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Caixa previsto e capacidade segura de gasto sem alterar o saldo real.
              </p>
            </div>
            <Badge variant="accent">3 meses</Badge>
          </div>
          {projectionHeadline ? (
            <>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Saldo de abertura</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatCurrency(projectionHeadline.opening_balance)}
                  </p>
                </div>
                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Quanto ainda posso gastar</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatCurrency(monthlyPlan?.safe_to_spend ?? '0.00')}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">
                    Reserva minima: {formatCurrency(monthlyPlan?.minimum_reserve_amount ?? '0.00')}
                  </p>
                </div>
              </div>
              <div
                className="mt-8 flex h-44 items-end gap-2 border-b border-border px-1 pb-1 sm:gap-3"
                role="img"
                aria-label="Grafico de barras com saldo projetado"
              >
                {projection.map((item, index) => {
                  const height = Math.max(
                    18,
                    Math.min(
                      100,
                      Math.round(
                        (Number(item.closing_balance) /
                          Math.max(...projection.map((entry) => Number(entry.closing_balance)), 1)) *
                          100
                      )
                    )
                  );

                  return (
                    <motion.span
                      key={`${item.reference_month}-${index}`}
                      className="min-w-0 flex-1 rounded-t-sm bg-accent-gradient opacity-80"
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.04 * index, duration: 0.45 }}
                      title={`${formatReferenceMonthLabel(item.reference_month)}: ${formatCurrency(item.closing_balance)}`}
                    />
                  );
                })}
              </div>
            </>
          ) : (
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
          )}
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <h2 className="text-heading font-semibold text-text-primary">Categorias em foco</h2>
          <p className="mt-1 text-caption text-text-secondary">
            Categorias mais proximas do limite no planejamento atual.
          </p>
          <div className="mt-8 flex items-center justify-center">
            <div className="relative flex aspect-square w-40 items-center justify-center rounded-full bg-[conic-gradient(rgb(var(--accent))_0deg,rgb(var(--accent-secondary))_120deg,rgb(var(--surface-hover))_120deg)]">
              <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-surface-secondary">
                <span className="text-heading font-semibold text-text-primary">
                  {donutTotalSpent ? formatCurrency(donutTotalSpent) : '0%'}
                </span>
                <span className="mt-1 text-caption text-text-secondary">
                  {topBudgetCategories.length ? 'gasto monitorado' : 'sem categorias'}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {topBudgetCategories.length ? (
              topBudgetCategories.map((budget) => (
                <div key={budget.budget_id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{budget.category_name}</p>
                    <p className="mt-1 text-caption text-text-secondary">
                      {formatCurrency(budget.spent_amount)} de {formatCurrency(budget.budget_amount)}
                    </p>
                  </div>
                  <Badge variant={getUsageTone(budget.status)}>{budget.usage_percentage}%</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                Defina orcamentos por categoria para acompanhar limites aqui.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Meta de economia</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Receitas reais menos despesas reais do mes atual.
              </p>
            </div>
            <Badge variant={Number(monthlyPlan?.realized_savings ?? 0) >= 0 ? 'success' : 'danger'}>
              {monthlyPlan?.savings_progress_percentage
                ? `${monthlyPlan.savings_progress_percentage}% da meta`
                : 'Sem meta definida'}
            </Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                <p className="text-caption text-text-secondary">Meta</p>
                <p className="mt-2 text-lg font-semibold text-text-primary">
                  {formatCurrency(monthlyPlan?.savings_target ?? '0.00')}
                </p>
            </div>
            <div className="rounded-control border border-border bg-background/60 px-4 py-4">
              <p className="text-caption text-text-secondary">Economia atual</p>
              <p
                className={`mt-2 text-lg font-semibold ${
                  Number(monthlyPlan?.realized_savings ?? 0) >= 0 ? 'text-income' : 'text-danger'
                }`}
              >
                {formatCurrency(monthlyPlan?.realized_savings ?? '0.00')}
              </p>
            </div>
            <div className="rounded-control border border-border bg-background/60 px-4 py-4">
              <p className="text-caption text-text-secondary">Restante</p>
              <p className="mt-2 text-lg font-semibold text-text-primary">
                {formatCurrency(
                  Math.max(
                    0,
                    Number(monthlyPlan?.savings_target ?? 0) - Number(monthlyPlan?.realized_savings ?? 0)
                  )
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <h2 className="text-heading font-semibold text-text-primary">Proximos compromissos</h2>
          <p className="mt-1 text-caption text-text-secondary">
            Recorrencias, faturas, parcelas e metas com prazo proximo.
          </p>

          <div className="mt-6 space-y-3">
            {commitments.length ? (
              commitments.slice(0, 5).map((commitment) => (
                <div
                  key={`${commitment.kind}-${commitment.source_id}`}
                  className="rounded-control border border-border bg-background/60 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{commitment.title}</p>
                      <p className="mt-1 text-caption text-text-secondary">
                        {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
                          new Date(`${commitment.due_date}T00:00:00Z`)
                        )}{' '}
                        • {commitment.detail}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-text-primary">
                      {formatCurrency(commitment.amount)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                Sem compromissos previstos para os proximos dias.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Orcamento em alerta</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Categorias mais proximas do limite considerando realizado e previsto.
              </p>
            </div>
            <Badge variant="accent">{topBudgetCategories.length} categorias</Badge>
          </div>
          <div className="mt-6 space-y-3">
            {topBudgetCategories.length ? (
              topBudgetCategories.map((budget) => (
                <div
                  key={budget.budget_id}
                  className="rounded-control border border-border bg-background/60 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{budget.category_name}</p>
                      <p className="mt-1 text-caption text-text-secondary">
                        {formatCurrency(budget.realized_amount)} realizado •{' '}
                        {formatCurrency(budget.forecast_amount)} previsto
                      </p>
                    </div>
                    <Badge variant={getUsageTone(budget.status)}>
                      {getUsageLabel(budget.status)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                Defina orcamentos por categoria para acompanhar alertas aqui.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Metas em destaque</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Progresso da principal meta e da reserva de emergencia.
              </p>
            </div>
            <Badge variant="accent">{activeGoals.length} metas</Badge>
          </div>
          <div className="mt-6 space-y-3">
            {primaryGoal ? (
              <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                <p className="font-medium text-text-primary">{primaryGoal.name}</p>
                <p className="mt-1 text-caption text-text-secondary">
                  {formatCurrency(primaryGoal.current_amount)} de {formatCurrency(primaryGoal.target_amount)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">Nenhuma meta ativa no momento.</p>
            )}

            {emergencyGoal ? (
              <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                <p className="font-medium text-text-primary">Reserva de emergencia</p>
                <p className="mt-1 text-caption text-text-secondary">
                  {formatCurrency(emergencyGoal.current_amount)} de {formatCurrency(emergencyGoal.target_amount)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">
                Crie uma meta de reserva de emergencia para acompanhar cobertura minima.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Cartoes de credito</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Limite utilizado, disponivel e proxima fatura sem duplicar despesas.
              </p>
            </div>
            <Badge variant="accent">
              <CreditCard size={14} />
              {creditCards.length} ativos
            </Badge>
          </div>

          <div className="mt-6 space-y-3">
            {creditCardsQuery.isLoading ? (
              <p className="text-sm text-text-secondary">Carregando cartoes...</p>
            ) : creditCards.length ? (
              creditCards.map((card) => (
                <div
                  key={card.id}
                  className="rounded-control border border-border bg-background/60 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">{card.name}</p>
                      <p className="mt-1 text-caption text-text-secondary">
                        {card.bank} • fecha dia {card.closing_day}
                        {card.currentInvoice
                          ? ` • vence ${formatTransactionDate(card.currentInvoice.due_date)}`
                          : ''}
                      </p>
                    </div>
                    <Badge
                      variant={
                        card.currentInvoice && getInvoiceStatus(card.currentInvoice) === 'paid'
                          ? 'success'
                          : 'accent'
                      }
                    >
                      {formatCurrency(card.availableLimit)} livre
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-caption text-text-secondary">Limite total</p>
                      <p className="mt-1 font-semibold text-text-primary">
                        {formatCurrency(card.limit_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Utilizado</p>
                      <p className="mt-1 font-semibold text-expense">
                        {formatCurrency(card.utilizedAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-text-secondary">Proxima fatura</p>
                      <p className="mt-1 font-semibold text-text-primary">
                        {formatCurrency(
                          card.currentInvoice ? getInvoiceOutstandingAmount(card.currentInvoice) : '0.00'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-text-secondary">
                Nenhum cartao ativo encontrado no momento.
              </p>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6" tone="secondary">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">Movimentacoes recentes</h2>
              <p className="mt-1 text-caption text-text-secondary">
                Caixa, compras no cartao e pagamentos de fatura em um unico feed.
              </p>
            </div>
            <Badge variant="accent">
              <ReceiptText size={14} />
              {recentTransactions.length} itens
            </Badge>
          </div>

          <div className="mt-6 space-y-3">
            {recentTransactionsQuery.isLoading ? (
              <p className="text-sm text-text-secondary">Carregando movimentacoes...</p>
            ) : recentTransactionsQuery.isError ? (
              <p className="text-sm text-danger">Nao foi possivel carregar as movimentacoes recentes.</p>
            ) : recentTransactions.length ? (
              recentTransactions.map((item) => {
                if (item.kind === 'bank-transaction') {
                  const transaction = item.transaction;

                  return (
                    <div
                      key={`bank-${transaction.id}`}
                      className="flex items-start justify-between gap-3 rounded-control border border-border bg-background/60 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-primary">
                          {transaction.description}
                        </p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {transaction.categories?.name ?? 'Sem categoria'} •{' '}
                          {transaction.accounts?.name ?? 'Conta indisponivel'} •{' '}
                          {formatTransactionDate(transaction.transaction_date)}
                        </p>
                      </div>
                      <span
                        className={
                          transaction.type === 'income'
                            ? 'shrink-0 text-sm font-semibold text-income'
                            : 'shrink-0 text-sm font-semibold text-expense'
                        }
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  );
                }

                if (item.kind === 'credit-card-purchase') {
                  const purchase = item.purchase;
                  const installmentLabel =
                    purchase.installment_number && purchase.installment_count
                      ? ` • ${purchase.installment_number}/${purchase.installment_count}`
                      : '';

                  return (
                    <div
                      key={`card-purchase-${purchase.id}`}
                      className="flex items-start justify-between gap-3 rounded-control border border-border bg-background/60 px-4 py-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-text-primary">
                          {purchase.description}
                        </p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {purchase.credit_cards?.name ?? 'Cartao indisponivel'}
                          {purchase.credit_cards?.bank ? ` • ${purchase.credit_cards.bank}` : ''}
                          {installmentLabel} • {formatTransactionDate(purchase.purchase_date)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-expense">
                        -{formatCurrency(purchase.amount)}
                      </span>
                    </div>
                  );
                }

                const payment = item.payment;
                return (
                  <div
                    key={`card-payment-${payment.id}`}
                    className="flex items-start justify-between gap-3 rounded-control border border-border bg-background/60 px-4 py-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-primary">
                        Pagamento de fatura
                      </p>
                      <p className="mt-1 text-caption text-text-secondary">
                        {payment.credit_card_invoices?.credit_cards?.name ?? 'Cartao indisponivel'} •{' '}
                        {payment.accounts?.name ?? 'Conta indisponivel'} •{' '}
                        {formatTransactionDate(payment.paid_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-text-primary">
                      {formatCurrency(payment.amount)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-text-secondary">
                Nenhuma movimentacao recente encontrada para este usuario.
              </p>
            )}
          </div>
        </Card>
      </div>
    </motion.section>
  );
}
