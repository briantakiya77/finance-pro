import { PencilLine, PiggyBank, Plus, Target, TrendingUp, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useAccountsQuery } from '@/modules/accounts/queries/accountsQueries';
import { FinancialGoalFormModal } from '@/modules/goals/components/FinancialGoalFormModal';
import { GoalProgressModal } from '@/modules/goals/components/GoalProgressModal';
import {
  useCancelFinancialGoalMutation,
  useCreateFinancialGoalMutation,
  useFinancialGoalsQuery,
  useGoalContributionsQuery,
  useUpdateFinancialGoalMutation,
  useUpdateGoalProgressMutation
} from '@/modules/goals/queries/goalsQueries';
import type {
  FinancialGoalFormValues,
  FinancialGoalRow,
  GoalProgressFormValues
} from '@/modules/goals/types/goals';
import { getProgressPercentage } from '@/modules/planning/services/planningService';
import {
  Badge,
  Button,
  Card,
  PageHeader,
  RouteLoading,
  Toast
} from '@/shared/components/ui';
import { formatCurrency } from '@/shared/utils/money';

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar as metas financeiras no momento.';
}

function formatGoalDate(value: string | null) {
  if (!value) {
    return 'Sem prazo definido';
  }

  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

function getGoalTypeLabel(type: FinancialGoalRow['type']) {
  if (type === 'emergency_fund') {
    return 'Reserva';
  }

  if (type === 'purchase') {
    return 'Compra';
  }

  if (type === 'investment') {
    return 'Investimento';
  }

  return 'Geral';
}

export default function GoalsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoalRow | null>(null);
  const [goalPendingProgress, setGoalPendingProgress] = useState<FinancialGoalRow | null>(null);
  const [goalPendingCancel, setGoalPendingCancel] = useState<FinancialGoalRow | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const goalsQuery = useFinancialGoalsQuery();
  const accountsQuery = useAccountsQuery();
  const createGoalMutation = useCreateFinancialGoalMutation();
  const updateGoalMutation = useUpdateFinancialGoalMutation();
  const progressGoalMutation = useUpdateGoalProgressMutation();
  const cancelGoalMutation = useCancelFinancialGoalMutation();
  const contributionsQuery = useGoalContributionsQuery(goalPendingProgress?.id ?? null);

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const emergencyGoal =
    goals.find((goal) => goal.type === 'emergency_fund' && goal.status !== 'cancelled') ?? null;
  const accounts = accountsQuery.data ?? [];

  async function handleCreateGoal(values: FinancialGoalFormValues) {
    try {
      await createGoalMutation.mutateAsync(values);
      setFeedbackMessage('Meta criada com sucesso.');
      setIsCreateModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdateGoal(values: FinancialGoalFormValues) {
    if (!editingGoal) {
      return;
    }

    try {
      await updateGoalMutation.mutateAsync({
        goalId: editingGoal.id,
        values
      });
      setFeedbackMessage('Meta atualizada com sucesso.');
      setEditingGoal(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdateProgress(values: GoalProgressFormValues) {
    if (!goalPendingProgress) {
      return;
    }

    try {
      await progressGoalMutation.mutateAsync({
        goalId: goalPendingProgress.id,
        values
      });
      setFeedbackMessage('Progresso registrado com sucesso.');
      setGoalPendingProgress(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleCancelGoal() {
    if (!goalPendingCancel) {
      return;
    }

    try {
      await cancelGoalMutation.mutateAsync(goalPendingCancel.id);
      setFeedbackMessage('Meta cancelada com sucesso.');
      setGoalPendingCancel(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  if (goalsQuery.isLoading) {
    return <RouteLoading />;
  }

  if (goalsQuery.isError || accountsQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar as metas">
          {getFriendlyErrorMessage(goalsQuery.error ?? accountsQuery.error)}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Metas"
          title="Metas financeiras"
          description="Acompanhe objetivos de curto e longo prazo sem gerar movimentacoes financeiras artificiais."
          action={
            <Button type="button" icon={<Plus size={18} />} onClick={() => setIsCreateModalOpen(true)}>
              Nova Meta
            </Button>
          }
        />

        {feedbackMessage && (
          <Toast variant="success" title="Tudo certo">
            {feedbackMessage}
          </Toast>
        )}

        {emergencyGoal ? (
          <Card className="p-5 sm:p-6" tone="secondary">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-caption text-text-secondary">Reserva de emergencia</p>
                <h2 className="mt-2 text-heading font-semibold text-text-primary">
                  {formatCurrency(emergencyGoal.current_amount)} / {formatCurrency(emergencyGoal.target_amount)}
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Faltam{' '}
                  {formatCurrency(
                    Math.max(
                      0,
                      Number(emergencyGoal.target_amount) - Number(emergencyGoal.current_amount)
                    )
                  )}
                  {emergencyGoal.target_months ? ` • horizonte de ${emergencyGoal.target_months} meses` : ''}
                </p>
              </div>
              <Badge variant={emergencyGoal.status === 'completed' ? 'success' : 'accent'}>
                {getProgressPercentage(emergencyGoal.current_amount, emergencyGoal.target_amount)}%
              </Badge>
            </div>
          </Card>
        ) : null}

        {goals.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
              <Target size={22} />
            </div>
            <p className="mt-5 text-lg font-semibold text-text-primary">Nenhuma meta cadastrada</p>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
              Crie metas de reserva, compra, viagem ou educacao para acompanhar o quanto voce ja separou.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
              Nova Meta
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {goals.map((goal) => {
              const percentage = getProgressPercentage(goal.current_amount, goal.target_amount);
              const remainingAmount = Math.max(
                0,
                Number(goal.target_amount) - Number(goal.current_amount)
              );

              return (
                <Card key={goal.id} className="p-5 sm:p-6" interactive>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <PiggyBank size={18} className="text-accent" />
                        <h2 className="text-heading font-semibold text-text-primary">{goal.name}</h2>
                      </div>
                      <p className="mt-2 text-caption text-text-secondary">
                        {getGoalTypeLabel(goal.type)} • Prazo: {formatGoalDate(goal.target_date)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        goal.status === 'completed'
                          ? 'success'
                          : goal.status === 'cancelled'
                            ? 'danger'
                            : 'accent'
                      }
                    >
                      {goal.status === 'completed'
                        ? 'Concluida'
                        : goal.status === 'cancelled'
                          ? 'Cancelada'
                          : 'Ativa'}
                    </Badge>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                      <p className="text-caption text-text-secondary">Valor atual</p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {formatCurrency(goal.current_amount)}
                      </p>
                    </div>
                    <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                      <p className="text-caption text-text-secondary">Objetivo</p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {formatCurrency(goal.target_amount)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                      <p className="text-caption text-text-secondary">Falta atingir</p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {formatCurrency(remainingAmount)}
                      </p>
                    </div>
                    <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                      <p className="text-caption text-text-secondary">Reserva recomendada</p>
                      <p className="mt-2 text-lg font-semibold text-text-primary">
                        {goal.target_months ? `${goal.target_months} meses` : 'Manual'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-caption text-text-secondary">Progresso</span>
                      <span className="text-sm font-medium text-text-primary">{percentage}%</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-accent-gradient"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {goal.notes ? (
                    <p className="mt-4 text-sm text-text-secondary">{goal.notes}</p>
                  ) : null}

                  <div className="mt-6 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<TrendingUp size={16} />}
                      onClick={() => setGoalPendingProgress(goal)}
                      disabled={goal.status !== 'active'}
                    >
                      Adicionar aporte
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      icon={<PencilLine size={16} />}
                      onClick={() => setEditingGoal(goal)}
                      disabled={goal.status === 'cancelled'}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      icon={<XCircle size={16} />}
                      onClick={() => setGoalPendingCancel(goal)}
                      disabled={goal.status !== 'active'}
                    >
                      Cancelar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <FinancialGoalFormModal
          isSubmitting={createGoalMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateGoal}
        />
      )}

      {editingGoal && (
        <FinancialGoalFormModal
          goal={editingGoal}
          isSubmitting={updateGoalMutation.isPending}
          onClose={() => setEditingGoal(null)}
          onSubmit={handleUpdateGoal}
        />
      )}

      {goalPendingProgress && (
        <GoalProgressModal
          accounts={accounts}
          goalName={goalPendingProgress.name}
          isSubmitting={progressGoalMutation.isPending}
          onClose={() => setGoalPendingProgress(null)}
          onSubmit={handleUpdateProgress}
        />
      )}

      {goalPendingProgress && contributionsQuery.data?.length ? (
        <Card className="fixed inset-x-4 top-24 z-40 mx-auto max-h-72 max-w-lg overflow-auto p-5 shadow-elevated xl:right-8 xl:left-auto xl:mx-0 xl:w-[28rem]">
          <p className="text-heading font-semibold text-text-primary">Aportes recentes</p>
          <div className="mt-4 space-y-3">
            {contributionsQuery.data.slice(0, 4).map((contribution) => (
              <div
                key={contribution.id}
                className="rounded-control border border-border bg-background/60 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {formatCurrency(contribution.amount)}
                  </span>
                  <span className="text-caption text-text-secondary">
                    {formatGoalDate(contribution.contribution_date)}
                  </span>
                </div>
                {contribution.description ? (
                  <p className="mt-2 text-caption text-text-secondary">{contribution.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {goalPendingCancel && (
        <Card className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-lg p-5 shadow-elevated xl:bottom-8">
          <p className="text-heading font-semibold text-text-primary">Cancelar meta</p>
          <p className="mt-2 text-sm text-text-secondary">
            A meta {goalPendingCancel.name} sera marcada como cancelada, preservando o historico.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setGoalPendingCancel(null)}>
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleCancelGoal}
              disabled={cancelGoalMutation.isPending}
            >
              {cancelGoalMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </div>
        </Card>
      )}
    </>
  );
}
