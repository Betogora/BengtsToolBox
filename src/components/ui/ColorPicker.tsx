import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

import {
  colorFromWheelPosition,
  colorPickerPresets,
  getWheelMarkerPosition,
  normalizePickerColor,
  type ColorWheelPosition,
  wheelPositionFromColor,
  wheelPositionFromPoint,
} from '@/components/ui/colorPickerLogic'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type ColorPickerProps = {
  align?: 'start' | 'center' | 'end'
  ariaLabel: string
  className?: string
  disabled?: boolean
  label?: string
  onValueCommit: (color: string) => unknown | Promise<unknown>
  value: string
  variant?: 'compact' | 'field'
}

export function ColorPicker({
  align = 'end',
  ariaLabel,
  className,
  disabled = false,
  label,
  onValueCommit,
  value,
  variant = 'compact',
}: ColorPickerProps) {
  const { t } = useI18n()
  const normalizedValue = normalizePickerColor(value)
  const [previewColor, setPreviewColor] = useState(normalizedValue)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState(() =>
    wheelPositionFromColor(normalizedValue),
  )
  const wheelRef = useRef<HTMLDivElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const pendingPositionRef = useRef<ColorWheelPosition | null>(null)
  const rafRef = useRef<number | null>(null)

  const applyPosition = (nextPosition: ColorWheelPosition) => {
    const nextColor = colorFromWheelPosition(nextPosition)

    setPosition(nextPosition)
    setPreviewColor(nextColor)

    return nextColor
  }

  const applyPositionFromColor = (nextColor: string) => {
    setPosition(wheelPositionFromColor(nextColor))
    setPreviewColor(nextColor)
  }

  const flushPendingPosition = () => {
    rafRef.current = null
    const nextPosition = pendingPositionRef.current
    pendingPositionRef.current = null

    if (nextPosition) {
      return applyPosition(nextPosition)
    }

    return null
  }

  const schedulePosition = (nextPosition: ColorWheelPosition) => {
    pendingPositionRef.current = nextPosition

    if (rafRef.current === null) {
      rafRef.current = window.requestAnimationFrame(flushPendingPosition)
    }
  }

  const updateFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = wheelRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    schedulePosition(
      wheelPositionFromPoint(
        event.clientX - rect.left,
        event.clientY - rect.top,
        Math.min(rect.width, rect.height),
      ),
    )
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      applyPositionFromColor(normalizedValue)
    }

    setIsOpen(nextOpen)
  }

  const commitColor = async (nextColor: string) => {
    if (nextColor === normalizedValue) {
      return
    }

    try {
      await onValueCommit(nextColor)
    } catch {
      // The owning app exposes its existing synchronization error state.
    }
  }

  const handleWheelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const nextPosition = { ...position }

    if (event.key === 'ArrowLeft') nextPosition.hue -= 5
    else if (event.key === 'ArrowRight') nextPosition.hue += 5
    else if (event.key === 'ArrowUp') nextPosition.intensity += 0.05
    else if (event.key === 'ArrowDown') nextPosition.intensity -= 0.05
    else return

    event.preventDefault()
    const nextColor = applyPosition({
      hue: (nextPosition.hue + 360) % 360,
      intensity: Math.min(1, Math.max(0, nextPosition.intensity)),
    })
    void commitColor(nextColor)
  }

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }
    },
    [],
  )

  const markerPosition = getWheelMarkerPosition(position)

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            'group relative shrink-0 rounded-md border bg-background shadow-xs outline-none transition-colors hover:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/45 disabled:pointer-events-none disabled:opacity-50',
            variant === 'field'
              ? 'flex h-10 w-full items-center gap-2.5 bg-card px-3 text-left'
              : 'size-9 p-0.5',
            className,
          )}
          disabled={disabled}
        >
          <span
            aria-hidden="true"
            className={cn(
              'block shrink-0 border border-black/10',
              variant === 'field' ? 'size-[1.125rem] rounded-[5px]' : 'size-full rounded-sm shadow-inner',
            )}
            style={{
              backgroundColor: isOpen ? previewColor : normalizedValue,
            }}
          />
          {variant === 'field' && (
            <>
              <span className="type-ui min-w-0 flex-1 truncate">{label}</span>
              <span className="type-caption shrink-0 text-muted-foreground tabular-nums">
                {isOpen ? previewColor : normalizedValue}
              </span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-[min(17rem,calc(100vw-1.5rem))]"
      >
        <div
          ref={wheelRef}
          role="slider"
          tabIndex={0}
          aria-label={t('common.colorPicker.wheelAria')}
          aria-valuemax={360}
          aria-valuemin={0}
          aria-valuenow={Math.round(position.hue)}
          aria-valuetext={`${previewColor}, ${Math.round(position.intensity * 100)} %`}
          className="relative mx-auto aspect-square w-full max-w-48 touch-none rounded-full border shadow-inner outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          style={{
            backgroundImage:
              'radial-gradient(circle, #fff 0%, rgb(255 255 255 / 0) 100%), conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
          }}
          onKeyDown={handleWheelKeyDown}
          onPointerDown={(event) => {
            activePointerRef.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
            updateFromPointer(event)
          }}
          onPointerMove={(event) => {
            if (activePointerRef.current === event.pointerId) {
              updateFromPointer(event)
            }
          }}
          onPointerUp={(event) => {
            if (activePointerRef.current !== event.pointerId) {
              return
            }

            updateFromPointer(event)

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }

            activePointerRef.current = null
            if (rafRef.current !== null) {
              window.cancelAnimationFrame(rafRef.current)
            }

            const nextColor = flushPendingPosition()

            if (nextColor) {
              void commitColor(nextColor)
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }

            activePointerRef.current = null
            pendingPositionRef.current = null

            if (rafRef.current !== null) {
              window.cancelAnimationFrame(rafRef.current)
              rafRef.current = null
            }
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(6,52,79,0.75)]"
            style={{
              backgroundColor: previewColor,
              left: `${markerPosition.left}%`,
              top: `${markerPosition.top}%`,
            }}
          />
        </div>
        {/* Schnellwahl unter dem Farbrad; die gewählte Farbe trägt einen Ring. */}
        <div
          role="radiogroup"
          aria-label={t('common.colorPicker.presetsAria')}
          className="mt-3 grid grid-cols-7 justify-items-center gap-2 border-t pt-3"
        >
          {colorPickerPresets.map((preset) => {
            const presetColor = normalizePickerColor(preset)
            const isSelected = presetColor === previewColor

            return (
              <button
                key={presetColor}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={t('common.colorPicker.presetAria', { color: presetColor })}
                className={cn(
                  'size-7 rounded-full shadow-xs ring-offset-2 ring-offset-popover transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  isSelected ? 'ring-2 ring-foreground/70' : 'hover:scale-110',
                )}
                style={{ backgroundColor: presetColor }}
                onClick={() => {
                  applyPositionFromColor(presetColor)
                  void commitColor(presetColor)
                }}
              />
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
