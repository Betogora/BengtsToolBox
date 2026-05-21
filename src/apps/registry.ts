import type { LucideIcon } from 'lucide-react'
import { Dice5, TimerReset } from 'lucide-react'
import type { ComponentType } from 'react'

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
    id: 'realtime-counter',
    title: 'Echtzeit-Counter',
    description:
      'Gemeinsamer Score-Tracker fuer bis zu 5 Personen mit Live-Sync ueber Firestore.',
    href: '/apps/realtime-counter',
    routePath: 'apps/realtime-counter',
    status: 'Live',
    color: '#125e55',
    Icon: TimerReset,
    Page: RealtimeCounterPage,
  },
  {
    id: 'randomizer',
    title: 'Zufallsgenerator',
    description:
      'Online-Wuerfel und Random Number Generator mit gemerktem letzten Zustand.',
    href: '/apps/randomizer',
    routePath: 'apps/randomizer',
    status: 'Live',
    color: '#9a5f12',
    Icon: Dice5,
    Page: RandomizerPage,
  },
]
