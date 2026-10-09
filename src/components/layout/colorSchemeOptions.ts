import { Moon, Sun, type LucideIcon } from 'lucide-react'

import type { ColorScheme } from '@/lib/colorScheme'

export const colorSchemeOptions: {
  Icon: LucideIcon
  labelKey: 'colorScheme.light.label' | 'colorScheme.dark.label'
  value: ColorScheme
}[] = [
  {
    Icon: Sun,
    labelKey: 'colorScheme.light.label',
    value: 'light',
  },
  {
    Icon: Moon,
    labelKey: 'colorScheme.dark.label',
    value: 'dark',
  },
]
