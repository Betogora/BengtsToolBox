import type * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'type-control flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

function LabeledInput({
  className,
  containerClassName,
  label,
  type,
  ...props
}: React.ComponentProps<'input'> & {
  containerClassName?: string
  label: React.ReactNode
}) {
  return (
    <label
      className={cn(
        'flex h-12 min-w-0 cursor-text flex-col justify-center rounded-md border bg-transparent px-3 py-1 shadow-xs transition-colors focus-within:ring-[3px] focus-within:ring-ring/50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50',
        containerClassName,
      )}
    >
      <span className="type-field-label block truncate text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        data-slot="labeled-input"
        className={cn(
          'type-control h-6 w-full min-w-0 border-0 bg-transparent p-0 outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export { Input, LabeledInput }
