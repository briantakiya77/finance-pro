import { Edit3, Pause, Play, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  useCancelRecurringTransactionMutation,
  useCreateRecurringTransactionMutation,
  usePauseRecurringTransactionMutation,
  useRecurringProjectionQuery,
  useRecurringTransactionsQuery,
  useResumeRecurringTransactionMutation,
  useUpdateRecurringTransactionMutation
} from '@/modules/recurring/queries/recurringQueries';
import { RecurringTransactionFormModal } from '@/modules/recurring/components/RecurringTransactionFormModal';
import type {
  RecurringTransactionFormValues,
  RecurringProjectionItem,
  RecurringTransactionWithRelations
} from '@/modules/recurring/types/recurring';
import {
  Badge,
  Button,
  Card,
  MenuItem,
  MenuSurface,
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

  return 'Nao foi possivel carregar as recorrencias no momento.';
}

function getStatusLabel(status: RecurringTransactionWithRelations['status']) {
  if (status === 'active') {
    return { label: 'Ativa', variant: 'success' as const };
  }

  if (status === 'paused') {
    return { label: 'Pausada', variant: 'warning' as const };
  }

  return { label: 'Cancelada', variant: 'default' as const };
}

function getFrequencyLabel(frequency: RecurringTransactionWithRelations['frequency']) {
  if (frequency === 'weekly') {
    return 'Semanal';
  }

  if (frequency === 'yearly') {
    return 'Anual';
  }

  return 'Mensal';
}

