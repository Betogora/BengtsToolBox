import { createBrowserRouter } from 'react-router-dom'

import { appRoutes } from '@/apps/registry'
import {
  LazyAppRoute,
  LazyLobbyAdminRoute,
  LazyLobbyDashboardRoute,
  LazyLobbyDirectoryRoute,
  LazyLobbyLayoutRoute,
  LazySchlagDenRaabRoute,
} from '@/app/lazyRoutes'
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
        element: <LazySchlagDenRaabRoute />,
      },
      {
        path: 'lobbies',
        element: <LazyLobbyDirectoryRoute />,
      },
      {
        path: 'lobby-admin',
        element: <LazyLobbyAdminRoute />,
      },
      {
        path: 'lobbies/:lobbyId',
        element: <LazyLobbyLayoutRoute />,
        children: [
          {
            index: true,
            element: <LazyLobbyDashboardRoute />,
          },
          ...appRoutes.map((route) => ({
            path: route.path,
            element: <LazyAppRoute appId={route.appId} />,
          })),
        ],
      },
      ...appRoutes.map((route) => ({
        path: route.path,
        element: <LazyAppRoute appId={route.appId} />,
      })),
    ],
  },
])
