import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartNoAxesCombined,
  CircleDot,
  Dice5,
  ListOrdered,
  Stethoscope,
  UtensilsCrossed,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { DecisionWheelPage } from '@/apps/decision-wheel'
import { DiagnosticsPage } from '@/apps/diagnostics'
import { LiveBuzzerPage } from '@/apps/live-buzzer'
import { ProgressDashboardPage } from '@/apps/progress-dashboard'
import { RandomizerPage } from '@/apps/randomizer'
import { ScoreboardPage } from '@/apps/scoreboard'
import { TerritoryMapPage } from '@/apps/territory-map'

export type HubApp = {
  id: string
  title: string
  description: string
  href: string
  routePath: string
  status: 'Live' | 'Preview'
  color: string
  Icon: LucideIcon
  Page: ComponentType
}

export const apps: HubApp[] = [
  {
    id: 'diagnostics',
    title: 'Diagnose',
    description:
      'Prueft Firebase, Anonymous Auth, Firestore-Zugriff, Realtime-Sync und lokalen Fallback.',
    href: '/apps/diagnostics',
    routePath: 'apps/diagnostics',
    status: 'Live',
    color: 'var(--brand-lime)',
    Icon: Stethoscope,
    Page: DiagnosticsPage,
  },
  {
    id: 'scoreboard',
    title: 'Scoreboard',
    description:
      'Live-Scoreboard fuer Spieleabende, Quiz, Challenges und kleine Turniere.',
    href: '/apps/scoreboard',
    routePath: 'apps/scoreboard',
    status: 'Live',
    color: 'var(--brand-blue)',
    Icon: ListOrdered,
    Page: ScoreboardPage,
  },
  {
    id: 'live-buzzer',
    title: 'Live-Buzzer',
    description:
      'Quizshow-Buzzer mit automatischen Spielerkarten, Blau/Gelb-Teams und gemeinsamer Rundensteuerung.',
    href: '/apps/live-buzzer',
    routePath: 'apps/live-buzzer',
    status: 'Live',
    color: 'var(--brand-teal)',
    Icon: Bell,
    Page: LiveBuzzerPage,
  },
  {
    id: 'progress-dashboard',
    title: 'Fortschritts-Dashboard',
    description:
      'Gemeinsames Fortschrittsdiagramm mit Spielern, Farben, Events, Archiv und editierbaren Datensaetzen.',
    href: '/apps/progress-dashboard',
    routePath: 'apps/progress-dashboard',
    status: 'Live',
    color: 'var(--brand-violet)',
    Icon: ChartNoAxesCombined,
    Page: ProgressDashboardPage,
  },
  {
    id: 'randomizer',
    title: 'Random Number Generator',
    description:
      'Online-Wuerfel und Random Number Generator mit gemerktem letzten Zustand.',
    href: '/apps/randomizer',
    routePath: 'apps/randomizer',
    status: 'Live',
    color: 'var(--brand-orange)',
    Icon: Dice5,
    Page: RandomizerPage,
  },
  {
    id: 'decision-wheel',
    title: 'Gluecksrad',
    description:
      'Decision Wheel fuer Spieleabende, Aufgaben, Preise und schnelle Auswahl mit Live-Sync.',
    href: '/apps/decision-wheel',
    routePath: 'apps/decision-wheel',
    status: 'Live',
    color: 'var(--brand-teal)',
    Icon: CircleDot,
    Page: DecisionWheelPage,
  },
  {
    id: 'territory-map',
    title: 'World Suhi Map',
    description:
      'Interaktive Sushi-Reisekarte fuer Weltlaender und deutsche Bundeslaender mit Esserfarben und Live-Sync.',
    href: '/apps/territory-map',
    routePath: 'apps/territory-map',
    status: 'Live',
    color: 'var(--brand-blue)',
    Icon: UtensilsCrossed,
    Page: TerritoryMapPage,
  },
]
