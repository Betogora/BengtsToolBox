import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/components/layout/DashboardPage'
import { apps, type HubApp } from '@/apps/registry'
import { CoinflipPage } from '@/apps/schlag-den-rabe/coinflip'
import {
  SchlagDenRabeGate,
  SchlagDenRabePage,
} from '@/apps/schlag-den-rabe'

function LazyAppRoute({ app }: { app: HubApp }) {
  const Page = lazy(app.loadPage)

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
          Lade {app.title}...
        </div>
      }
    >
      <Page />
    </Suspense>
  )
}

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
        element: <LazyAppRoute app={app} />,
      })),
    ],
  },
])
