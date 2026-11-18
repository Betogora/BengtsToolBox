import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type EmptyStateProps = ComponentProps<'div'> & {
  action?: ReactNode
  icon?: LucideIcon
}

// Leerzustand ohne Kasten: als ruhige Zeile, mit Icon oder Aktion zentriert gestapelt.
export function EmptyState({
  action,
  children,
  className,
  icon: Icon,
  ...props
}: EmptyStateProps) {
  const isStacked = Boolean(Icon || action)

  return (
    <div
      data-slot="empty-state"
      className={cn(
        'type-ui text-muted-foreground',
        isStacked ? 'flex flex-col items-center justify-center gap-2 px-4 py-6 text-center' : 'py-1',
        className,
      )}
      {...props}
    >
      {Icon && <Icon aria-hidden="true" className="size-5 text-subtle-foreground" />}
      {isStacked ? <div>{children}</div> : children}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
