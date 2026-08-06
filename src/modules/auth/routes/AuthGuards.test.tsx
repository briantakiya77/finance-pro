import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { ProtectedRoute } from '@/modules/auth/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/modules/auth/routes/PublicOnlyRoute';
import { createMockSession, setMockSession } from '@/test/mocks/supabaseAuth';

function renderWithProviders(initialEntries: string[], routes: React.ReactNode) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>{routes}</MemoryRouter>
    </AuthProvider>
  );
}

describe('auth guards', () => {
  it('exibe loading durante inicializacao', () => {
    renderWithProviders(
      ['/'],
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Area privada</div>} />
        </Route>
      </Routes>
    );

    expect(screen.getByText('Carregando rota...')).toBeTruthy();
  });

  it('redireciona ProtectedRoute sem autenticacao para /login', async () => {
    setMockSession(null);

    renderWithProviders(
      ['/'],
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Area privada</div>} />
        </Route>
        <Route path="/login" element={<div>Tela de login</div>} />
      </Routes>
    );

    expect(await screen.findByText('Tela de login')).toBeTruthy();
  });

  it('permite ProtectedRoute autenticada', async () => {
    setMockSession(createMockSession());

    renderWithProviders(
      ['/'],
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Area privada</div>} />
        </Route>
      </Routes>
    );

    expect(await screen.findByText('Area privada')).toBeTruthy();
  });

  it('redireciona PublicOnlyRoute autenticada para a area privada', async () => {
    setMockSession(createMockSession());

    renderWithProviders(
      ['/login'],
      <Routes>
        <Route path="/" element={<div>Dashboard</div>} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <div>Login</div>
            </PublicOnlyRoute>
          }
        />
      </Routes>
    );

    expect(await screen.findByText('Dashboard')).toBeTruthy();
  });
});
