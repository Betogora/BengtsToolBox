import { lazy, Suspense } from 'react'

import { registeredApps } from '@/apps/registry'

const lazyAppElements = new Map(
  registeredApps.map((app) => {
    const Page = lazy(app.loadPage)

    return [
      app.id,
      <Suspense
        fallback={
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
            Lade {app.title}...
          </div>
        }
      >
        <Page />
      </Suspense>,
    ]
  }),
)

const LazySchlagDenRaabGate = lazy(() =>
  import('@/apps/schlag-den-raab').then(({ SchlagDenRaabGate }) => ({
    default: SchlagDenRaabGate,
  })),
)

const LazySchlagDenRaabPage = lazy(() =>
  import('@/apps/schlag-den-raab').then(({ SchlagDenRaabPage }) => ({
    default: SchlagDenRaabPage,
  })),
)

const schlagDenRaabFallback = (
  <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
    Lade Schlag den Raab...
  </div>
)

const schlagDenRaabElement = (
  <Suspense fallback={schlagDenRaabFallback}>
    <LazySchlagDenRaabGate>
      <LazySchlagDenRaabPage />
    </LazySchlagDenRaabGate>
  </Suspense>
)

export function LazyAppRoute({ appId }: { appId: string }) {
  return lazyAppElements.get(appId) ?? null
}

export function LazySchlagDenRaabRoute() {
  return schlagDenRaabElement
}
