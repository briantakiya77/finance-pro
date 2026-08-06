import { Building2, Star } from 'lucide-react';

import { AccountsActionMenu } from '@/modules/accounts/components/AccountsActionMenu';
import { AccountIcon } from '@/modules/accounts/components/AccountIcon';
import { AccountStatusBadge } from '@/modules/accounts/components/AccountStatusBadge';
import { accountTypeOptions, type AccountRow } from '@/modules/accounts/types/accounts';
import { Card } from '@/shared/components/ui';

type AccountCardProps = {
  account: AccountRow;
  onEdit: (account: AccountRow) => void;
  onDelete: (account: AccountRow) => void;
  onMarkPrimary: (account: AccountRow) => void;
};

function formatCurrency(value: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value));
}

function getAccountTypeLabel(type: AccountRow['type']) {
  return accountTypeOptions.find((option) => option.value === type)?.label ?? type;
}

export function AccountCard({ account, onEdit, onDelete, onMarkPrimary }: AccountCardProps) {
  return (
    <Card className="p-5 sm:p-6" interactive>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <AccountIcon icon={account.icon} color={account.color} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-text-primary">{account.name}</h2>
              {account.is_primary && <AccountStatusBadge label="Principal" variant="success" />}
              {!account.is_active && <AccountStatusBadge label="Inativa" variant="warning" />}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-text-secondary">
              <span className="inline-flex items-center gap-2">
                <Building2 size={15} />
                {account.bank}
              </span>
              <span>{getAccountTypeLabel(account.type)}</span>
            </div>
          </div>
        </div>

        <AccountsActionMenu
          canMarkPrimary={!account.is_primary}
          onEdit={() => onEdit(account)}
          onDelete={() => onDelete(account)}
          onMarkPrimary={() => onMarkPrimary(account)}
        />
      </div>

      <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Saldo atual</p>
          <p className="mt-2 text-2xl font-semibold text-text-primary">
            {formatCurrency(account.current_balance)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Saldo inicial</p>
          <p className="mt-2 text-base font-medium text-text-secondary">
            {formatCurrency(account.initial_balance)}
          </p>
        </div>
      </div>

      {account.is_primary && (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-success">
          <Star size={16} />
          Conta principal ativa para operacoes futuras
        </div>
      )}
    </Card>
  );
}
