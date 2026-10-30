import { Beer, Funnel, Martini, Minus, Plus, Wine } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { ProgressEventIcon } from '@/apps/progress-dashboard/types'

export const eventIconComponents: Record<ProgressEventIcon, LucideIcon> = {
  plus: Plus,
  minus: Minus,
  wine: Wine,
  beer: Beer,
  schnaps: Martini,
  funnel: Funnel,
}
