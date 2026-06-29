import { createBrowserRouter } from 'react-router-dom'

import { apps } from '@/apps/registry'
import { LazyAppRoute, LazySchlagDenRaabRoute } from '@/app/lazyRoutes'
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
        path: 'schlag-den-raab',
        element: <LazySchlagDenRaabRoute page="index" />,
      },
      {
        path: 'schlag-den-raab/coinflip',
        element: <LazySchlagDenRaabRoute page="coinflip" />,
      },
      ...apps.map((app) => ({
        path: app.routePath,
        element: <LazyAppRoute appId={app.id} />,
      })),
    ],
  },
])
