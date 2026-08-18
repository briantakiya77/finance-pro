import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';

import { AuthProfileMenu } from '@/modules/auth/components/AuthProfileMenu';
import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { createMockSession, getSupabaseAuthMock, setMockSession } from '@/test/mocks/supabaseAuth';

describe('AuthProfileMenu', () => {
  it('executa logout e redireciona para o login', async () => {
    const authMock = getSupabaseAuthMock();
    setMockSession(createMockSession({ user: { email: 'logout@example.com' } as never }));

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route
              path="/"
              element={
                <div>
                  <AuthProfileMenu />
                  <div>Dashboard</div>
                </div>
              }
            />
            <Route path="/login" element={<div>Tela de login</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Dashboard')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir perfil' }));
    expect(screen.getByRole('menu')).toBeTruthy();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sair' }));

    await waitFor(() => {
      expect(authMock.signOut).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText('Tela de login')).toBeTruthy();
  });
});
