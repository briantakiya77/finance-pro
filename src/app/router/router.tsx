import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@/app/layouts/AppLayout';
import { NotFoundPage } from '@/app/router/NotFoundPage';
import { ForgotPasswordRoute } from '@/modules/auth/routes/ForgotPasswordRoute';
import { LoginRoute } from '@/modules/auth/routes/LoginRoute';
import { NewPasswordRoute } from '@/modules/auth/routes/NewPasswordRoute';
import { ProtectedRoute } from '@/modules/auth/routes/ProtectedRoute';
import { PublicOnlyRoute } from '@/modules/auth/routes/PublicOnlyRoute';
import { SignUpRoute } from '@/modules/auth/routes/SignUpRoute';
import { RouteLoading } from '@/shared/components/ui/RouteLoading';

const AccountsPage = lazy(() => import('@/modules/accounts/pages/AccountsPage'));
const CreditCardsPage = lazy(() => import('@/modules/credit-cards/pages/CreditCardsPage'));
const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));
const RecurringPage = lazy(() => import('@/modules/recurring/pages/RecurringPage'));
const TransactionsPage = lazy(() => import('@/modules/transactions/pages/TransactionsPage'));

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginRoute />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/cadastro',
    element: (
      <PublicOnlyRoute>
        <SignUpRoute />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/esqueci-senha',
    element: (
      <PublicOnlyRoute>
        <ForgotPasswordRoute />
      </PublicOnlyRoute>
    )
  },
  {
    path: '/nova-senha',
    element: <NewPasswordRoute />
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteLoading />}>
            <DashboardPage />
          </Suspense>
        )
      },
      {
        path: 'contas',
        element: (
          <Suspense fallback={<RouteLoading />}>
            <AccountsPage />
          </Suspense>
        )
      },
      {
        path: 'lancamentos',
        element: (
          <Suspense fallback={<RouteLoading />}>
            <TransactionsPage />
          </Suspense>
        )
      },
      {
        path: 'cartoes',
        element: (
          <Suspense fallback={<RouteLoading />}>
            <CreditCardsPage />
          </Suspense>
        )
      },
      {
        path: 'recorrencias',
        element: (
          <Suspense fallback={<RouteLoading />}>
            <RecurringPage />
          </Suspense>
        )
      }
    ]
  }
]);
