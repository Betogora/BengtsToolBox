import type * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-colors outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
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
      <span className="block truncate text-[10px] font-medium leading-3 text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        data-slot="labeled-input"
        className={cn(
          'h-6 w-full min-w-0 border-0 bg-transparent p-0 text-base leading-6 outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none md:text-sm',
          className,
        )}
        {...props}
      />
    </label>
  )
}

export { Input, LabeledInput }
