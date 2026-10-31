import { getReadableTextColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Kompakte Namens-Pill: Initiale in der Personenfarbe, Name auf leicht getöntem Grund.
export function PersonChip({
  className,
  color,
  name,
}: {
  className?: string
  color: string
  name: string
}) {
  return (
    <span
      className={cn('type-action inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border py-0.5 pr-3 pl-1', className)}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, var(--card))`,
        borderColor: `color-mix(in srgb, ${color} 55%, transparent)`,
      }}
    >
      <span
        aria-hidden="true"
        className="grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold uppercase"
        style={{ backgroundColor: color, color: getReadableTextColor(color) }}
      >
        {name.slice(0, 1)}
      </span>
      <span className="min-w-0 truncate">{name}</span>
    </span>
  )
}
