import type { ComponentProps, KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { useSlidingIndicator } from './useSlidingIndicator'

interface SegmentedOption {
  value: string
  label: string
  icon?: LucideIcon
  disabled?: boolean
}

interface SegmentedControlProps extends Omit<ComponentProps<'div'>, 'onChange'> {
  value: string
  onValueChange: (value: string) => void
  options: readonly SegmentedOption[]
  variant?: 'default' | 'icon-tabs'
}

export function SegmentedControl({
  value,
  onValueChange,
  options,
  variant = 'default',
  className,
  ...props
}: SegmentedControlProps) {
  const { listRef, indicatorRef } = useSlidingIndicator()
  const enabled = options.filter((option) => !option.disabled)
  const tabStop = enabled.find((option) => option.value === value) ?? enabled[0]

  const navigate = (event: KeyboardEvent<HTMLButtonElement>, current: string) => {
    const index = enabled.findIndex((option) => option.value === current)
    const direction = getComputedStyle(event.currentTarget).direction === 'rtl' ? -1 : 1
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = index + direction; break
      case 'ArrowLeft': next = index - direction; break
      case 'ArrowDown': next = index + 1; break
      case 'ArrowUp': next = index - 1; break
      case 'Home': next = 0; break
      case 'End': next = enabled.length - 1; break
      default: return
    }
    event.preventDefault()
    const option = enabled[(next + enabled.length) % enabled.length]
    if (!option) return
    onValueChange(option.value)
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')
    buttons?.[(next + enabled.length) % enabled.length]?.focus()
  }

  return (
    <div
      {...props}
      ref={listRef}
      role="radiogroup"
      data-slot="segmented-control"
      data-variant={variant}
      className={cn('selection-track', className)}
    >
      <span ref={indicatorRef} className="selection-indicator" aria-hidden="true" />
      {options.map(({ value: optionValue, label, icon: Icon, disabled }) => (
        <button
          key={optionValue}
          type="button"
          role="radio"
          aria-label={label}
          aria-checked={value === optionValue}
          disabled={disabled}
          tabIndex={tabStop?.value === optionValue ? 0 : -1}
          className="selection-item type-action"
          onClick={() => onValueChange(optionValue)}
          onKeyDown={(event) => navigate(event, optionValue)}
        >
          {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
          <span className="selection-label"><span>{label}</span></span>
        </button>
      ))}
    </div>
  )
}
