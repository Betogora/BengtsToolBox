import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { cn } from '@/lib/utils'

// Ein Seitenkopf für alle Apps: Icon und Titel links, Aktionen rechts, Status als ruhige Textzeile.
// Mobil steht der Status unter dem Titel, ab sm vor den Aktionen.
export function AppPageHeader({
  actions,
  className,
  Icon,
  status,
  title,
  titleContent,
}: {
  actions?: ReactNode
  className?: string
  Icon: LucideIcon
  status?: ReactNode
  title?: string
  titleContent?: ReactNode
}) {
  return (
    <header
      data-slot="app-page-header"
      className={cn('flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5', className)}
    >
      <AppPageTitle Icon={Icon} title={title} className="min-w-0 flex-1 gap-2.5 sm:gap-3">
        {titleContent}
      </AppPageTitle>
      {status && (
        <div className="type-label order-last flex min-w-0 basis-full flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground sm:order-none sm:basis-auto">
          {status}
        </div>
      )}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  )
}

// Statuseintrag im Seitenkopf: Text mit optionalem Icon, nie eine Button-Attrappe.
export function AppPageStatus({
  children,
  className,
  Icon,
}: {
  children: ReactNode
  className?: string
  Icon?: LucideIcon
}) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-1.5', className)}>
      {Icon && <Icon aria-hidden="true" className="size-3.5 shrink-0" />}
      {children}
    </span>
  )
}
