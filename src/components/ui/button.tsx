import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'type-action inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_12px_28px_-20px_rgba(13,142,144,0.9)] hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-[0_12px_28px_-20px_rgba(217,77,67,0.9)] hover:bg-destructive/90',
        delete:
          'bg-destructive text-white shadow-[0_12px_28px_-20px_rgba(217,77,67,0.9)] hover:bg-destructive/90',
        outline:
          'border bg-card shadow-xs hover:bg-secondary hover:text-primary',
        secondary:
          'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80 hover:text-primary',
        ghost: 'hover:bg-secondary hover:text-primary',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        ifta: 'h-11 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        lg: 'h-10 rounded-md px-6',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button }
