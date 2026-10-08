import { Clock3 } from 'lucide-react'
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

import { Button } from '@/components/ui/button'
import { IftaInput } from '@/components/ui/ifta-field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type TimePickerProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/
const quickTimes = ['06:00', '08:00', '12:00', '18:00']
const rowHeight = 34
const visibleRows = 5
const columnPadding = ((visibleRows - 1) / 2) * rowHeight

const pad = (number: number) => String(number).padStart(2, '0')

export function TimePicker({
  label,
  value,
  onValueChange,
  required = false,
  disabled = false,
}: TimePickerProps) {
  const { t } = useI18n()
  const titleId = useId()
  const hourRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState(8)
  const [minutes, setMinutes] = useState(0)
  const selectTime = (time: string) => {
    onValueChange(time)
    setOpen(false)
  }
  const applySelection = () => selectTime(`${pad(hours)}:${pad(minutes)}`)

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const [nextHours, nextMinutes] = timePattern.test(value)
            ? value.split(':').map(Number)
            : [8, 0]
          setHours(nextHours)
          setMinutes(nextMinutes)
        }
        setOpen(next)
      }}
    >
      <div className="relative min-w-0">
        <IftaInput
          label={label}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(value && !timePattern.test(value))}
          placeholder="HH:mm"
          maxLength={5}
          pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
          autoComplete="off"
          value={value}
          className="pr-11 tabular-nums"
          ref={(input) => {
            input?.setCustomValidity(
              value && !timePattern.test(value)
                ? t('ui.picker.invalidTime')
                : '',
            )
          }}
          onChange={(event) => onValueChange(event.currentTarget.value)}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-1 top-1 size-9 text-muted-foreground"
            aria-label={`${t('ui.picker.openTime')}: ${label}`}
          >
            <Clock3 aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-[280px] max-w-[calc(100vw-1.5rem)] bg-card text-foreground"
        align="start"
        collisionPadding={12}
        aria-labelledby={titleId}
        data-time-picker
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          hourRef.current?.focus({ preventScroll: true })
        }}
      >
        <h3 id={titleId} className="type-action mb-2">
          {label}
        </h3>
        <div
          className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-1"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              applySelection()
            }
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-[8px] bg-muted"
            style={{ height: rowHeight }}
          />
          <TimeColumn
            count={24}
            label={t('ui.picker.hours')}
            listRef={hourRef}
            value={hours}
            onValueChange={setHours}
          />
          <span
            aria-hidden="true"
            className="relative text-base font-semibold text-muted-foreground"
          >
            :
          </span>
          <TimeColumn
            count={60}
            label={t('ui.picker.minutes')}
            value={minutes}
            onValueChange={setMinutes}
          />
        </div>
        <div className="my-3 grid grid-cols-4 gap-1.5">
          {quickTimes.map((time) => (
            <Button
              type="button"
              key={time}
              size="sm"
              variant="outline"
              className="h-[30px] rounded-full px-0 tabular-nums shadow-none"
              onClick={() => selectTime(time)}
            >
              {time}
            </Button>
          ))}
        </div>
        <div className="flex justify-between gap-2 border-t pt-3">
          {!required && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!value}
              onClick={() => selectTime('')}
            >
              {t('ui.picker.clear')}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={applySelection}
          >
            {t('ui.picker.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function TimeColumn({
  count,
  label,
  listRef,
  value,
  onValueChange,
}: {
  count: number
  label: string
  listRef?: RefObject<HTMLDivElement | null>
  value: number
  onValueChange: (value: number) => void
}) {
  const optionIdPrefix = useId()
  const ownRef = useRef<HTMLDivElement>(null)
  const ref = listRef ?? ownRef
  const settleTimer = useRef<number | undefined>(undefined)
  const valueRef = useRef(value)
  const scrolledValue = useRef<number | null>(null)

  useLayoutEffect(() => {
    valueRef.current = value
  }, [value])

  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = valueRef.current * rowHeight
  }, [ref])

  useEffect(() => {
    if (scrolledValue.current === value) {
      scrolledValue.current = null
      return
    }
    const list = ref.current
    const top = value * rowHeight
    if (!list || Math.abs(list.scrollTop - top) < 1) return
    const reduceMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (typeof list.scrollTo === 'function') {
      list.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' })
    } else {
      list.scrollTop = top
    }
  }, [ref, value])

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  const select = (next: number) => {
    window.clearTimeout(settleTimer.current)
    onValueChange((next + count) % count)
  }

  return (
    <div
      ref={ref}
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${optionIdPrefix}-${value}`}
      className="relative snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-[8px] outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/50 [&::-webkit-scrollbar]:hidden"
      style={{
        height: rowHeight * visibleRows,
        paddingBlock: columnPadding,
      }}
      onKeyDown={(event) => {
        const step = {
          ArrowDown: 1,
          ArrowUp: -1,
          PageDown: 5,
          PageUp: -5,
        }[event.key]
        if (step !== undefined) {
          event.preventDefault()
          select(value + step)
        } else if (event.key === 'Home' || event.key === 'End') {
          event.preventDefault()
          select(event.key === 'Home' ? 0 : count - 1)
        }
      }}
      onScroll={() => {
        window.clearTimeout(settleTimer.current)
        settleTimer.current = window.setTimeout(() => {
          const list = ref.current
          if (!list) return
          const index = Math.min(
            count - 1,
            Math.max(0, Math.round(list.scrollTop / rowHeight)),
          )
          if (index !== valueRef.current) {
            scrolledValue.current = index
            onValueChange(index)
          }
        }, 110)
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const distance = Math.abs(index - value)

        return (
          <div
            key={index}
            id={`${optionIdPrefix}-${index}`}
            role="option"
            aria-selected={index === value}
            className={cn(
              'flex cursor-pointer snap-center items-center justify-center tabular-nums transition-colors select-none',
              distance === 0 && 'text-base font-[650] text-foreground',
              distance === 1 && 'text-[15px] text-muted-foreground',
              distance > 1 && 'text-[15px] text-subtle-foreground',
            )}
            style={{ height: rowHeight }}
            onClick={() => select(index)}
          >
            {pad(index)}
          </div>
        )
      })}
    </div>
  )
}
