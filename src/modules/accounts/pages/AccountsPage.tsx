import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AccountCard } from '@/modules/accounts/components/AccountCard';
import { AccountFormModal } from '@/modules/accounts/components/AccountFormModal';
import { DeleteAccountDialog } from '@/modules/accounts/components/DeleteAccountDialog';
import {
  useAccountsQuery,
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useSetPrimaryAccountMutation,
  useUpdateAccountMutation
} from '@/modules/accounts/queries/accountsQueries';
import type { AccountFormValues, AccountRow } from '@/modules/accounts/types/accounts';
import { Button, Card, PageHeader, RouteLoading, Toast } from '@/shared/components/ui';

function getFriendlyErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar as contas bancarias no momento.';
}

export default function AccountsPage() {
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [accountPendingDelete, setAccountPendingDelete] = useState<AccountRow | null>(null);
  const [feedback, setFeedback] = useState<{
    message: string;
    title: string;
    variant: 'danger' | 'success';
  } | null>(null);

  const accountsQuery = useAccountsQuery();
  const createAccountMutation = useCreateAccountMutation();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const setPrimaryAccountMutation = useSetPrimaryAccountMutation();

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data]);

  async function handleCreateAccount(values: AccountFormValues) {
    try {
      await createAccountMutation.mutateAsync(values);
      setFeedback({
        message: 'Conta criada com sucesso.',
        title: 'Tudo certo',
        variant: 'success'
      });
      setIsCreateModalOpen(false);
    } catch (error) {
      setFeedback({
        message: getFriendlyErrorMessage(error),
        title: 'Nao foi possivel concluir',
        variant: 'danger'
      });
    }
  }

  async function handleUpdateAccount(values: AccountFormValues) {
    if (!editingAccount) {
      return;
    }

    try {
      await updateAccountMutation.mutateAsync({
        accountId: editingAccount.id,
        values
      });
      setFeedback({
        message: 'Conta atualizada com sucesso.',
        title: 'Tudo certo',
        variant: 'success'
      });
      setEditingAccount(null);
    } catch (error) {
      setFeedback({
        message: getFriendlyErrorMessage(error),
        title: 'Nao foi possivel concluir',
        variant: 'danger'
      });
    }
  }

  async function handleDeleteAccount() {
    if (!accountPendingDelete) {
      return;
    }

    try {
      await deleteAccountMutation.mutateAsync(accountPendingDelete.id);
      setFeedback({
        message: 'Conta removida com exclusao logica.',
        title: 'Tudo certo',
        variant: 'success'
      });
      setAccountPendingDelete(null);
    } catch (error) {
      setFeedback({
        message: getFriendlyErrorMessage(error),
        title: 'Nao foi possivel concluir',
        variant: 'danger'
      });
    }
  }

  async function handleSetPrimaryAccount(account: AccountRow) {
    try {
      await setPrimaryAccountMutation.mutateAsync(account.id);
      setFeedback({
        message: 'Conta principal atualizada.',
        title: 'Tudo certo',
        variant: 'success'
      });
    } catch (error) {
      setFeedback({
        message: getFriendlyErrorMessage(error),
        title: 'Nao foi possivel concluir',
        variant: 'danger'
      });
    }
  }

  if (accountsQuery.isLoading) {
    return <RouteLoading />;
  }

  if (accountsQuery.isError) {
    return (
      <section className="mx-auto max-w-6xl">
        <Toast variant="danger" title="Nao foi possivel carregar as contas">
          {getFriendlyErrorMessage(accountsQuery.error)}
        </Toast>
      </section>
    );
  }

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-6 lg:gap-8">
        <PageHeader
          eyebrow="Patrimonio"
          title="Contas bancarias"
          description="Gerencie saldos, status e a conta principal com uma visao clara e segura."
          action={
            <Button
              type="button"
              icon={<Plus size={18} />}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Nova Conta
            </Button>
          }
        />

        {feedback && (
          <Toast variant={feedback.variant} title={feedback.title}>
            {feedback.message}
          </Toast>
        )}

        {accounts.length === 0 ? (
          <Card className="p-8 text-center sm:p-12">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-control bg-accent-gradient-soft text-accent">
              <Plus size={22} />
            </div>
            <p className="mt-5 text-lg font-semibold text-text-primary">Nenhuma conta cadastrada</p>
            <p className="mx-auto mt-3 max-w-xl text-body text-text-secondary">
              Crie sua primeira conta para manter os saldos organizados em um so lugar.
            </p>
            <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
              Nova Conta
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={setEditingAccount}
                onDelete={setAccountPendingDelete}
                onMarkPrimary={handleSetPrimaryAccount}
              />
            ))}
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <AccountFormModal
          isSubmitting={createAccountMutation.isPending}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAccount}
        />
      )}

      {editingAccount && (
        <AccountFormModal
          account={editingAccount}
          isSubmitting={updateAccountMutation.isPending}
          onClose={() => setEditingAccount(null)}
          onSubmit={handleUpdateAccount}
        />
      )}

      {accountPendingDelete && (
        <DeleteAccountDialog
          accountName={accountPendingDelete.name}
          isDeleting={deleteAccountMutation.isPending}
          onCancel={() => setAccountPendingDelete(null)}
          onConfirm={handleDeleteAccount}
        />
      )}
    </>
  );
}
