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

export function ConfirmButton({
  children,
  confirmLabel = 'Bestätigen',
  description,
  onConfirm,
  title,
  trigger,
}: {
  children?: ReactNode
  confirmLabel?: string
  description: string
  onConfirm: () => void | Promise<void>
  title: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

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
            <Button disabled={isConfirming} variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            ref={confirmButtonRef}
            disabled={isConfirming}
            variant="destructive"
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
