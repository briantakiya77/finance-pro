import { Link } from 'react-router';

import { AuthPlaceholderPage } from '@/modules/auth/components/AuthPlaceholderPage';

export function ForgotPasswordRoute() {
  return (
    <AuthPlaceholderPage
      eyebrow="Recuperacao"
      title="Recupere sua senha"
      description="O fluxo tecnico de recuperacao ja aponta para /nova-senha usando o Supabase Auth. O formulario visual ainda sera implementado."
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Voltar para login
        </Link>
      }
    />
  );
}
