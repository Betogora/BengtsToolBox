import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { useShellHeaderSlots } from '@/components/layout/shellHeaderSlots'
import { ShellTitle } from '@/components/layout/ShellTitle'
import { cn } from '@/lib/utils'

const statusClassName = 'type-label flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground'

// Ein Seitenkopf für alle Apps. In der Shell stehen Icon, Titel und Aktionen sichtbar in der TopBar; in der
// Seite bleiben die Überschrift für Screenreader (auch bei ausgeblendeter Leiste) und der Status als ruhige
// Textzeile. Ohne Shell erscheint alles als eigene Kopfzeile.
export function AppPageHeader({
  actions,
  className,
  Icon,
  shortTitle,
  status,
  title,
}: {
  actions?: ReactNode
  className?: string
  Icon: LucideIcon
  // Kürzere Fassung für die TopBar, wo der volle Titel nicht passt (unter 768 px und 1024–1151 px).
  shortTitle?: string
  status?: ReactNode
  title: string
}) {
  const shellSlots = useShellHeaderSlots()

  if (shellSlots) {
    return (
      <>
        {shellSlots.title && createPortal(<ShellTitle Icon={Icon} shortTitle={shortTitle} title={title} />, shellSlots.title)}
        {actions && shellSlots.actions && createPortal(actions, shellSlots.actions)}
        <h1 className="sr-only">{title}</h1>
        {status && (
          <div data-slot="app-page-header" className={cn(statusClassName, className)}>
            {status}
          </div>
        )}
      </>
    )
  }

  return (
    <header
      data-slot="app-page-header"
      className={cn('flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1.5', className)}
    >
      <AppPageTitle Icon={Icon} title={title} className="min-w-0 flex-1 gap-2.5 sm:gap-3" />
      {status && (
        <div className={cn(statusClassName, 'order-last basis-full sm:order-none sm:basis-auto')}>
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
