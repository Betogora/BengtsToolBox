import * as React from 'react'

import { Input } from '@/components/ui/input'
import { SelectTrigger } from '@/components/ui/select'
import { cn } from '@/lib/utils'

type IftaInputProps = React.ComponentProps<'input'> & {
  label: string
}

function IftaInput({ className, id, label, ...props }: IftaInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  return (
    <div className="relative">
      <Input
        id={inputId}
        aria-label={props['aria-label'] ?? label}
        className={cn('h-11 px-3 pb-1.5 pt-5 text-sm', className)}
        {...props}
      />
      <label
        className="pointer-events-none absolute left-3 top-1.5 max-w-[calc(100%-1.5rem)] truncate text-[0.68rem] font-semibold leading-tight text-muted-foreground"
        htmlFor={inputId}
      >
        {label}
      </label>
    </div>
  )
}

type IftaSelectTriggerProps = React.ComponentProps<typeof SelectTrigger> & {
  containerClassName?: string
  label: string
}

function IftaSelectTrigger({
  children,
  className,
  containerClassName,
  label,
  ...props
}: IftaSelectTriggerProps) {
  return (
    <div className={cn('relative', containerClassName)}>
      <SelectTrigger
        aria-label={props['aria-label'] ?? label}
        className={cn('h-11 px-3 pb-1.5 pt-5 text-sm', className)}
        {...props}
      >
        {children}
      </SelectTrigger>
      <span className="pointer-events-none absolute left-3 top-1.5 max-w-[calc(100%-2.5rem)] truncate text-[0.68rem] font-semibold leading-tight text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

export { IftaInput, IftaSelectTrigger }
