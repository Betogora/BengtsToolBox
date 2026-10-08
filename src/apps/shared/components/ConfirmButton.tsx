import { Slot } from '@radix-ui/react-slot'
import { useEffect, useId, useRef, useState, type ReactElement } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'

export type ConfirmMode = 'inline' | 'popover' | 'dialog'

export function ConfirmButton({
  confirmLabel,
  description,
  mode = 'inline',
  onConfirm,
  title,
  trigger,
}: {
  confirmLabel?: string
  description: string
  mode?: ConfirmMode
  onConfirm: () => void | Promise<unknown>
  title: string
  trigger: ReactElement
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inlineRef = useRef<HTMLDivElement>(null)
  const restoreTriggerFocus = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm')

  const close = () => {
    restoreTriggerFocus.current = true
    setOpen(false)
  }

  const handleConfirm = async () => {
    if (isConfirming) return

    setIsConfirming(true)
    try {
      await onConfirm()
      close()
    } finally {
      setIsConfirming(false)
    }
  }

  useEffect(() => {
    if (mode !== 'inline') return
    if (open) {
      confirmButtonRef.current?.focus()
      return
    }
    if (restoreTriggerFocus.current) {
      restoreTriggerFocus.current = false
      triggerRef.current?.focus()
    }
  }, [mode, open])

  useEffect(() => {
    if (mode !== 'inline' || !open) return
    // Capture before Radix dialogs so Escape only dismisses this confirmation.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !inlineRef.current?.contains(event.target as Node)) return
      event.preventDefault()
      if (isConfirming) return
      restoreTriggerFocus.current = true
      setOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [isConfirming, mode, open])

  const actions = (
    <>
      <Button disabled={isConfirming} size="sm" type="button" variant="ghost" onClick={close}>
        {t('common.cancel')}
      </Button>
      <Button
        ref={confirmButtonRef}
        aria-describedby={descriptionId}
        disabled={isConfirming}
        size="sm"
        type="button"
        variant="destructive"
        onClick={() => void handleConfirm()}
      >
        {resolvedConfirmLabel}
      </Button>
    </>
  )

  if (mode === 'inline') {
    if (!open) {
      return <Slot ref={triggerRef} onClick={() => setOpen(true)}>{trigger}</Slot>
    }

    return (
      <div
        ref={inlineRef}
        role="group"
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-[12px] border bg-card py-[3px] pr-[3px] pl-3 shadow-sm"
      >
        <span id={titleId} className="type-ui font-semibold">{title}</span>
        <span id={descriptionId} className="sr-only">{description}</span>
        <div className="ml-auto flex gap-1">{actions}</div>
      </div>
    )
  }

  if (mode === 'popover') {
    return (
      <Popover open={open} onOpenChange={(next) => !isConfirming && setOpen(next)}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent
          aria-describedby={descriptionId}
          aria-labelledby={titleId}
          align="end"
          collisionPadding={8}
          side="bottom"
          className="grid w-max max-w-[min(18rem,calc(100vw-1rem))] gap-3"
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            confirmButtonRef.current?.focus()
          }}
        >
          <div className="grid gap-0.5">
            <p id={titleId} className="type-ui font-semibold">{title}</p>
            <p id={descriptionId} className="type-caption text-muted-foreground">{description}</p>
          </div>
          <div className="flex justify-end gap-1">{actions}</div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isConfirming && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          confirmButtonRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button disabled={isConfirming} variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            ref={confirmButtonRef}
            disabled={isConfirming}
            variant="destructive"
            onClick={() => void handleConfirm()}
          >
            {resolvedConfirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
