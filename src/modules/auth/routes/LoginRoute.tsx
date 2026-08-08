import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router';

import { AuthPageShell } from '@/modules/auth/components/AuthPageShell';
import { AuthStatusMessage } from '@/modules/auth/components/AuthStatusMessage';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { authCredentialsSchema } from '@/modules/auth/schemas/authSchemas';
import type { AuthCredentials } from '@/modules/auth/types/auth';
import { Button, FieldError, FieldLabel, Input } from '@/shared/components/ui';

type LoginRouteState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
  passwordResetSuccess?: boolean;
};

function getRequestedDestination(state: LoginRouteState | null | undefined) {
  if (!state?.from?.pathname) {
    return '/';
  }

  return `${state.from.pathname}${state.from.search ?? ''}${state.from.hash ?? ''}`;
}

export function LoginRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const requestedPath = getRequestedDestination(location.state as LoginRouteState | null);
  const passwordResetSuccess =
    Boolean(location.state) &&
    typeof location.state === 'object' &&
    'passwordResetSuccess' in location.state &&
    Boolean(location.state.passwordResetSuccess);

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<AuthCredentials>({
    resolver: zodResolver(authCredentialsSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  async function onSubmit(values: AuthCredentials) {
    setSubmitError(null);
    const result = await signIn(values);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    navigate(requestedPath, { replace: true });
  }

  return (
    <AuthPageShell
      eyebrow="Acesso seguro"
      title="Entre no Finance Pro"
      description="Acesse sua area segura com e-mail e senha. O fluxo usa a sessao global do Supabase Auth e preserva o destino solicitado apos a autenticacao."
      sideNote={
        <div className="space-y-2 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Sessao protegida</p>
          <p>
            O aplicativo redireciona voce de volta para a rota solicitada apos o login e mantém a
            sessao sincronizada entre recarregamentos.
          </p>
        </div>
      }
      footer={
        <div className="space-y-3 text-sm text-text-secondary">
          <p>Destino preservado apos o login: {requestedPath}</p>
          <Link to="/esqueci-senha" className="text-accent transition hover:text-success">
            Esqueci minha senha
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-heading font-semibold text-text-primary">Entrar com e-mail</p>
          <p className="mt-2 text-body text-text-secondary">
            Use suas credenciais para acessar o ambiente principal.
          </p>
        </div>

        {passwordResetSuccess && (
          <AuthStatusMessage tone="success">
            Sua senha foi atualizada. Entre novamente com a nova credencial.
          </AuthStatusMessage>
        )}

        {submitError && <AuthStatusMessage tone="error">{submitError}</AuthStatusMessage>}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <FieldLabel className="space-y-2">
            <span>E-mail</span>
            <Input
              {...register('email')}
              autoComplete="email"
              placeholder="voce@empresa.com"
              type="email"
            />
            <FieldError>{errors.email?.message}</FieldError>
          </FieldLabel>

          <FieldLabel className="space-y-2">
            <span>Senha</span>
            <Input
              {...register('password')}
              autoComplete="current-password"
              placeholder="Sua senha"
              type="password"
            />
            <FieldError>{errors.password?.message}</FieldError>
          </FieldLabel>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<LogIn className="h-4 w-4" />}
          >
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
