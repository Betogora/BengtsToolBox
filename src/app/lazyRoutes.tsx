import { lazy, Suspense } from 'react'

import { apps } from '@/apps/registry'

const lazyAppElements = new Map(
  apps.map((app) => {
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
const LazyCoinflipPage = lazy(() =>
  import('@/apps/schlag-den-raab/coinflip').then(({ CoinflipPage }) => ({
    default: CoinflipPage,
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

const coinflipElement = (
  <Suspense fallback={schlagDenRaabFallback}>
    <LazySchlagDenRaabGate>
      <LazyCoinflipPage />
    </LazySchlagDenRaabGate>
  </Suspense>
)

export function LazyAppRoute({ appId }: { appId: string }) {
  return lazyAppElements.get(appId) ?? null
}

export function LazySchlagDenRaabRoute({
  page,
}: {
  page: 'index' | 'coinflip'
}) {
  return page === 'coinflip' ? coinflipElement : schlagDenRaabElement
}
