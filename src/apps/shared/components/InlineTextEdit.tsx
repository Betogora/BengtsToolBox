import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export function InlineTextEdit({
  ariaLabel,
  className,
  fallback,
  inputClassName,
  onSave,
  triggerMode = 'label-with-icon',
  value,
}: {
  ariaLabel: string
  className?: string
  fallback: string
  inputClassName?: string
  onSave: (value: string) => void | Promise<void>
  triggerMode?: 'label' | 'label-with-icon'
  value: string
}) {
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const displayValue = value.trim() || fallback

  if (isEditing) {
    return (
      <Input
        aria-label={ariaLabel}
        autoFocus
        className={inputClassName}
        defaultValue={displayValue}
        onBlur={async (event) => {
          await onSave(event.currentTarget.value)
          setIsEditing(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') setIsEditing(false)
        }}
      />
    )
  }

  if (triggerMode === 'label') {
    return (
      <button
        type="button"
        aria-label={t('common.editAria', { label: ariaLabel })}
        className={cn(
          'inline-flex min-w-0 items-center rounded-sm leading-tight transition-colors hover:bg-accent/35 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className,
        )}
        onClick={() => setIsEditing(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsEditing(true)
          }
        }}
      >
        <span className="block min-w-0 truncate">{displayValue}</span>
      </button>
    )
  }

  return (
    <div className="group flex min-w-0 items-center gap-2">
      <span
        className={cn(
          'min-w-0 break-words rounded-sm leading-tight transition-colors group-hover:bg-accent/35',
          className,
        )}
      >
        {displayValue}
      </span>
      <Button
        aria-label={t('common.editAria', { label: ariaLabel })}
        className="size-11 sm:size-9"
        size="icon"
        variant="ghost"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
}
