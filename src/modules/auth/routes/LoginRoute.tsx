import { Link, useLocation } from 'react-router';

import { AuthPlaceholderPage } from '@/modules/auth/components/AuthPlaceholderPage';

export function LoginRoute() {
  const location = useLocation();
  const requestedPath =
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    location.state.from &&
    typeof location.state.from === 'object' &&
    'pathname' in location.state.from
      ? location.state.from.pathname
      : '/';

  return (
    <AuthPlaceholderPage
      eyebrow="Acesso seguro"
      title="Entre no Finance Pro"
      description="A autenticacao ja esta integrada ao Supabase Auth. Nesta fase, a rota de entrada existe para suportar a fundacao tecnica e os proximos formularios."
      footer={
        <div className="space-y-3 text-sm text-text-secondary">
          <p>Destino preservado apos o login: {requestedPath}</p>
          <Link to="/esqueci-senha" className="text-accent transition hover:text-success">
            Esqueci minha senha
          </Link>
        </div>
      }
    />
  );
}
