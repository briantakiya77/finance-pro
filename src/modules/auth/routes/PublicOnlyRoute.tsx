import type { ReactNode } from 'react';

import { Navigate, Outlet, useLocation } from 'react-router';

import { useAuth } from '@/modules/auth/hooks/useAuth';
import { RouteLoading } from '@/shared/components/ui/RouteLoading';

type PublicOnlyRouteProps = {
  children?: ReactNode;
};

function getRedirectDestination(location: ReturnType<typeof useLocation>) {
  if (
    typeof location.state === 'object' &&
    location.state &&
    'from' in location.state &&
    location.state.from &&
    typeof location.state.from === 'object' &&
    'pathname' in location.state.from
  ) {
    const pathname = location.state.from.pathname ?? '/';
    const search = 'search' in location.state.from ? (location.state.from.search ?? '') : '';
    const hash = 'hash' in location.state.from ? (location.state.from.hash ?? '') : '';
    const destination = `${pathname}${search}${hash}`;

    return destination === location.pathname ? '/' : destination;
  }

  return '/';
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return <RouteLoading />;
  }

  if (isAuthenticated) {
    return <Navigate to={getRedirectDestination(location)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
