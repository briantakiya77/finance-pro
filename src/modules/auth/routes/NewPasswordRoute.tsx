import { Link } from 'react-router';

import { AuthPlaceholderPage } from '@/modules/auth/components/AuthPlaceholderPage';

export function NewPasswordRoute() {
  return (
    <AuthPlaceholderPage
      eyebrow="Nova senha"
      title="Defina uma nova senha"
      description="A arquitetura ja esta pronta para concluir a atualizacao de senha via Supabase Auth neste endereco. O formulario final entra na proxima fase."
      footer={
        <Link to="/login" className="text-sm text-accent transition hover:text-success">
          Ir para login
        </Link>
      }
    />
  );
}
