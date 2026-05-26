import type { LucideIcon } from 'lucide-react'
import {
  Bell,
  ChartNoAxesCombined,
  CircleDot,
  Dice5,
  Stethoscope,
  TimerReset,
} from 'lucide-react'
import type { ComponentType } from 'react'

import { DecisionWheelPage } from '@/apps/decision-wheel'
import { DiagnosticsPage } from '@/apps/diagnostics'
import { LiveBuzzerPage } from '@/apps/live-buzzer'
import { ProgressDashboardPage } from '@/apps/progress-dashboard'
import { RandomizerPage } from '@/apps/randomizer'
import { RealtimeCounterPage } from '@/apps/realtime-counter'

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
      'Prüft Firebase, Anonymous Auth, Firestore-Zugriff, Realtime-Sync und lokalen Fallback.',
    href: '/apps/diagnostics',
    routePath: 'apps/diagnostics',
    status: 'Live',
    color: 'var(--brand-lime)',
    Icon: Stethoscope,
    Page: DiagnosticsPage,
  },
  {
    id: 'realtime-counter',
    title: 'Counter',
    description:
      'Gemeinsamer Team-Counter mit editierbaren Personen, Teams und Live-Sync über Firestore.',
    href: '/apps/realtime-counter',
    routePath: 'apps/realtime-counter',
    status: 'Live',
    color: 'var(--brand-blue)',
    Icon: TimerReset,
    Page: RealtimeCounterPage,
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
      'Gemeinsames Fortschrittsdiagramm mit Spielern, Farben, Events, Archiv und editierbaren Datensätzen.',
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
      'Online-Würfel und Random Number Generator mit gemerktem letzten Zustand.',
    href: '/apps/randomizer',
    routePath: 'apps/randomizer',
    status: 'Live',
    color: 'var(--brand-orange)',
    Icon: Dice5,
    Page: RandomizerPage,
  },
  {
    id: 'decision-wheel',
    title: 'Glücksrad',
    description:
      'Decision Wheel für Spieleabende, Aufgaben, Preise und schnelle Auswahl mit Live-Sync.',
    href: '/apps/decision-wheel',
    routePath: 'apps/decision-wheel',
    status: 'Live',
    color: 'var(--brand-teal)',
    Icon: CircleDot,
    Page: DecisionWheelPage,
  },
]
