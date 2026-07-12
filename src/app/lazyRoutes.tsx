import { lazy, Suspense } from 'react'

import { registeredApps } from '@/apps/registry'
import { useI18n } from '@/lib/i18n'

const lazyAppElements = new Map(
  registeredApps.map((app) => {
    const Page = lazy(app.loadPage)

    return [app.id, <Page />] as const
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

const LazyLobbyDirectoryPage = lazy(() =>
  import('@/lobbies/LobbyDirectoryPage').then(({ LobbyDirectoryPage }) => ({
    default: LobbyDirectoryPage,
  })),
)

const LazyLobbyAdminPage = lazy(() =>
  import('@/lobbies/LobbyAdminPage').then(({ LobbyAdminPage }) => ({
    default: LobbyAdminPage,
  })),
)

const LazyLobbyRoute = lazy(() =>
  import('@/lobbies/LobbyRoute').then(({ LobbyRoute }) => ({
    default: LobbyRoute,
  })),
)

const LazyLobbyDashboardPage = lazy(() =>
  import('@/lobbies/LobbyDashboardPage').then(({ LobbyDashboardPage }) => ({
    default: LobbyDashboardPage,
  })),
)

function RouteFallback({ label }: { label: string }) {
  const { t } = useI18n()

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
      {t('common.loadingApp', { app: label })}
    </div>
  )
}

export function LazyAppRoute({ appId }: { appId: string }) {
  const { t } = useI18n()
  const app = registeredApps.find((candidate) => candidate.id === appId)
  const appElement = lazyAppElements.get(appId)

  if (!app || !appElement) {
    return null
  }

  return (
    <Suspense fallback={<RouteFallback label={t(app.titleKey)} />}>
      {appElement}
    </Suspense>
  )
}

export function LazySchlagDenRaabRoute() {
  const { t } = useI18n()

  return (
    <Suspense fallback={<RouteFallback label={t('app.schlagDenRaab.title')} />}>
      <LazySchlagDenRaabGate>
        <LazySchlagDenRaabPage />
      </LazySchlagDenRaabGate>
    </Suspense>
  )
}

export function LazyLobbyDirectoryRoute() {
  return (
    <Suspense fallback={<RouteFallback label="Lobbys" />}>
      <LazyLobbyDirectoryPage />
    </Suspense>
  )
}

export function LazyLobbyAdminRoute() {
  return (
    <Suspense fallback={<RouteFallback label="Lobby-Verwaltung" />}>
      <LazyLobbyAdminPage />
    </Suspense>
  )
}

export function LazyLobbyLayoutRoute() {
  return (
    <Suspense fallback={<RouteFallback label="Lobby" />}>
      <LazyLobbyRoute />
    </Suspense>
  )
}

export function LazyLobbyDashboardRoute() {
  return (
    <Suspense fallback={<RouteFallback label="Lobby" />}>
      <LazyLobbyDashboardPage />
    </Suspense>
  )
}
