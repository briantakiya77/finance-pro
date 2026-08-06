import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { useAuth } from '@/modules/auth/hooks/useAuth';
import {
  createMockSession,
  emitAuthStateChange,
  getLastUnsubscribeSpy,
  setMockSession
} from '@/test/mocks/supabaseAuth';

function AuthStateProbe() {
  const { isAuthenticated, isInitializing, session, user } = useAuth();

  return (
    <div>
      <span>{isInitializing ? 'initializing' : 'ready'}</span>
      <span>{isAuthenticated ? 'authenticated' : 'guest'}</span>
      <span>{session ? 'session-present' : 'session-missing'}</span>
      <span>{user?.email ?? 'anonymous'}</span>
    </div>
  );
}

describe('AuthProvider', () => {
  it('carrega sessao inicial sem usuario', async () => {
    setMockSession(null);

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    expect(await screen.findByText('ready')).toBeTruthy();
    expect(screen.getByText('guest')).toBeTruthy();
    expect(screen.getByText('session-missing')).toBeTruthy();
  });

  it('carrega sessao inicial autenticada', async () => {
    setMockSession(createMockSession());

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    expect(await screen.findByText('authenticated')).toBeTruthy();
    expect(screen.getByText('session-present')).toBeTruthy();
    expect(screen.getByText('brian@example.com')).toBeTruthy();
  });

  it('atualiza ao receber evento de login', async () => {
    setMockSession(null);

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await screen.findByText('ready');

    emitAuthStateChange(
      'SIGNED_IN',
      createMockSession({ user: { email: 'login@example.com' } as never })
    );

    expect(await screen.findByText('authenticated')).toBeTruthy();
    expect(screen.getByText('login@example.com')).toBeTruthy();
  });

  it('atualiza ao receber evento de logout', async () => {
    setMockSession(createMockSession());

    render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await screen.findByText('authenticated');

    emitAuthStateChange('SIGNED_OUT', null);

    expect(await screen.findByText('guest')).toBeTruthy();
    expect(screen.getByText('session-missing')).toBeTruthy();
  });

  it('remove a subscription no cleanup', async () => {
    const rendered = render(
      <AuthProvider>
        <AuthStateProbe />
      </AuthProvider>
    );

    await screen.findByText('ready');

    const unsubscribeSpy = getLastUnsubscribeSpy();

    rendered.unmount();

    await waitFor(() => {
      expect(unsubscribeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
