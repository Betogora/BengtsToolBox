import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'type-action inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md transition-[color,background-color,transform] outline-none active:translate-y-px disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 disabled:bg-muted disabled:text-subtle-foreground disabled:shadow-none',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 disabled:bg-muted disabled:text-subtle-foreground disabled:shadow-none',
        outline:
          'border bg-card shadow-xs hover:bg-muted disabled:bg-muted disabled:text-subtle-foreground disabled:shadow-none',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover disabled:text-subtle-foreground',
        ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50',
        link: 'text-primary underline-offset-4 hover:underline disabled:opacity-50',
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
