import * as React from 'react'

import { Input } from '@/components/ui/input'
import { SelectTrigger } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type IftaInputProps = React.ComponentProps<'input'> & {
  label: React.ReactNode
}

function IftaInput({ className, id, label, ...props }: IftaInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const isInvalid =
    props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <div className="relative">
      <Input
        id={inputId}
        aria-label={
          props['aria-label'] ?? (typeof label === 'string' ? label : undefined)
        }
        className={cn('h-11 px-3 pb-1.5 pt-5', className)}
        {...props}
      />
      <label
        className={cn(
          'type-field-label pointer-events-none absolute left-3 top-1.5 max-w-[calc(100%-1.5rem)] truncate text-muted-foreground',
          props.disabled && 'opacity-50',
          isInvalid && 'text-destructive',
        )}
        htmlFor={inputId}
      >
        {label}
      </label>
    </div>
  )
}

type IftaSelectTriggerProps = React.ComponentProps<typeof SelectTrigger> & {
  containerClassName?: string
  label: React.ReactNode
}

function IftaSelectTrigger({
  children,
  className,
  containerClassName,
  label,
  ...props
}: IftaSelectTriggerProps) {
  const isInvalid =
    props['aria-invalid'] === true || props['aria-invalid'] === 'true'

  return (
    <div className={cn('relative', containerClassName)}>
      <SelectTrigger
        aria-label={
          props['aria-label'] ?? (typeof label === 'string' ? label : undefined)
        }
        className={cn('h-11 px-3 pb-1.5 pt-5', className)}
        {...props}
      >
        {children}
      </SelectTrigger>
      <span
        className={cn(
          'type-field-label pointer-events-none absolute left-3 top-1.5 max-w-[calc(100%-2.5rem)] truncate text-muted-foreground',
          props.disabled && 'opacity-50',
          isInvalid && 'text-destructive',
        )}
      >
        {label}
      </span>
    </div>
  )
}

export { IftaInput, IftaSelectTrigger }
