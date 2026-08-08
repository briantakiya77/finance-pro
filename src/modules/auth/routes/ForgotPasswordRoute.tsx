import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { AuthPageShell } from '@/modules/auth/components/AuthPageShell';
import { AuthStatusMessage } from '@/modules/auth/components/AuthStatusMessage';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import { resetPasswordSchema } from '@/modules/auth/schemas/authSchemas';
import type { ResetPasswordPayload } from '@/modules/auth/types/auth';
import { Button, FieldError, FieldLabel, Input } from '@/shared/components/ui';

export function ForgotPasswordRoute() {
  const { resetPassword } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register
  } = useForm<ResetPasswordPayload>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  async function onSubmit(values: ResetPasswordPayload) {
    setSubmitError(null);
    setSuccessMessage(null);

    const result = await resetPassword(values);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    setSuccessMessage(
      'Se existir uma conta com esse e-mail, enviaremos um link de recuperacao para voce continuar em /nova-senha.'
    );
  }

  return (
    <AuthPageShell
      eyebrow="Recuperacao"
      title="Recupere sua senha"
      description="Solicite um link de recuperacao. O Supabase envia o e-mail usando o redirect configurado para a rota de nova senha."
      sideNote={
        <div className="space-y-2 text-sm text-text-secondary">
          <p className="font-semibold text-text-primary">Privacidade preservada</p>
          <p>
            O retorno dessa etapa nao confirma se o e-mail existe ou nao, seguindo a abordagem
            recomendada pelo Supabase para evitar enumeracao de usuarios.
          </p>
        </div>
      }
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Voltar para login
        </Link>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-heading font-semibold text-text-primary">Solicitar recuperacao</p>
          <p className="mt-2 text-body text-text-secondary">
            Informe seu e-mail de acesso para receber o link seguro de redefinicao.
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

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            icon={<Send className="h-4 w-4" />}
          >
            {isSubmitting ? 'Enviando link...' : 'Enviar link de recuperacao'}
          </Button>
        </form>
      </div>
    </AuthPageShell>
  );
}
