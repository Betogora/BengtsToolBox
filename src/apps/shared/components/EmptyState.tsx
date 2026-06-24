import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function EmptyState({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-md border border-dashed bg-background p-6 text-center text-sm text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
