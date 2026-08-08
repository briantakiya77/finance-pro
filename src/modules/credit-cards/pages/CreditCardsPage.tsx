import { CreditCard, Plus, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CreditCardFormModal } from '@/modules/credit-cards/components/CreditCardFormModal';
import { CreditCardPaymentModal } from '@/modules/credit-cards/components/CreditCardPaymentModal';
import { CreditCardPurchaseActionMenu } from '@/modules/credit-cards/components/CreditCardActionMenu';
import { CreditCardPurchaseModal } from '@/modules/credit-cards/components/CreditCardPurchaseModal';
import { CreditCardSummaryCard } from '@/modules/credit-cards/components/CreditCardSummaryCard';
import {
  DeleteCreditCardDialog,
  DeleteCreditCardPurchaseDialog
} from '@/modules/credit-cards/components/DeleteCreditCardDialog';
import {
  useCreateCreditCardMutation,
  useCreateCreditCardPurchaseMutation,
  useCreditCardDetailsQuery,
  useCreditCardsQuery,
  useDeleteCreditCardMutation,
  useDeleteCreditCardPurchaseMutation,
  usePayCreditCardInvoiceMutation,
  useUpdateCreditCardMutation,
  useUpdateCreditCardPurchaseMutation
} from '@/modules/credit-cards/queries/creditCardsQueries';
import {
  getInvoiceOutstandingAmount,
  getInvoiceStatus
} from '@/modules/credit-cards/services/creditCardBilling';
import type {
  CreditCardFormValues,
  CreditCardInvoiceDetail,
  CreditCardListItem,
  CreditCardPaymentFormValues,
  CreditCardPurchaseFormValues,
  CreditCardPurchaseWithRelations,
  CreditCardRow
} from '@/modules/credit-cards/types/creditCards';
import {
  Badge,
  Button,
  Card,
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

  return 'Nao foi possivel carregar os cartoes de credito no momento.';
}

