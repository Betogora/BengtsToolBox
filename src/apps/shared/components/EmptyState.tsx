import type { ComponentProps } from 'react'

import { cn } from '@/lib/utils'

export function EmptyState({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'type-ui rounded-md border border-dashed bg-background p-6 text-center text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
