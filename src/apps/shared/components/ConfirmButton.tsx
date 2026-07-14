import { useRef, useState, type ReactNode } from 'react'

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
import { useI18n } from '@/lib/i18n'

export function ConfirmButton({
  children,
  confirmLabel,
  description,
  onConfirm,
  title,
  trigger,
}: {
  children?: ReactNode
  confirmLabel?: string
  description: string
  onConfirm: () => void | Promise<unknown>
  title: string
  trigger: ReactNode
}) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)
  const resolvedConfirmLabel = confirmLabel ?? t('common.confirm')

  const handleConfirm = async () => {
    if (isConfirming) return

    setIsConfirming(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.defaultPrevented) {
            event.preventDefault()
            void handleConfirm()
          }
        }}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          confirmButtonRef.current?.focus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
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
