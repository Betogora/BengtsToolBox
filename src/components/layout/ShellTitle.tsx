import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// Sichtbarer App-Titel in der schmalen TopBar. Die Überschrift für Screenreader steht in der Seite,
// damit sie auch bei ausgeblendeter Leiste erhalten bleibt; dieser Titel ist deshalb nur Anzeige.
export function ShellTitle({
  className,
  Icon,
  shortTitle,
  title,
}: {
  className?: string
  Icon: LucideIcon
  // Ersetzt den Titel unter 400 px, wo lange App-Namen sonst abgeschnitten würden.
  shortTitle?: string
  title: string
}) {
  return (
    <span aria-hidden="true" data-shell-title className={cn('flex min-w-0 items-center gap-2', className)}>
      <Icon className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 truncate text-[1.0625rem] font-[650] leading-tight tracking-[-0.01em]">
        {shortTitle ? (
          <>
            <span className="min-[25rem]:hidden">{shortTitle}</span>
            <span className="max-[25rem]:hidden">{title}</span>
          </>
        ) : (
          title
        )}
      </span>
    </span>
  )
}
