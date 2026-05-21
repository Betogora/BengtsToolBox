import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/components/layout/DashboardPage'
import { apps } from '@/apps/registry'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      ...apps.map((app) => ({
        path: app.routePath,
        element: <app.Page />,
      })),
    ],
  },
])
