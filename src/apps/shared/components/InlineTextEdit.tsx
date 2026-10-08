import { Check, Pencil, X } from 'lucide-react'
import { useRef, useState, type MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const keepInputFocus = (event: MouseEvent) => event.preventDefault()

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
  onSave: (value: string) => void | Promise<unknown>
  triggerMode?: 'label' | 'label-with-icon'
  value: string
}) {
  const { t } = useI18n()
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const isClosingRef = useRef(false)
  const displayValue = value.trim() || fallback

  const startEditing = () => {
    isClosingRef.current = false
    setIsEditing(true)
  }
  const cancel = () => {
    isClosingRef.current = true
    setIsEditing(false)
  }
  const save = async () => {
    if (isClosingRef.current) return
    isClosingRef.current = true
    try {
      await onSave(inputRef.current?.value ?? displayValue)
    } catch (error) {
      isClosingRef.current = false
      throw error
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div
        className="flex min-w-0 items-center gap-1.5"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) void save()
        }}
      >
        <Input
          ref={inputRef}
          aria-label={ariaLabel}
          autoFocus
          className={cn('min-w-0 flex-1 bg-card', inputClassName)}
          defaultValue={displayValue}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void save()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              event.stopPropagation()
              cancel()
            }
          }}
        />
        <Button
          type="button"
          size="icon"
          aria-label={t('common.save')}
          className="size-8"
          onMouseDown={keepInputFocus}
          onClick={() => void save()}
        >
          <Check />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={t('common.cancel')}
          className="size-8 shadow-none"
          onMouseDown={keepInputFocus}
          onClick={cancel}
        >
          <X />
        </Button>
      </div>
    )
  }

  if (triggerMode === 'label') {
    return (
      <button
        type="button"
        aria-label={t('common.editAria', { label: ariaLabel })}
        className={cn(
          'inline-flex min-w-0 items-center rounded-[8px] px-2 py-1 leading-tight transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
          className,
        )}
        onClick={startEditing}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            startEditing()
          }
        }}
      >
        <span className="block min-w-0 truncate">{displayValue}</span>
      </button>
    )
  }

  return (
    <div className="group -mx-2 -my-1 flex w-fit min-w-0 max-w-[calc(100%+1rem)] items-center gap-1 rounded-[8px] px-2 py-1 transition-colors hover:bg-muted has-[:focus-visible]:bg-muted">
      <span
        className={cn('min-w-0 break-words leading-tight', className)}
      >
        {displayValue}
      </span>
      <Button
        aria-label={t('common.editAria', { label: ariaLabel })}
        className="size-11 shrink-0 text-subtle-foreground opacity-0 transition-opacity hover:bg-transparent hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100 sm:size-8 [@media(hover:none)]:opacity-100"
        size="icon"
        variant="ghost"
        onClick={startEditing}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
}
