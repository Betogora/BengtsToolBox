import { Pencil } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function InlineTextEdit({
  ariaLabel,
  className,
  fallback,
  inputClassName,
  onSave,
  value,
}: {
  ariaLabel: string
  className?: string
  fallback: string
  inputClassName?: string
  onSave: (value: string) => void | Promise<void>
  value: string
}) {
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
        aria-label={`${ariaLabel} bearbeiten`}
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