function createClientMutationId() {
  return crypto.randomUUID();
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`)
  );
}

export default function CreditCardsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardRow | null>(null);
  const [cardPendingDelete, setCardPendingDelete] = useState<CreditCardListItem | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<CreditCardPurchaseWithRelations | null>(
    null
  );
  const [purchasePendingDelete, setPurchasePendingDelete] =
    useState<CreditCardPurchaseWithRelations | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<CreditCardInvoiceDetail | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const creditCardsQuery = useCreditCardsQuery();
  const createCardMutation = useCreateCreditCardMutation();
  const updateCardMutation = useUpdateCreditCardMutation();
  const deleteCardMutation = useDeleteCreditCardMutation();
  const createPurchaseMutation = useCreateCreditCardPurchaseMutation();
  const updatePurchaseMutation = useUpdateCreditCardPurchaseMutation();
  const deletePurchaseMutation = useDeleteCreditCardPurchaseMutation();
  const payInvoiceMutation = usePayCreditCardInvoiceMutation();

  const cards = useMemo(() => creditCardsQuery.data ?? [], [creditCardsQuery.data]);

  useEffect(() => {
    if (!cards.length) {
      setSelectedCardId(null);
      return;
    }

    setSelectedCardId((current) =>
      current && cards.some((card) => card.id === current) ? current : (cards[0]?.id ?? null)
    );
  }, [cards]);

  const cardDetailsQuery = useCreditCardDetailsQuery(selectedCardId);
  const selectedCardDetails = cardDetailsQuery.data;
  const invoices = useMemo(() => selectedCardDetails?.invoices ?? [], [selectedCardDetails]);

  useEffect(() => {
    if (!invoices.length) {
      setSelectedInvoiceId(null);
      return;
    }

    setSelectedInvoiceId((current) =>
      current && invoices.some((invoice) => invoice.id === current)
        ? current
        : (invoices[0]?.id ?? null)
    );
  }, [invoices]);

  const selectedInvoice =
    invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? invoices[0] ?? null;

  async function handleCreateCard(values: CreditCardFormValues) {
    try {
      await createCardMutation.mutateAsync(values);
      setFeedbackMessage('Cartao criado com sucesso.');
      setIsCreateModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdateCard(values: CreditCardFormValues) {
    if (!editingCard) {
      return;
    }

    try {
      await updateCardMutation.mutateAsync({
        cardId: editingCard.id,
        values
      });
      setFeedbackMessage('Cartao atualizado com sucesso.');
      setEditingCard(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleDeleteCard() {
    if (!cardPendingDelete) {
      return;
    }

    try {
      await deleteCardMutation.mutateAsync(cardPendingDelete.id);
      setFeedbackMessage('Cartao removido com exclusao logica.');
      setCardPendingDelete(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleCreatePurchase(values: CreditCardPurchaseFormValues) {
    try {
      await createPurchaseMutation.mutateAsync({
        clientMutationId: createClientMutationId(),
        values
      });
      setFeedbackMessage('Compra registrada com sucesso.');
      setIsPurchaseModalOpen(false);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleUpdatePurchase(values: CreditCardPurchaseFormValues) {
    if (!editingPurchase) {
      return;
    }

    try {
      await updatePurchaseMutation.mutateAsync({
        purchaseId: editingPurchase.id,
        values
      });
      setFeedbackMessage('Compra atualizada com sucesso.');
      setEditingPurchase(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handleDeletePurchase() {
    if (!purchasePendingDelete) {
      return;
    }

    try {
      await deletePurchaseMutation.mutateAsync(purchasePendingDelete.id);
      setFeedbackMessage('Compra excluida e valor revertido da fatura.');
      setPurchasePendingDelete(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  async function handlePayInvoice(values: CreditCardPaymentFormValues) {
    if (!paymentInvoice) {
      return;
    }

    try {
      await payInvoiceMutation.mutateAsync({
        clientMutationId: createClientMutationId(),
        invoiceId: paymentInvoice.id,
        values
      });
      setFeedbackMessage('Pagamento registrado com sucesso.');
      setPaymentInvoice(null);
    } catch (error) {
      setFeedbackMessage(getFriendlyErrorMessage(error));
    }
  }

  if (creditCardsQuery.isLoading) {
    return <RouteLoading />;
  }

  if (creditCardsQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar os cartoes">
          {getFriendlyErrorMessage(creditCardsQuery.error)}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Credito"
          title="Cartoes de credito"
          description="Acompanhe limite, faturas, compras e pagamentos sem duplicar despesas."
          action={
            <Button
              type="button"
              icon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Novo Cartao
            </Button>
          }
        />

        {feedbackMessage && (
          <Toast variant="success" title="Tudo certo">
            {feedbackMessage}
          </Toast>
        )}

        {cards.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
              <CreditCard size={22} />
            </div>
            <p className="mt-5 text-lg font-semibold text-text-primary">Nenhum cartao cadastrado</p>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
              Cadastre um cartao para controlar compras, faturas e limite disponivel em um unico
              fluxo.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
              Novo Cartao
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 xl:grid-cols-2">
              {cards.map((card) => (
                <CreditCardSummaryCard
                  key={card.id}
                  card={card}
                  isSelected={selectedCardId === card.id}
                  onDelete={setCardPendingDelete}
                  onEdit={setEditingCard}
                  onNewPurchase={(selectedCard) => {
                    setSelectedCardId(selectedCard.id);
                    setEditingPurchase(null);
                    setIsPurchaseModalOpen(true);
                  }}
                  onSelect={(selectedCard) => setSelectedCardId(selectedCard.id)}
                />
              ))}
            </div>

            {cardDetailsQuery.isLoading ? (
              <RouteLoading />
            ) : selectedCardDetails ? (
              <div className="grid gap-4 xl:grid-cols-[1.1fr_1.5fr]">
                <Card className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-heading font-semibold text-text-primary">
                        {selectedCardDetails.card.name}
                      </h2>
                      <p className="mt-1 text-caption text-text-secondary">
                        Limite disponivel {formatCurrency(selectedCardDetails.card.availableLimit)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      icon={<Wallet size={16} />}
                      onClick={() => setIsPurchaseModalOpen(true)}
                    >
                      Nova Compra
                    </Button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {invoices.map((invoice) => {
                      const status = getInvoiceStatus(invoice);
                      const outstanding = getInvoiceOutstandingAmount(invoice);

                      return (
                        <button
                          key={invoice.id}
                          type="button"
                          className={`rounded-panel border px-4 py-4 text-left transition-all duration-normal ${
                            selectedInvoice?.id === invoice.id
                              ? 'border-accent/50 bg-accent/10'
                              : 'border-border bg-background/60 hover:border-accent/30'
                          }`}
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-text-primary">
                                {formatDate(invoice.reference_month)}
                              </p>
                              <p className="mt-1 text-caption text-text-secondary">
                                Fecha em {formatDate(invoice.closing_date)} • Vence em{' '}
                                {formatDate(invoice.due_date)}
                              </p>
                            </div>
                            <Badge
                              variant={
                                status === 'paid'
                                  ? 'success'
                                  : status === 'closed'
                                    ? 'warning'
                                    : 'accent'
                              }
                            >
                              {status === 'paid'
                                ? 'Pago'
                                : status === 'closed'
                                  ? 'Fechado'
                                  : 'Aberto'}
                            </Badge>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-caption text-text-secondary">Total</p>
                              <p className="mt-1 font-semibold text-text-primary">
                                {formatCurrency(invoice.total_amount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-caption text-text-secondary">Em aberto</p>
                              <p className="mt-1 font-semibold text-expense">
                                {formatCurrency(outstanding)}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-heading font-semibold text-text-primary">
                          Fatura selecionada
                        </h2>
                        <p className="mt-1 text-caption text-text-secondary">
                          {selectedInvoice
                            ? `Competencia ${formatDate(selectedInvoice.reference_month)}`
                            : 'Selecione uma fatura'}
                        </p>
                      </div>
                      {selectedInvoice && (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setPaymentInvoice(selectedInvoice)}
                        >
                          Pagar Fatura
                        </Button>
                      )}
                    </div>

                    {selectedInvoice ? (
                      <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                          <p className="text-caption text-text-secondary">Total</p>
                          <p className="mt-2 text-lg font-semibold text-text-primary">
                            {formatCurrency(selectedInvoice.total_amount)}
                          </p>
                        </div>
                        <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                          <p className="text-caption text-text-secondary">Pago</p>
                          <p className="mt-2 text-lg font-semibold text-income">
                            {formatCurrency(selectedInvoice.paid_amount)}
                          </p>
                        </div>
                        <div className="rounded-control border border-border bg-background/60 px-4 py-4">
                          <p className="text-caption text-text-secondary">Restante</p>
                          <p className="mt-2 text-lg font-semibold text-expense">
                            {formatCurrency(getInvoiceOutstandingAmount(selectedInvoice))}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-6 text-sm text-text-secondary">
                        Escolha uma fatura para visualizar compras e pagamentos.
                      </p>
                    )}
                  </Card>

                  <Card className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-heading font-semibold text-text-primary">
                          Compras da fatura
                        </h2>
                        <p className="mt-1 text-caption text-text-secondary">
                          Despesas reconhecidas na data da compra.
                        </p>
                      </div>
                    </div>

                    {selectedInvoice?.purchases.length ? (
                      <TableContainer className="mt-6">
                        <Table>
                          <TableHead>
                            <tr>
                              <TableHeaderCell>Descricao</TableHeaderCell>
                              <TableHeaderCell>Categoria</TableHeaderCell>
                              <TableHeaderCell>Data</TableHeaderCell>
                              <TableHeaderCell className="text-right">Valor</TableHeaderCell>
                              <TableHeaderCell className="w-12" />
                            </tr>
                          </TableHead>
                          <TableBody>
                            {selectedInvoice.purchases.map((purchase) => (
                              <tr key={purchase.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{purchase.description}</p>
                                    {purchase.notes && (
                                      <p className="mt-1 text-caption text-text-secondary">
                                        {purchase.notes}
                                      </p>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {purchase.categories?.name ?? 'Sem categoria'}
                                </TableCell>
                                <TableCell>{formatDate(purchase.purchase_date)}</TableCell>
                                <TableCell className="text-right font-semibold text-expense">
                                  {formatCurrency(purchase.amount)}
                                </TableCell>
                                <TableCell>
                                  <CreditCardPurchaseActionMenu
                                    onDelete={() => setPurchasePendingDelete(purchase)}
                                    onEdit={() => setEditingPurchase(purchase)}
                                  />
                                </TableCell>
                              </tr>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <p className="mt-6 text-sm text-text-secondary">
                        Nenhuma compra encontrada para esta fatura.
                      </p>
                    )}
                  </Card>

                  <Card className="p-5 sm:p-6">
                    <h2 className="text-heading font-semibold text-text-primary">Pagamentos</h2>
                    <p className="mt-1 text-caption text-text-secondary">
                      Liquidacoes auditaveis que nao geram nova despesa.
                    </p>

                    {selectedInvoice?.payments.length ? (
                      <div className="mt-6 space-y-3">
                        {selectedInvoice.payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex flex-col gap-3 rounded-control border border-border bg-background/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div>
                              <p className="font-medium text-text-primary">
                                {payment.accounts?.name ?? 'Conta removida'}
                              </p>
                              <p className="mt-1 text-caption text-text-secondary">
                                {payment.accounts?.bank ?? 'Conta sem banco'} •{' '}
                                {new Intl.DateTimeFormat('pt-BR').format(new Date(payment.paid_at))}
                              </p>
                            </div>
                            <p className="font-semibold text-text-primary">
                              {formatCurrency(payment.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-6 text-sm text-text-secondary">
                        Nenhum pagamento registrado para esta fatura.
                      </p>
                    )}
                  </Card>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {isCreateModalOpen && (
        <CreditCardFormModal
          isSubmitting={createCardMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateCard}
        />
      )}

      {editingCard && (
        <CreditCardFormModal
          card={editingCard}
          isSubmitting={updateCardMutation.isPending}
          onClose={() => setEditingCard(null)}
          onSubmit={handleUpdateCard}
        />
      )}

      {(isPurchaseModalOpen || editingPurchase) && (
        <CreditCardPurchaseModal
          cards={cards}
          isSubmitting={createPurchaseMutation.isPending || updatePurchaseMutation.isPending}
          onClose={() => {
            setIsPurchaseModalOpen(false);
            setEditingPurchase(null);
          }}
          onSubmit={editingPurchase ? handleUpdatePurchase : handleCreatePurchase}
          purchase={editingPurchase}
          selectedCardId={selectedCardId}
        />
      )}

      {paymentInvoice && (
        <CreditCardPaymentModal
          invoice={paymentInvoice}
          isSubmitting={payInvoiceMutation.isPending}
          onClose={() => setPaymentInvoice(null)}
          onSubmit={handlePayInvoice}
        />
      )}

      {cardPendingDelete && (
        <DeleteCreditCardDialog
          cardName={cardPendingDelete.name}
          isDeleting={deleteCardMutation.isPending}
          onCancel={() => setCardPendingDelete(null)}
          onConfirm={handleDeleteCard}
        />
      )}

      {purchasePendingDelete && (
        <DeleteCreditCardPurchaseDialog
          description={purchasePendingDelete.description}
          isDeleting={deletePurchaseMutation.isPending}
          onCancel={() => setPurchasePendingDelete(null)}
          onConfirm={handleDeletePurchase}
        />
      )}
    </>
  );
}
