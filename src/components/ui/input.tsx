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
        'type-control flex h-10 w-full min-w-0 rounded-md border bg-card px-3 py-1 shadow-xs transition-[border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-subtle-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-subtle-foreground disabled:shadow-none',
        isInvalid && 'border-destructive! ring-[3px] ring-destructive/12 focus-visible:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
