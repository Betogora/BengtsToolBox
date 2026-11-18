import { QrCode as QrCodeIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QrCode } from '@/components/ui/QrCode'

// Icon-Button, der den QR-Code bildschirmfüllend zum Scannen öffnet.
export function QrCodeButton({
  className,
  label,
  openLabel,
  value,
}: {
  className?: string
  label: string
  openLabel: string
  value: string
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button aria-label={openLabel} className={className} size="icon" type="button" variant="outline">
          <QrCodeIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100%-2rem),26rem)] max-w-none p-5 sm:p-6">
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <QrCode label={label} value={value} className="w-full" />
      </DialogContent>
    </Dialog>
  )
}
