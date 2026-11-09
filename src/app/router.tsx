import { createBrowserRouter, Navigate } from 'react-router-dom'

import { appRoutes, isEveningApp } from '@/apps/registry'
import {
  LazyAppRoute,
  LazyEveningRoute,
  LazyLobbyAdminRoute,
  LazyLobbyDashboardRoute,
  LazyLobbyDirectoryRoute,
  LazyLobbyLayoutRoute,
} from '@/app/lazyRoutes'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/components/layout/DashboardPage'

// Haupt-Hub-Apps laufen global und in Lobbys; Abend-Hub-Apps nur global hinter der PIN.
const mainAppRoutes = appRoutes.filter((route) => !isEveningApp(route.appId))
const eveningAppRoutes = appRoutes.filter((route) => isEveningApp(route.appId))

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
        element: <LazyEveningRoute />,
      },
      ...eveningAppRoutes.map((route) => ({
        path: route.path,
        element: <LazyEveningRoute appId={route.appId} />,
      })),
      // Frühere Adresse von Codenames vor dem Umzug in den Abend-Hub.
      {
        path: 'apps/codenames',
        element: <Navigate to="/schlag-den-raab/codenames" replace />,
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
          ...mainAppRoutes.map((route) => ({
            path: route.path,
            element: <LazyAppRoute appId={route.appId} />,
          })),
        ],
      },
      ...mainAppRoutes.map((route) => ({
        path: route.path,
        element: <LazyAppRoute appId={route.appId} />,
      })),
    ],
  },
])
