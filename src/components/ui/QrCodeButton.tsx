import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QrCode } from '@/components/ui/QrCode'
import { cn } from '@/lib/utils'

// Kleine QR-Vorschau, die sich zum bildschirmfüllenden Scan-Dialog vergrößert.
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
        <button
          type="button"
          aria-label={openLabel}
          className="shrink-0 rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <Card
            className={cn(
              'grid size-[72px] place-items-center overflow-hidden bg-white p-2 shadow-[0_18px_46px_-30px_rgba(6,52,79,0.55)] transition-all hover:-translate-y-0.5 hover:border-primary/45',
              className,
            )}
          >
            <QrCode label={label} value={value} className="size-full" />
          </Card>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[min(calc(100%-2rem),26rem)] max-w-none p-5 sm:p-6">
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <QrCode label={label} value={value} className="w-full" />
      </DialogContent>
    </Dialog>
  )
}
