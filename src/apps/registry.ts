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

export const appTileAccent = 'var(--brand-orange)'

export const apps: HubApp[] = [
  {
    id: 'diagnostics',
    title: 'Diagnose',
    description:
      'Prüft Firebase, Anonymous Auth, Firestore-Zugriff, Realtime-Sync und lokalen Fallback.',
    href: '/apps/diagnostics',
    routePath: 'apps/diagnostics',
    status: 'Live',
    color: appTileAccent,
    Icon: Stethoscope,
    Page: DiagnosticsPage,
  },
  {
    id: 'realtime-counter',
    title: 'Echtzeit-Counter',
    description:
      'Gemeinsamer Team-Counter mit editierbaren Personen, Teams und Live-Sync ueber Firestore.',
    href: '/apps/realtime-counter',
    routePath: 'apps/realtime-counter',
    status: 'Live',
    color: appTileAccent,
    Icon: TimerReset,
    Page: RealtimeCounterPage,
  },
  {
    id: 'live-buzzer',
    title: 'Live-Buzzer',
    description:
      'Quizshow-Buzzer mit Admin-Freigabe, Spielerkennung und Live-Lockout.',
    href: '/apps/live-buzzer',
    routePath: 'apps/live-buzzer',
    status: 'Live',
    color: appTileAccent,
    Icon: Bell,
    Page: LiveBuzzerPage,
  },
  {
    id: 'randomizer',
    title: 'Zufallsgenerator',
    description:
      'Online-Würfel und Random Number Generator mit gemerktem letzten Zustand.',
    href: '/apps/randomizer',
    routePath: 'apps/randomizer',
    status: 'Live',
    color: appTileAccent,
    Icon: Dice5,
    Page: RandomizerPage,
  },
]
