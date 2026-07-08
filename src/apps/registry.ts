import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartNoAxesCombined,
  ChessKing,
  CircleDot,
  Coins,
  Dice5,
  ListOrdered,
  StepForward,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'

import type { TranslationKey } from '@/lib/i18n'

export type HubApp = {
  id: string
  titleKey: TranslationKey
  descriptionKey: TranslationKey
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
    titleKey: 'app.decisionWheel.title',
    descriptionKey: 'app.decisionWheel.description',
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
    id: 'coinflip',
    titleKey: 'app.coinflip.title',
    descriptionKey: 'app.coinflip.description',
    href: '/apps/coinflip',
    routePath: 'apps/coinflip',
    status: 'Live',
    Icon: Coins,
    loadPage: () =>
      import('@/apps/coinflip').then(({ CoinflipPage }) => ({
        default: CoinflipPage,
      })),
  },
  {
    id: 'progress-dashboard',
    titleKey: 'app.progressDashboard.title',
    descriptionKey: 'app.progressDashboard.description',
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
    titleKey: 'app.scoreboard.title',
    descriptionKey: 'app.scoreboard.description',
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
    titleKey: 'app.liveBuzzer.title',
    descriptionKey: 'app.liveBuzzer.description',
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
    titleKey: 'app.territoryMap.title',
    descriptionKey: 'app.territoryMap.description',
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
    titleKey: 'app.randomizer.title',
    descriptionKey: 'app.randomizer.description',
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
    titleKey: 'app.swissTournaments.title',
    descriptionKey: 'app.swissTournaments.description',
    href: '/apps/swiss-tournaments',
    routePath: 'apps/swiss-tournaments',
    status: 'Live',
    Icon: ChessKing,
    loadPage: () =>
      import('@/apps/swiss-tournaments').then(({ SwissTournamentsPage }) => ({
        default: SwissTournamentsPage,
      })),
  },
  {
    id: 'next-question',
    titleKey: 'app.nextQuestion.title',
    descriptionKey: 'app.nextQuestion.description',
    href: '/apps/next-question',
    routePath: 'apps/next-question',
    status: 'Live',
    Icon: StepForward,
    loadPage: () =>
      import('@/apps/next-question').then(({ NextQuestionPage }) => ({
        default: NextQuestionPage,
      })),
  },
]

export const registeredApps: readonly HubApp[] = appDefinitions

export const dashboardApps: readonly HubApp[] = appDefinitions

export const appRoutes: readonly HubAppRoute[] = appDefinitions.map((app) => ({
  appId: app.id,
  path: app.routePath,
}))
