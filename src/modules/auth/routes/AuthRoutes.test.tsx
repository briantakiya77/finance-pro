import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { ForgotPasswordRoute } from '@/modules/auth/routes/ForgotPasswordRoute';
import { LoginRoute } from '@/modules/auth/routes/LoginRoute';
import { NewPasswordRoute } from '@/modules/auth/routes/NewPasswordRoute';
import { SignUpRoute } from '@/modules/auth/routes/SignUpRoute';
import {
  createMockSession,
  getSupabaseAuthMock,
  setMockSession
} from '@/test/mocks/supabaseAuth';

type TestInitialEntry =
  | string
  | {
      pathname: string;
      search?: string;
      hash?: string;
      state?: unknown;
    };

function renderAuthRoute(initialEntries: TestInitialEntry[], routes: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries as string[]}>{routes}</MemoryRouter>
    </AuthProvider>
  );
}

describe('auth routes', () => {
  it('submete login e navega para o destino original', async () => {
    const authMock = getSupabaseAuthMock();
    setMockSession(createMockSession());

    renderAuthRoute(
      [
        {
          pathname: '/login',
          state: {
            from: {
              pathname: '/contas'
            }
          }
        }
      ],
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/contas" element={<div>Minhas contas</div>} />
      </Routes>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'brian@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: '123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(authMock.signInWithPassword).toHaveBeenCalledWith({
        email: 'brian@example.com',
        password: '123456'
      });
    });

    expect(await screen.findByText('Minhas contas')).toBeTruthy();
  });

  it('exibe sucesso ao solicitar recuperacao de senha', async () => {
    renderAuthRoute(
      ['/esqueci-senha'],
      <Routes>
        <Route path="/esqueci-senha" element={<ForgotPasswordRoute />} />
      </Routes>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'brian@example.com' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar link de recuperacao' }));

    expect(
      await screen.findByText(/Se existir uma conta com esse e-mail/i)
    ).toBeTruthy();
  });

  it('exibe sucesso ao criar conta', async () => {
    renderAuthRoute(
      ['/cadastro'],
      <Routes>
        <Route path="/cadastro" element={<SignUpRoute />} />
      </Routes>
    );

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'novo@example.com' }
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: '123456' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(await screen.findByText(/Cadastro enviado com sucesso/i)).toBeTruthy();
  });

  it('atualiza a senha e retorna ao login', async () => {
    setMockSession(createMockSession());

    renderAuthRoute(
      ['/nova-senha'],
      <Routes>
        <Route path="/nova-senha" element={<NewPasswordRoute />} />
        <Route path="/login" element={<LoginRoute />} />
      </Routes>
    );

    fireEvent.change(screen.getByLabelText('Nova senha'), {
      target: { value: '654321' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar nova senha' }));

    expect(
      await screen.findByText('Sua senha foi atualizada. Entre novamente com a nova credencial.')
    ).toBeTruthy();
  });
});
