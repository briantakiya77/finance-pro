import { Link } from 'react-router';

import { AuthPlaceholderPage } from '@/modules/auth/components/AuthPlaceholderPage';

export function SignUpRoute() {
  return (
    <AuthPlaceholderPage
      eyebrow="Cadastro inicial"
      title="Crie sua conta"
      description="A base tecnica para cadastro com e-mail e senha ja foi preparada sobre o cliente unico do Supabase. O formulario completo sera implementado na proxima etapa."
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Ja tenho conta
        </Link>
      }
    />
  );
}
