import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex h-[1.375rem] w-fit shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs leading-none font-semibold whitespace-nowrap [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-primary-soft text-primary',
        secondary: 'bg-muted text-muted-foreground',
        success: 'bg-success-soft text-success',
        destructive: 'bg-destructive-soft text-destructive',
        outline: 'border bg-transparent text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  dot = false,
  children,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export { Badge }
