import { createBrowserRouter } from 'react-router-dom'

import { appRoutes } from '@/apps/registry'
import { LazyAppRoute, LazySchlagDenRabeRoute } from '@/app/lazyRoutes'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/components/layout/DashboardPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'schlag-den-rabe',
        element: <LazySchlagDenRabeRoute />,
      },
      ...appRoutes.map((route) => ({
        path: route.path,
        element: <LazyAppRoute appId={route.appId} />,
      })),
    ],
  },
])
