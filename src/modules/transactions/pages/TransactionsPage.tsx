import { Edit3, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DeleteTransactionDialog } from '@/modules/transactions/components/DeleteTransactionDialog';
import { TransactionFormModal } from '@/modules/transactions/components/TransactionFormModal';
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useTransactionsQuery,
  useUpdateTransactionMutation
} from '@/modules/transactions/queries/transactionsQueries';
import type {
  TransactionFormValues,
  TransactionWithRelations
} from '@/modules/transactions/types/transactions';
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

  return 'Nao foi possivel carregar os lancamentos no momento.';
}

function formatTransactionDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function createClientMutationId() {
  return crypto.randomUUID();
}

export default function TransactionsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithRelations | null>(
    null
  );
  const [transactionPendingDelete, setTransactionPendingDelete] =
    useState<TransactionWithRelations | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const transactionsQuery = useTransactionsQuery({ limit: 25, page: 0 });
  const createTransactionMutation = useCreateTransactionMutation();
  const updateTransactionMutation = useUpdateTransactionMutation();
  const deleteTransactionMutation = useDeleteTransactionMutation();

  const transactions = useMemo(() => transactionsQuery.data ?? [], [transactionsQuery.data]);

  async function handleCreateTransaction(values: TransactionFormValues) {
    try {
      await createTransactionMutation.mutateAsync({
        clientMutationId: createClientMutationId(),
        values
      });
      setFeedbackMessage('Lancamento criado com sucesso.');
      setIsCreateModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdateTransaction(values: TransactionFormValues) {
    if (!editingTransaction) {
      return;
    }

    try {
      await updateTransactionMutation.mutateAsync({
        transactionId: editingTransaction.id,
        values
      });
      setFeedbackMessage('Lancamento atualizado com sucesso.');
      setEditingTransaction(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleDeleteTransaction() {
    if (!transactionPendingDelete) {
      return;
    }

    try {
      await deleteTransactionMutation.mutateAsync(transactionPendingDelete.id);
      setFeedbackMessage('Lancamento excluido e saldo revertido.');
      setTransactionPendingDelete(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  if (transactionsQuery.isLoading) {
    return <RouteLoading />;
  }

  if (transactionsQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar os lancamentos">
          {getFriendlyErrorMessage(transactionsQuery.error)}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Fluxo financeiro"
          title="Lancamentos"
          description="Registre receitas e despesas reais vinculadas as suas contas."
          action={
            <Button
              type="button"
              icon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Novo Lancamento
            </Button>
          }
        />

        {feedbackMessage && (
          <Toast variant="success" title="Tudo certo">
            {feedbackMessage}
          </Toast>
        )}

        {transactions.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
              <Plus size={22} />
            </div>
            <p className="mt-5 text-lg font-semibold text-text-primary">
              Nenhum lancamento cadastrado
            </p>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
              Crie uma receita ou despesa para atualizar os saldos de forma automatica.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
              Novo Lancamento
            </Button>
          </Card>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Descricao</TableHeaderCell>
                  <TableHeaderCell>Categoria</TableHeaderCell>
                  <TableHeaderCell>Conta</TableHeaderCell>
                  <TableHeaderCell>Data</TableHeaderCell>
                  <TableHeaderCell className="text-right">Valor</TableHeaderCell>
                  <TableHeaderCell className="w-12" />
                </tr>
              </TableHead>
              <TableBody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {transaction.categories ? (
                        <Badge variant={transaction.type === 'income' ? 'success' : 'danger'}>
                          {transaction.categories.name}
                        </Badge>
                      ) : (
                        <span className="text-text-secondary">Sem categoria</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{transaction.accounts?.name ?? 'Conta removida'}</p>
                        <p className="mt-1 text-caption text-text-secondary">
                          {transaction.accounts?.bank ?? ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{formatTransactionDate(transaction.transaction_date)}</TableCell>
                    <TableCell
                      className={
                        transaction.type === 'income'
                          ? 'text-right font-semibold text-income'
                          : 'text-right font-semibold text-expense'
                      }
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="relative">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Acoes do lancamento"
                        onClick={() =>
                          setOpenMenuId((current) =>
                            current === transaction.id ? null : transaction.id
                          )
                        }
                      >
                        <MoreVertical size={16} />
                      </Button>
                      {openMenuId === transaction.id && (
                        <MenuSurface className="absolute right-3 top-12 z-20">
                          <MenuItem
                            onClick={() => {
                              setEditingTransaction(transaction);
                              setOpenMenuId(null);
                            }}
                          >
                            <Edit3 size={16} /> Editar
                          </MenuItem>
                          <MenuItem
                            danger
                            onClick={() => {
                              setTransactionPendingDelete(transaction);
                              setOpenMenuId(null);
                            }}
                          >
                            <Trash2 size={16} /> Excluir
                          </MenuItem>
                        </MenuSurface>
                      )}
                    </TableCell>
                  </tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </section>

      {isCreateModalOpen && (
        <TransactionFormModal
          isSubmitting={createTransactionMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateTransaction}
        />
      )}

      {editingTransaction && (
        <TransactionFormModal
          transaction={editingTransaction}
          isSubmitting={updateTransactionMutation.isPending}
          onClose={() => setEditingTransaction(null)}
          onSubmit={handleUpdateTransaction}
        />
      )}

      {transactionPendingDelete && (
        <DeleteTransactionDialog
          description={transactionPendingDelete.description}
          isDeleting={deleteTransactionMutation.isPending}
          onCancel={() => setTransactionPendingDelete(null)}
          onConfirm={handleDeleteTransaction}
        />
      )}
    </>
  );
}
