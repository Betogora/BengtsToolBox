import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/components/layout/DashboardPage'
import { apps } from '@/apps/registry'
import { CoinflipPage } from '@/apps/schlag-den-rabe/coinflip'
import {
  SchlagDenRabeGate,
  SchlagDenRabePage,
} from '@/apps/schlag-den-rabe'

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
        element: (
          <SchlagDenRabeGate>
            <SchlagDenRabePage />
          </SchlagDenRabeGate>
        ),
      },
      {
        path: 'schlag-den-rabe/coinflip',
        element: (
          <SchlagDenRabeGate>
            <CoinflipPage />
          </SchlagDenRabeGate>
        ),
      },
      ...apps.map((app) => ({
        path: app.routePath,
        element: <app.Page />,
      })),
    ],
  },
])
