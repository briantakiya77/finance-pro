import type { ReactNode } from 'react';

import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/modules/auth/hooks/useAuth';
import { RouteLoading } from '@/shared/components/ui/RouteLoading';

type ProtectedRouteProps = {
  children?: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <RouteLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ? <>{children}</> : <Outlet />;
}
