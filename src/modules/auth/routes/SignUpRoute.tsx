import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { AuthPageShell } from '@/modules/auth/components/AuthPageShell';
import { AuthStatusMessage } from '@/modules/auth/components/AuthStatusMessage';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { authCredentialsSchema } from '@/modules/auth/schemas/authSchemas';
import type { AuthCredentials } from '@/modules/auth/types/auth';
import { Button, FieldError, FieldLabel, Input } from '@/shared/components/ui';

export function SignUpRoute() {
  const { signUp } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset
  } = useForm<AuthCredentials>({
    resolver: zodResolver(authCredentialsSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  async function onSubmit(values: AuthCredentials) {
    setSubmitError(null);
    setSuccessMessage(null);

    const result = await signUp(values);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    reset({ email: values.email, password: '' });
    setSuccessMessage(
      'Cadastro enviado com sucesso. Se a confirmacao de e-mail estiver ativa no Supabase, verifique sua caixa de entrada antes de entrar.'
    );
  }

  return (
    <AuthPageShell
      eyebrow="Cadastro inicial"
      title="Crie sua conta"
      description="Cadastre seu acesso principal com e-mail e senha. O fluxo respeita a configuracao de confirmacao de e-mail do seu projeto Supabase."
      sideNote={
        <div className="space-y-2 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Fluxo preparado para crescer</p>
          <p>
            Se o projeto exigir confirmacao por e-mail, o Supabase cria a conta e aguarda a
            validacao antes do primeiro acesso.
          </p>
        </div>
      }
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Ja tenho conta
        </Link>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-heading font-semibold text-text-primary">Criar acesso</p>
          <p className="mt-2 text-body text-text-secondary">
            Use um e-mail valido para receber a confirmacao, se ela estiver habilitada.
          </p>
        </div>

        {successMessage && <AuthStatusMessage tone="success">{successMessage}</AuthStatusMessage>}
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
              autoComplete="new-password"
              placeholder="Crie uma senha"
              type="password"
            />
            <FieldError>{errors.password?.message}</FieldError>
          </FieldLabel>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<UserPlus className="h-4 w-4" />}
          >
            {isSubmitting ? 'Criando conta...' : 'Criar conta'}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
