import type * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  const isInvalid =
    props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'type-control flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        isInvalid && 'border-destructive! focus-visible:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
