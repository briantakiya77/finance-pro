import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { AuthPageShell } from '@/modules/auth/components/AuthPageShell';
import { AuthStatusMessage } from '@/modules/auth/components/AuthStatusMessage';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { updatePasswordSchema } from '@/modules/auth/schemas/authSchemas';
import type { UpdatePasswordPayload } from '@/modules/auth/types/auth';
import { Button, FieldError, FieldLabel, Input } from '@/shared/components/ui';

export function NewPasswordRoute() {
  const navigate = useNavigate();
  const { updatePassword, signOut, session } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<UpdatePasswordPayload>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: ''
    }
  });

  async function onSubmit(values: UpdatePasswordPayload) {
    setSubmitError(null);
    const result = await updatePassword(values);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    await signOut();
    navigate('/login', {
      replace: true,
      state: {
        passwordResetSuccess: true
      }
    });
  }

  return (
    <AuthPageShell
      eyebrow="Nova senha"
      title="Defina uma nova senha"
      description="Conclua a redefinicao de senha usando a sessao de recuperacao aberta pelo link enviado por e-mail."
      sideNote={
        <div className="space-y-2 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Sessao de recuperacao</p>
          <p>
            Abra esta tela pelo link do e-mail do Supabase para que a sessao temporaria de
            recuperacao seja carregada antes da troca da senha.
          </p>
        </div>
      }
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Ir para login
        </Link>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-heading font-semibold text-text-primary">Atualizar senha</p>
          <p className="mt-2 text-body text-text-secondary">
            Escolha uma nova senha para concluir o fluxo iniciado no e-mail de recuperacao.
          </p>
        </div>

        {!session && (
          <AuthStatusMessage tone="info">
            Se voce ainda nao abriu o link do e-mail de recuperacao, faca isso primeiro. Sem a
            sessao temporaria, o Supabase nao consegue concluir a troca da senha.
          </AuthStatusMessage>
        )}

        {submitError && <AuthStatusMessage tone="error">{submitError}</AuthStatusMessage>}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FieldLabel className="space-y-2">
            <span>Nova senha</span>
            <Input
              {...register('password')}
              autoComplete="new-password"
              placeholder="Defina sua nova senha"
              type="password"
            />
            <FieldError>{errors.password?.message}</FieldError>
          </FieldLabel>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<KeyRound className="h-4 w-4" />}
          >
            {isSubmitting ? 'Salvando senha...' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
