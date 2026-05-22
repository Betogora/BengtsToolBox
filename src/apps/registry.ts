import type { LucideIcon } from 'lucide-react'
import { Bell, Dice5, Stethoscope, TimerReset } from 'lucide-react'
import type { ComponentType } from 'react'

import { DiagnosticsPage } from '@/apps/diagnostics'
import { LiveBuzzerPage } from '@/apps/live-buzzer'
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
]
