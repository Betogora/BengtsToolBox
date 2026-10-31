import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import type * as React from 'react'

import { cn } from '@/lib/utils'

// Gemeinsame Verzögerung: 500 ms bis zum ersten Tooltip, beim Weiterwandern sofort.
function TooltipProvider(props: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return <TooltipPrimitive.Provider delayDuration={500} skipDelayDuration={300} {...props} />
}

type TooltipBodyProps = {
  // Einzeilig: nur `title`. Zweizeilig: `title` plus `description` in gedämpfter Farbe.
  title: React.ReactNode
  description?: React.ReactNode
  // Farbpunkte vor dem Titel, etwa für Spieler- oder Gebietsfarben.
  swatch?: string | string[]
}

type TooltipProps = TooltipBodyProps & {
  children: React.ReactElement
  side?: TooltipPrimitive.TooltipContentProps['side']
  align?: TooltipPrimitive.TooltipContentProps['align']
  open?: boolean
  onOpenChange?: (open: boolean) => void
  delayDuration?: number
  disabled?: boolean
  className?: string
}

function tooltipClassName(description: React.ReactNode, className?: string) {
  return cn('btb-tooltip', description != null && 'btb-tooltip--detail', className)
}

function TooltipBody({ description, swatch, title }: TooltipBodyProps) {
  const swatches = swatch ? [swatch].flat() : []

  return (
    <>
      <span className="btb-tooltip__title">
        {swatches.length > 0 && (
          <span aria-hidden="true" className="btb-tooltip__swatches">
            {swatches.map((color) => (
              <span key={color} className="btb-tooltip__swatch" style={{ backgroundColor: color }} />
            ))}
          </span>
        )}
        <span className="min-w-0">{title}</span>
      </span>
      {description != null && <span className="btb-tooltip__description">{description}</span>}
    </>
  )
}

// Ruhender Tooltip ohne Auslöser, Pfeil nach unten; der UI-Katalog zeigt damit die Ausprägungen.
function TooltipPanel(props: TooltipBodyProps) {
  return (
    <div className={tooltipClassName(props.description)} style={{ display: 'grid' }}>
      <span aria-hidden="true" className="absolute left-1/2 top-full -translate-x-1/2">
        <span className="btb-tooltip__arrow" />
      </span>
      <TooltipBody {...props} />
    </div>
  )
}

// Tooltip der Toolbox: Popover-Fläche, folgt dem Farbschema, nur mit Maus oder Tastatur.
// Er ergänzt sichtbare Inhalte und ist nie die einzige Quelle einer Information.
function Tooltip({
  align,
  children,
  className,
  delayDuration,
  description,
  disabled,
  onOpenChange,
  open,
  side = 'top',
  swatch,
  title,
}: TooltipProps) {
  if (disabled) return children

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange} delayDuration={delayDuration}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          data-slot="tooltip"
          side={side}
          align={align}
          sideOffset={0}
          collisionPadding={8}
          className={tooltipClassName(description, className)}
        >
          <TooltipPrimitive.Arrow asChild width={10} height={10}>
            <span className="btb-tooltip__arrow" />
          </TooltipPrimitive.Arrow>
          <TooltipBody title={title} description={description} swatch={swatch} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

export { Tooltip, TooltipPanel, TooltipProvider }
