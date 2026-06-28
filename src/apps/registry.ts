import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartNoAxesCombined,
  ChessKing,
  CircleDot,
  Dice5,
  ListOrdered,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type HubApp = {
  id: string
  title: string
  description: string
  href: string
  routePath: string
  status: 'Live' | 'Preview'
  Icon: LucideIcon
  loadPage: () => Promise<{ default: ComponentType }>
}

export type HubAppRoute = {
  appId: string
  path: string
}

const appDefinitions: readonly HubApp[] = [
  {
    id: 'decision-wheel',
    title: 'Glücksrad',
    description:
      'Decision Wheel für Spieleabende, Aufgaben, Preise und schnelle Auswahl.',
    href: '/apps/decision-wheel',
    routePath: 'apps/decision-wheel',
    status: 'Live',
    Icon: CircleDot,
    loadPage: () =>
      import('@/apps/decision-wheel').then(({ DecisionWheelPage }) => ({
        default: DecisionWheelPage,
      })),
  },
  {
    id: 'progress-dashboard',
    title: 'Fortschritts-Dashboard',
    description:
      'Gemeinsames Fortschrittsdiagramm mit Spielern, Farben, Events, Archiv und editierbaren Datensätzen.',
    href: '/apps/progress-dashboard',
    routePath: 'apps/progress-dashboard',
    status: 'Live',
    Icon: ChartNoAxesCombined,
    loadPage: () =>
      import('@/apps/progress-dashboard').then(({ ProgressDashboardPage }) => ({
        default: ProgressDashboardPage,
      })),
  },
  {
    id: 'scoreboard',
    title: 'Scoreboard',
    description:
      'Live-Scoreboard für Spieleabende, Quiz, Challenges und kleine Turniere.',
    href: '/apps/scoreboard',
    routePath: 'apps/scoreboard',
    status: 'Live',
    Icon: ListOrdered,
    loadPage: () =>
      import('@/apps/scoreboard').then(({ ScoreboardPage }) => ({
        default: ScoreboardPage,
      })),
  },
  {
    id: 'live-buzzer',
    title: 'Live-Buzzer',
    description:
      'Quizshow-Buzzer mit automatischen Spielerkarten, Blau/Gelb-Teams und gemeinsamer Rundensteuerung.',
    href: '/apps/live-buzzer',
    routePath: 'apps/live-buzzer',
    status: 'Live',
    Icon: Bell,
    loadPage: () =>
      import('@/apps/live-buzzer').then(({ LiveBuzzerPage }) => ({
        default: LiveBuzzerPage,
      })),
  },
  {
    id: 'territory-map',
    title: 'Sushi Map',
    description:
      'Interaktive Sushi-Reisekarte für Weltländer und deutsche Bundesländer mit Esserfarben und Live-Sync.',
    href: '/apps/sushi',
    routePath: 'apps/sushi',
    status: 'Live',
    Icon: UtensilsCrossed,
    loadPage: () =>
      import('@/apps/territory-map').then(({ TerritoryMapPage }) => ({
        default: TerritoryMapPage,
      })),
  },
  {
    id: 'randomizer',
    title: 'Random Number Generator',
    description:
      'Online-Würfel und Random Number Generator mit gemerktem letzten Zustand.',
    href: '/apps/randomizer',
    routePath: 'apps/randomizer',
    status: 'Live',
    Icon: Dice5,
    loadPage: () =>
      import('@/apps/randomizer').then(({ RandomizerPage }) => ({
        default: RandomizerPage,
      })),
  },
  {
    id: 'swiss-tournaments',
    title: 'SK Anderten Turnier-App',
    description:
      'Schachturniere nach Schweizer System mit Spielern, Paarungen, Ergebnissen, Tie-Breaks und Export.',
    href: '/apps/swiss-tournaments',
    routePath: 'apps/swiss-tournaments',
    status: 'Live',
    Icon: ChessKing,
    loadPage: () =>
      import('@/apps/swiss-tournaments').then(({ SwissTournamentsPage }) => ({
        default: SwissTournamentsPage,
      })),
  },
]

export const registeredApps: readonly HubApp[] = appDefinitions

export const dashboardApps: readonly HubApp[] = appDefinitions

export const appRoutes: readonly HubAppRoute[] = appDefinitions.map((app) => ({
  appId: app.id,
  path: app.routePath,
}))
