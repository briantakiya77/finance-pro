import type { PropsWithChildren } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from '@/modules/auth/components/AuthProvider';
import { queryClient } from '@/shared/lib/react-query';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
