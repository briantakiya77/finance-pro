import { useContext } from 'react';

import { AuthContext } from '@/modules/auth/components/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider.');
  }

  return context;
}
