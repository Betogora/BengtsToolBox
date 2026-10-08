import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

import { cn } from '@/lib/utils'

type EmptyStateProps = ComponentProps<'div'> & {
  action?: ReactNode
  icon?: LucideIcon
}

export function EmptyState({
  action,
  children,
  className,
  icon: Icon,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'type-ui rounded-lg border border-dashed border-border-strong bg-transparent p-7 text-center font-semibold text-foreground',
        (Icon || action) && 'flex flex-col items-center justify-center gap-3',
        className,
      )}
      {...props}
    >
      {Icon && (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      {Icon || action ? <div>{children}</div> : children}
      {action}
    </div>
  )
}
