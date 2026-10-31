import { Check } from 'lucide-react'
import type { ReactNode } from 'react'

import { getReadableTextColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Auswahlkachel für eine Person in einer Radiogruppe; die Auswahl übernimmt Rahmen und Ton der Personenfarbe.
export function PersonOption({
  checked,
  className,
  color,
  name,
  onSelect,
  trailing,
}: {
  checked: boolean
  className?: string
  color: string
  name: string
  onSelect: () => void
  trailing?: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      className={cn(
        'type-action flex min-h-12 min-w-0 items-center gap-2 rounded-md border bg-card px-3 text-left transition-colors',
        !checked && 'hover:bg-muted',
        className,
      )}
      style={
        checked
          ? {
              backgroundColor: `color-mix(in srgb, ${color} 12%, var(--card))`,
              borderColor: color,
              boxShadow: `inset 0 0 0 1px ${color}`,
            }
          : undefined
      }
      onClick={onSelect}
    >
      <span
        aria-hidden="true"
        className="grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold uppercase"
        style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      >
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : name.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate">{name}</span>
      {trailing && <span className="type-caption ml-auto shrink-0 text-muted-foreground">{trailing}</span>}
    </button>
  )
}
