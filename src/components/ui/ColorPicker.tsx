import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  colorFromWheelPosition,
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
  ariaLabel: string
  className?: string
  disabled?: boolean
  label?: string
  onValueCommit: (color: string) => unknown | Promise<unknown>
  value: string
  variant?: 'compact' | 'field'
}

function didCommitSucceed(result: unknown) {
  if (result === false) {
    return false
  }

  return !(
    result &&
    typeof result === 'object' &&
    'ok' in result &&
    result.ok === false
  )
}

export function ColorPicker({
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
  const [draftColor, setDraftColor] = useState(normalizedValue)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [position, setPosition] = useState(() =>
    wheelPositionFromColor(normalizedValue),
  )
  const wheelRef = useRef<HTMLDivElement>(null)
  const activePointerRef = useRef<number | null>(null)
  const pendingPositionRef = useRef<ColorWheelPosition | null>(null)
  const rafRef = useRef<number | null>(null)

  const applyPosition = (nextPosition: ColorWheelPosition) => {
    setPosition(nextPosition)
    setDraftColor(colorFromWheelPosition(nextPosition))
  }

  const flushPendingPosition = () => {
    rafRef.current = null
    const nextPosition = pendingPositionRef.current
    pendingPositionRef.current = null

    if (nextPosition) {
      applyPosition(nextPosition)
    }
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
    if (isSaving) {
      return
    }

    if (nextOpen) {
      setDraftColor(normalizedValue)
      setPosition(wheelPositionFromColor(normalizedValue))
    }

    setIsOpen(nextOpen)
  }

  const handleCommit = async () => {
    if (isSaving) {
      return
    }

    if (draftColor === normalizedValue) {
      setIsOpen(false)
      return
    }

    setIsSaving(true)

    try {
      const result = await onValueCommit(draftColor)

      if (didCommitSucceed(result)) {
        setIsOpen(false)
      }
    } catch {
      // The owning app exposes its existing synchronization error state.
    } finally {
      setIsSaving(false)
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
    applyPosition({
      hue: (nextPosition.hue + 360) % 360,
      intensity: Math.min(1, Math.max(0, nextPosition.intensity)),
    })
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
              ? 'flex h-11 w-full items-end justify-between gap-3 px-3 pb-1.5 pt-5'
              : 'size-9 p-1',
            className,
          )}
          disabled={disabled}
        >
          {variant === 'field' && (
            <span className="type-field-label absolute mt-[-1.1rem] text-muted-foreground">
              {label}
            </span>
          )}
          <span
            aria-hidden="true"
            className={cn(
              'block rounded-sm border border-black/10 shadow-inner',
              variant === 'field' ? 'h-4 w-full' : 'size-full',
            )}
            style={{ backgroundColor: normalizedValue }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="grid w-[min(15rem,calc(100vw-1.5rem))] gap-3"
        onCloseAutoFocus={(event) => {
          if (isSaving) {
            event.preventDefault()
          }
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="type-label">{t('common.colorPicker.title')}</span>
          <span className="type-caption flex items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-mono tabular-nums">
            <span
              aria-hidden="true"
              className="size-3 rounded-sm border border-black/10"
              style={{ backgroundColor: draftColor }}
            />
            {draftColor}
          </span>
        </div>
        <div
          ref={wheelRef}
          role="slider"
          tabIndex={0}
          aria-label={t('common.colorPicker.wheelAria')}
          aria-valuemax={360}
          aria-valuemin={0}
          aria-valuenow={Math.round(position.hue)}
          aria-valuetext={`${draftColor}, ${Math.round(position.intensity * 100)} %`}
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

            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }

            activePointerRef.current = null
            if (rafRef.current !== null) {
              window.cancelAnimationFrame(rafRef.current)
              flushPendingPosition()
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }

            activePointerRef.current = null
            pendingPositionRef.current = null
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(6,52,79,0.75)]"
            style={{
              backgroundColor: draftColor,
              left: `${markerPosition.left}%`,
              top: `${markerPosition.top}%`,
            }}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={isSaving}
            onClick={() => setIsOpen(false)}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={() => void handleCommit()}
          >
            {t('common.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
