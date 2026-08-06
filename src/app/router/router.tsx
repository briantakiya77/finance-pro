import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@/app/layouts/AppLayout';
import { NotFoundPage } from '@/app/router/NotFoundPage';
import { RouteLoading } from '@/shared/components/ui/RouteLoading';

const DashboardPage = lazy(() => import('@/modules/dashboard/pages/DashboardPage'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<RouteLoading />}>
            <DashboardPage />
          </Suspense>
        )
      }
    ]
  }
]);
