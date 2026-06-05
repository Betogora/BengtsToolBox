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

const LazySchlagDenRabeGate = lazy(() =>
  import('@/apps/schlag-den-rabe').then(({ SchlagDenRabeGate }) => ({
    default: SchlagDenRabeGate,
  })),
)
const LazySchlagDenRabePage = lazy(() =>
  import('@/apps/schlag-den-rabe').then(({ SchlagDenRabePage }) => ({
    default: SchlagDenRabePage,
  })),
)
const LazyCoinflipPage = lazy(() =>
  import('@/apps/schlag-den-rabe/coinflip').then(({ CoinflipPage }) => ({
    default: CoinflipPage,
  })),
)

const schlagDenRabeFallback = (
  <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
    Lade Schlag den Raab...
  </div>
)

const schlagDenRabeElement = (
  <Suspense fallback={schlagDenRabeFallback}>
    <LazySchlagDenRabeGate>
      <LazySchlagDenRabePage />
    </LazySchlagDenRabeGate>
  </Suspense>
)

const coinflipElement = (
  <Suspense fallback={schlagDenRabeFallback}>
    <LazySchlagDenRabeGate>
      <LazyCoinflipPage />
    </LazySchlagDenRabeGate>
  </Suspense>
)

export function LazyAppRoute({ appId }: { appId: string }) {
  return lazyAppElements.get(appId) ?? null
}

export function LazySchlagDenRabeRoute({
  page,
}: {
  page: 'index' | 'coinflip'
}) {
  return page === 'coinflip' ? coinflipElement : schlagDenRabeElement
}
