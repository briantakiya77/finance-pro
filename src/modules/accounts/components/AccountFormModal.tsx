import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { AccountIcon } from '@/modules/accounts/components/AccountIcon';
import { accountFormSchema } from '@/modules/accounts/schemas/accountSchema';
import {
  accountColorOptions,
  accountIconOptions,
  accountTypeOptions,
  type AccountFormValues,
  type AccountRow
} from '@/modules/accounts/types/accounts';
import {
  Button,
  Checkbox,
  FieldError,
  FieldLabel,
  Input,
  Modal,
  Select
} from '@/shared/components/ui';

type AccountFormModalProps = {
  account?: AccountRow | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: AccountFormValues) => void;
};

function mapAccountToFormValues(account?: AccountRow | null): AccountFormValues {
  return {
    name: account?.name ?? '',
    bank: account?.bank ?? '',
    type: account?.type ?? 'corrente',
    color: account?.color ?? accountColorOptions[0],
    icon: account?.icon ?? accountIconOptions[0].value,
    initialBalance: account?.initial_balance ?? '0.00',
    currentBalance: account?.current_balance ?? '0.00',
    isActive: account?.is_active ?? true,
    isPrimary: account?.is_primary ?? false
  };
}

export function AccountFormModal({
  account,
  isSubmitting,
  onClose,
  onSubmit
}: AccountFormModalProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: mapAccountToFormValues(account)
  });

  useEffect(() => {
    reset(mapAccountToFormValues(account));
  }, [account, reset]);

  const selectedColor = watch('color');
  const selectedIcon = watch('icon');
  const initialBalance = watch('initialBalance');

  useEffect(() => {
    if (!account) {
      setValue('currentBalance', initialBalance, { shouldValidate: true, shouldDirty: false });
    }
  }, [account, initialBalance, setValue]);

  return (
    <Modal
      title={account ? 'Editar conta bancaria' : 'Nova conta bancaria'}
      description="Organize os dados essenciais da sua conta."
      onClose={onClose}
    >
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-5 md:grid-cols-2">
          <FieldLabel className="space-y-2">
            <span>Nome</span>
            <Input {...register('name')} placeholder="Conta principal" />
            <FieldError>{errors.name?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Banco</span>
            <Input {...register('bank')} placeholder="Banco do Brasil" />
            <FieldError>{errors.bank?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Tipo</span>
            <Select {...register('type')}>
              {accountTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Icone</span>
            <div className="grid grid-cols-5 gap-2">
              {accountIconOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`rounded-control border p-2 transition-all duration-normal ${
                    selectedIcon === option.value
                      ? 'border-accent bg-accent-gradient-soft shadow-glow'
                      : 'border-border bg-background hover:bg-surface-hover'
                  }`}
                  onClick={() => setValue('icon', option.value, { shouldValidate: true })}
                >
                  <div className="flex justify-center">
                    <AccountIcon icon={option.value} color={selectedColor} />
                  </div>
                </button>
              ))}
            </div>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Saldo inicial</span>
            <Input {...register('initialBalance')} inputMode="decimal" placeholder="0.00" />
            <FieldError>{errors.initialBalance?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Saldo atual</span>
            <Input
              {...register('currentBalance')}
              inputMode="decimal"
              placeholder="0.00"
              readOnly
              className="cursor-not-allowed opacity-80"
            />
            <FieldError>{errors.currentBalance?.message}</FieldError>
            <p className="text-caption text-text-secondary">
              {account
                ? 'Saldo atual e controlado pelo sistema a partir do saldo inicial e dos lancamentos.'
                : 'Ao criar a conta, o saldo atual comeca igual ao saldo inicial.'}
            </p>
          </FieldLabel>
        </div>

        <div className="space-y-2">
          <span className="text-sm text-text-secondary">Cor</span>
          <div className="flex flex-wrap gap-3">
            {accountColorOptions.map((color) => (
              <button
                key={color}
                type="button"
                className={`h-10 w-10 rounded-full border-2 transition-all duration-normal ${
                  selectedColor === color
                    ? 'scale-105 border-text-primary shadow-glow'
                    : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => setValue('color', color, { shouldValidate: true })}
                aria-label={`Selecionar cor ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-control border border-border bg-background/70 px-4 py-3">
            <Checkbox {...register('isActive')} label="Conta ativa" />
          </div>

          <div className="rounded-control border border-border bg-background/70 px-4 py-3">
            <Checkbox {...register('isPrimary')} label="Definir como conta principal" />
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : account ? 'Salvar alteracoes' : 'Criar conta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
