import type { PropsWithChildren } from 'react';
import { useEffect, useRef, useState } from 'react';

import { AuthContext } from '@/modules/auth/components/AuthContext';
import { authService } from '@/modules/auth/services/authService';
import type { AuthSession, AuthState } from '@/modules/auth/types/auth';
import { categoriesService } from '@/modules/categories/services/categoriesService';

const initialAuthState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isInitializing: true
};

function buildAuthState(session: AuthSession | null, isInitializing: boolean): AuthState {
  const user = session?.user ?? null;

  return {
    user,
    session,
    isAuthenticated: Boolean(user),
    isInitializing
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    async function loadSession() {
      const result = await authService.getCurrentSession();

      if (!isMountedRef.current) {
        return;
      }

      setAuthState(buildAuthState(result.data ?? null, false));
    }

    const subscription = authService.onAuthStateChange((_, session) => {
      if (!isMountedRef.current) {
        return;
      }

      setAuthState(buildAuthState(session, false));

      if (session?.user) {
        void categoriesService.ensureDefaultCategories();
      }
    });

    loadSession();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authState.isAuthenticated) {
      void categoriesService.ensureDefaultCategories();
    }
  }, [authState.isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        signIn: authService.signIn,
        signUp: authService.signUp,
        signOut: authService.signOut,
        resetPassword: authService.resetPassword,
        updatePassword: authService.updatePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