function getProjectionKindLabel(kind: RecurringProjectionItem['kind']) {
  if (kind === 'installment') {
    return 'Parcela';
  }

  if (kind === 'invoice') {
    return 'Fatura';
  }

  if (kind === 'goal') {
    return 'Meta';
  }

  return 'Recorrencia';
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

export default function RecurringPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransactionWithRelations | null>(
    null
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const recurringQuery = useRecurringTransactionsQuery();
  const projectionQuery = useRecurringProjectionQuery();
  const createRecurringMutation = useCreateRecurringTransactionMutation();
  const updateRecurringMutation = useUpdateRecurringTransactionMutation();
  const pauseRecurringMutation = usePauseRecurringTransactionMutation();
  const resumeRecurringMutation = useResumeRecurringTransactionMutation();
  const cancelRecurringMutation = useCancelRecurringTransactionMutation();

  const recurringTransactions = useMemo(() => recurringQuery.data ?? [], [recurringQuery.data]);
  const projection = useMemo(() => projectionQuery.data ?? [], [projectionQuery.data]);

  async function handleCreateRecurring(values: RecurringTransactionFormValues) {
    try {
      await createRecurringMutation.mutateAsync(values);
      setFeedbackMessage('Recorrencia criada com sucesso.');
      setIsCreateModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdateRecurring(values: RecurringTransactionFormValues) {
    if (!editingRecurring) {
      return;
    }

    try {
      await updateRecurringMutation.mutateAsync({
        recurringTransactionId: editingRecurring.id,
        values
      });
      setFeedbackMessage('Recorrencia atualizada com sucesso.');
      setEditingRecurring(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handlePauseRecurring(recurringTransactionId: string) {
    try {
      await pauseRecurringMutation.mutateAsync(recurringTransactionId);
      setFeedbackMessage('Recorrencia pausada.');
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleResumeRecurring(recurringTransactionId: string) {
    try {
      await resumeRecurringMutation.mutateAsync(recurringTransactionId);
      setFeedbackMessage('Recorrencia retomada sem gerar meses pausados.');
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleCancelRecurring(recurringTransactionId: string) {
    try {
      await cancelRecurringMutation.mutateAsync(recurringTransactionId);
      setFeedbackMessage('Recorrencia cancelada e historico preservado.');
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  if (recurringQuery.isLoading) {
    return <RouteLoading />;
  }

  if (recurringQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar as recorrencias">
          {getFriendlyErrorMessage(recurringQuery.error)}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Automacao financeira"
          title="Recorrencias"
          description="Controle despesas fixas, receitas recorrentes e compromissos futuros sem duplicar lancamentos."
          action={
            <Button
              type="button"
              icon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Nova Recorrencia
            </Button>
          }
        />

        {feedbackMessage && (
          <Toast variant="success" title="Tudo certo">
            {feedbackMessage}
          </Toast>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.65fr_1fr]">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-heading font-semibold text-text-primary">Regras mensais</h2>
                <p className="mt-1 text-caption text-text-secondary">
                  Receitas e despesas recorrentes com pausa, retomada e cancelamento seguros.
                </p>
              </div>
              <Badge variant="accent">{recurringTransactions.length} regras</Badge>
            </div>

            {recurringTransactions.length === 0 ? (
              <div className="mt-6 rounded-panel border border-border bg-background/50 px-5 py-10 text-center">
                <p className="text-lg font-semibold text-text-primary">Nenhuma recorrencia criada</p>
                <p className="mx-auto mt-2 max-w-xl text-body text-text-secondary">
                  Cadastre despesas fixas e receitas mensais sem alterar o saldo antes da data certa.
                </p>
                <Button className="mt-5" onClick={() => setIsCreateModalOpen(true)}>
                  Nova Recorrencia
                </Button>
              </div>
            ) : (
              <TableContainer className="mt-6">
                <Table>
                  <TableHead>
                    <tr>
                      <TableHeaderCell>Descricao</TableHeaderCell>
                      <TableHeaderCell>Frequencia</TableHeaderCell>
                      <TableHeaderCell>Conta</TableHeaderCell>
                      <TableHeaderCell>Categoria</TableHeaderCell>
                      <TableHeaderCell>Regra</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell className="text-right">Valor</TableHeaderCell>
                      <TableHeaderCell className="w-12" />
                    </tr>
                  </TableHead>
                  <TableBody>
                    {recurringTransactions.map((item) => {
                      const status = getStatusLabel(item.status);

                      return (
                        <tr key={item.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.description}</p>
                              <p className="mt-1 text-caption text-text-secondary">
                                {item.type === 'income' ? 'Receita mensal' : 'Despesa mensal'}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{getFrequencyLabel(item.frequency)}</TableCell>
                          <TableCell>
                            <div>
                              <p>{item.accounts?.name ?? 'Conta removida'}</p>
                              <p className="mt-1 text-caption text-text-secondary">
                                {item.accounts?.bank ?? ''}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{item.categories?.name ?? 'Sem categoria'}</TableCell>
                          <TableCell>
                            {item.frequency === 'weekly'
                              ? `Semana ancorada em ${formatDate(item.start_date)}`
                              : item.frequency === 'yearly'
                                ? `Todo ano no dia ${item.day_of_month}`
                                : `Todo dia ${item.day_of_month}`}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                          <TableCell
                            className={
                              item.type === 'income'
                                ? 'text-right font-semibold text-income'
                                : 'text-right font-semibold text-expense'
                            }
                          >
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="relative">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Acoes da recorrencia"
                              onClick={() =>
                                setOpenMenuId((current) => (current === item.id ? null : item.id))
                              }
                            >
                              <Edit3 size={16} />
                            </Button>
                            {openMenuId === item.id && (
                              <MenuSurface className="absolute right-3 top-12 z-20">
                                <MenuItem
                                  onClick={() => {
                                    setEditingRecurring(item);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <Edit3 size={16} /> Editar
                                </MenuItem>
                                {item.status === 'active' ? (
                                  <MenuItem
                                    onClick={() => {
                                      void handlePauseRecurring(item.id);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Pause size={16} /> Pausar
                                  </MenuItem>
                                ) : item.status === 'paused' ? (
                                  <MenuItem
                                    onClick={() => {
                                      void handleResumeRecurring(item.id);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Play size={16} /> Retomar
                                  </MenuItem>
                                ) : null}
                                {item.status !== 'cancelled' && (
                                  <MenuItem
                                    danger
                                    onClick={() => {
                                      void handleCancelRecurring(item.id);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <Trash2 size={16} /> Cancelar
                                  </MenuItem>
                                )}
                              </MenuSurface>
                            )}
                          </TableCell>
                        </tr>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>

          <Card className="p-5 sm:p-6" tone="secondary">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-heading font-semibold text-text-primary">Proximos compromissos</h2>
                <p className="mt-1 text-caption text-text-secondary">
                  Itens previstos sem materializar anos de transacoes futuras no banco.
                </p>
              </div>
              <Badge>{projection.length} itens</Badge>
            </div>

            <div className="mt-6 space-y-3">
              {projection.length === 0 ? (
                <p className="text-sm text-text-secondary">
                  Nenhum evento futuro preparado neste momento.
                </p>
              ) : (
                projection.map((item) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="rounded-control border border-border bg-background/60 px-4 py-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-text-primary">{item.title}</p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {getProjectionKindLabel(item.kind)} • {item.detail}
                        </p>
                      </div>
                      <p className="font-semibold text-text-primary">{formatCurrency(item.amount)}</p>
                    </div>
                    <p className="mt-3 text-caption text-text-secondary">
                      Previsto para {formatDate(item.scheduledDate)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </section>

      {(isCreateModalOpen || editingRecurring) && (
        <RecurringTransactionFormModal
          isSubmitting={createRecurringMutation.isPending || updateRecurringMutation.isPending}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingRecurring(null);
          }}
          onSubmit={editingRecurring ? handleUpdateRecurring : handleCreateRecurring}
          recurringTransaction={editingRecurring}
        />
      )}
    </>
  );
}
