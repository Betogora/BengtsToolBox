import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function AppPageTitle({
  children,
  className,
  Icon,
  title,
}: {
  children?: ReactNode
  className?: string
  Icon: LucideIcon
  title?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Icon aria-hidden="true" className="size-9 shrink-0 text-primary sm:size-10" />
      {children ?? (
        <h1 className="type-page-title min-w-0 break-words">
          {title}
        </h1>
      )}
    </div>
  )
}
