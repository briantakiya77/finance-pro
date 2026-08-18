import { CalendarRange, PencilLine, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useCategoriesQuery } from '@/modules/categories/queries/categoriesQueries';
import { useCategoryBudgetProgressQuery, useMonthlyPlanOverviewQuery, useUpsertMonthlyPlanMutation } from '@/modules/planning/queries/planningQueries';
import {
  formatMonthInputValue,
  formatReferenceMonthLabel,
  getCurrentReferenceMonth,
  getUsageLabel,
  getUsageTone
} from '@/modules/planning/services/planningService';
import type { PlanningFormValues } from '@/modules/planning/types/planning';
import { PlanningFormModal } from '@/modules/planning/components/PlanningFormModal';
import {
  Badge,
  Button,
  Card,
  Input,
  PageHeader,
  RouteLoading,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  Toast
} from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/money';

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar o planejamento no momento.';
}

export default function PlanningPage() {
  const [referenceMonth, setReferenceMonth] = useState(getCurrentReferenceMonth());
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const categoriesQuery = useCategoriesQuery('expense');
  const monthlyPlanQuery = useMonthlyPlanOverviewQuery(referenceMonth);
  const budgetsQuery = useCategoryBudgetProgressQuery(referenceMonth);
  const upsertMonthlyPlanMutation = useUpsertMonthlyPlanMutation(referenceMonth);

  const categories = categoriesQuery.data ?? [];
  const monthlyPlan = monthlyPlanQuery.data ?? null;
  const categoryBudgets = useMemo(
    () => (budgetsQuery.data ?? []).filter((budget) => Number(budget.budget_amount) > 0),
    [budgetsQuery.data]
  );
  const categoriesWithoutBudget = Math.max(categories.length - categoryBudgets.length, 0);
  const referenceMonthLabel = formatReferenceMonthLabel(referenceMonth);

  async function handleSubmit(values: PlanningFormValues) {
    try {
      await upsertMonthlyPlanMutation.mutateAsync(values);
      setFeedbackMessage('Planejamento mensal salvo com sucesso.');
      setIsPlanningModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  if (monthlyPlanQuery.isLoading || budgetsQuery.isLoading || categoriesQuery.isLoading) {
    return <RouteLoading />;
  }

  if (monthlyPlanQuery.isError || budgetsQuery.isError || categoriesQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar o planejamento">
          {getFriendlyErrorMessage(
            monthlyPlanQuery.error ?? budgetsQuery.error ?? categoriesQuery.error
          )}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Planejamento"
          title="Planejamento mensal"
          description="Defina previsao de receita, meta de economia e limites por categoria sem misturar valores planejados com o realizado."
          action={
            <Button
              type="button"
              icon={<PencilLine size={18} />}
              onClick={() => setIsPlanningModalOpen(true)}
            >
              {monthlyPlan ? 'Editar planejamento' : 'Definir planejamento'}
            </Button>
          }
        />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex max-w-xs flex-col gap-2 text-sm text-text-secondary">
            <span>Competencia</span>
            <Input
              type="month"
              value={formatMonthInputValue(referenceMonth)}
              onChange={(event) => setReferenceMonth(`${event.target.value}-01`)}
            />
          </label>
          <Badge variant="accent">
            <CalendarRange size={14} />
            {referenceMonthLabel}
          </Badge>
        </div>

        {feedbackMessage && (
          <Toast variant="success" title="Tudo certo">
            {feedbackMessage}
          </Toast>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-heading font-semibold text-text-primary">
                  Planejado x realizado
                </h2>
                <p className="mt-1 text-caption text-text-secondary">
                  {monthlyPlan
                    ? 'Acompanhe limite de gasto e meta de economia sem gerar lancamentos automaticos.'
                    : 'Ainda nao existe planejamento salvo para esta competencia.'}
                </p>
              </div>
              <Badge variant={monthlyPlan ? 'accent' : 'default'}>
                {monthlyPlan ? 'Planejamento ativo' : 'Sem planejamento'}
              </Badge>
            </div>

            {monthlyPlan ? (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Quanto ainda posso gastar</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatCurrency(monthlyPlan.safe_to_spend)}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">
                    Reserva protegida: {formatCurrency(monthlyPlan.minimum_reserve_amount)}
                  </p>
                </div>

                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Orcamento total do mes</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatCurrency(monthlyPlan.monthly_budget_total)}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">
                    Realizado: {formatCurrency(monthlyPlan.realized_expense)} • Previsto:{' '}
                    {formatCurrency(monthlyPlan.forecast_expense)}
                  </p>
                </div>

                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Saldo projetado no fim do mes</p>
                  <p className="mt-2 text-lg font-semibold text-text-primary">
                    {formatCurrency(monthlyPlan.projected_month_end_balance)}
                  </p>
                  <p className="mt-1 text-caption text-text-secondary">
                    Faturas ja comprometidas: {formatCurrency(monthlyPlan.invoice_cash_obligation)}
                  </p>
                </div>
              </div>
            ) : (
              <Card className="mt-6 p-8 text-center" tone="secondary">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
                  <Plus size={22} />
                </div>
                <p className="mt-5 text-lg font-semibold text-text-primary">
                  Nenhum planejamento definido
                </p>
                <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
                  Defina um limite mensal, meta de economia e orcamentos por categoria para esta
                  competencia.
                </p>
                <Button className="mt-6" onClick={() => setIsPlanningModalOpen(true)}>
                  Definir planejamento
                </Button>
              </Card>
            )}
          </Card>

          <Card className="p-5 sm:p-6" tone="secondary">
            <h2 className="text-heading font-semibold text-text-primary">Resumo do mes</h2>
            <p className="mt-1 text-caption text-text-secondary">
              Separacao clara entre previsto, realizado e orientacao.
            </p>

            <div className="mt-6 space-y-4">
                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-caption text-text-secondary">Planejado / realizado / previsto</span>
                    <span className="text-sm font-medium text-text-primary">
                      {`${formatCurrency(monthlyPlan?.monthly_budget_total ?? '0.00')} / ${formatCurrency(monthlyPlan?.realized_expense ?? '0.00')} / ${formatCurrency(monthlyPlan?.forecast_expense ?? '0.00')}`}
                    </span>
                  </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-accent-gradient"
                    style={{
                      width: `${Math.min(Number(monthlyPlan?.spending_usage_percentage ?? 0), 100)}%`
                    }}
                  />
                </div>
              </div>

              <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption text-text-secondary">Receitas do periodo</span>
                  <span
                    className={`text-sm font-medium ${
                      Number(monthlyPlan?.projected_income_total ?? 0) >= Number(monthlyPlan?.projected_expense_total ?? 0)
                        ? 'text-income'
                        : 'text-danger'
                    }`}
                  >
                    {formatCurrency(monthlyPlan?.projected_income_total ?? '0.00')}
                  </span>
                </div>
                <p className="mt-2 text-caption text-text-secondary">
                  Realizado: {formatCurrency(monthlyPlan?.realized_income ?? '0.00')} • Previsto:{' '}
                  {formatCurrency(monthlyPlan?.forecast_income ?? '0.00')}
                </p>
              </div>

              <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-caption text-text-secondary">Meta de economia</span>
                  <span
                    className={`text-sm font-medium ${
                      Number(monthlyPlan?.realized_savings ?? 0) >= 0 ? 'text-income' : 'text-danger'
                    }`}
                  >
                    {formatCurrency(monthlyPlan?.realized_savings ?? '0.00')}
                  </span>
                </div>
                <p className="mt-2 text-caption text-text-secondary">
                  {monthlyPlan?.savings_target
                    ? `Meta: ${formatCurrency(monthlyPlan.savings_target)}`
                    : 'Defina uma meta para acompanhar o progresso.'}
                </p>
              </div>

              {monthlyPlan?.notes ? (
                <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                  <p className="text-caption text-text-secondary">Observacoes</p>
                  <p className="mt-2 text-sm text-text-primary">{monthlyPlan.notes}</p>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-heading font-semibold text-text-primary">
                Orcamento por categoria
              </h2>
              <p className="mt-1 text-caption text-text-secondary">
                O acompanhamento e orientativo: exceder o limite nao bloqueia lancamentos.
              </p>
            </div>
            <Badge variant={categoryBudgets.length ? 'accent' : 'default'}>
              {categoryBudgets.length} categorias com orçamento
            </Badge>
          </div>

          {categoryBudgets.length === 0 ? (
            <div className="mt-6 rounded-control border border-dashed border-border px-5 py-8 text-center">
              <p className="font-medium text-text-primary">Nenhum orçamento por categoria ainda</p>
              <p className="mt-2 text-sm text-text-secondary">
                Defina valores nas categorias de despesa para comparar planejado x realizado.
              </p>
              {categoriesWithoutBudget ? (
                <p className="mt-2 text-caption text-text-secondary">
                  {categoriesWithoutBudget} categorias seguem ativas, mas sem orçamento definido.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="mt-6 hidden md:block">
                <TableContainer>
                  <Table>
                    <TableHead>
                      <tr>
                        <TableHeaderCell>Categoria</TableHeaderCell>
                        <TableHeaderCell>Orcado</TableHeaderCell>
                        <TableHeaderCell>Realizado</TableHeaderCell>
                        <TableHeaderCell>Previsto</TableHeaderCell>
                        <TableHeaderCell>Projecao final</TableHeaderCell>
                        <TableHeaderCell>Disponivel</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                      </tr>
                    </TableHead>
                    <TableBody>
                      {categoryBudgets.map((budget) => (
                        <tr key={budget.budget_id}>
                          <TableCell>{budget.category_name}</TableCell>
                          <TableCell>{formatCurrency(budget.budget_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.realized_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.forecast_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.projected_amount)}</TableCell>
                          <TableCell>{formatCurrency(budget.remaining_amount)}</TableCell>
                          <TableCell>
                            <Badge variant={getUsageTone(budget.status)}>
                              {getUsageLabel(budget.status)}
                            </Badge>
                          </TableCell>
                        </tr>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>

              <div className="mt-6 grid gap-3 md:hidden">
                {categoryBudgets.map((budget) => (
                  <Card key={budget.budget_id} className="p-4" tone="secondary">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-text-primary">{budget.category_name}</p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {formatCurrency(budget.realized_amount)} realizado •{' '}
                          {formatCurrency(budget.forecast_amount)} previsto
                        </p>
                      </div>
                      <Badge variant={getUsageTone(budget.status)}>
                        {budget.projected_usage_percentage}%
                      </Badge>
                    </div>
                    <p className="mt-3 text-caption text-text-secondary">
                      Disponivel agora: {formatCurrency(budget.remaining_amount)} • Projecao:{' '}
                      {formatCurrency(budget.projected_amount)}
                    </p>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Card>
      </section>

      {isPlanningModalOpen && (
        <PlanningFormModal
          budgets={budgetsQuery.data ?? []}
          categories={categories}
          isSubmitting={upsertMonthlyPlanMutation.isPending}
          monthlyPlan={monthlyPlan}
          onClose={() => setIsPlanningModalOpen(false)}
          onSubmit={handleSubmit}
          referenceMonthLabel={referenceMonthLabel}
        />
      )}
    </>
  );
}
