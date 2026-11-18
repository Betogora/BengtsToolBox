import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

// `compact` ist die einzeilige Fassung für die TopBar.
export function AppPageTitle({
  className,
  compact = false,
  Icon,
  title,
}: {
  className?: string
  compact?: boolean
  Icon: LucideIcon
  title: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center', compact ? 'gap-2' : 'gap-3', className)}>
      <Icon
        aria-hidden="true"
        className={cn('shrink-0 text-primary', compact ? 'size-5' : 'size-7 sm:size-8')}
      />
      <h1
        className={cn(
          'min-w-0',
          compact
            ? 'truncate text-[1.0625rem] font-[650] leading-tight tracking-[-0.01em]'
            : 'type-page-title break-words',
        )}
      >
        {title}
      </h1>
    </div>
  )
}
