import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
  getWeekStartLocalDate,
  isValidLocalDate,
} from '@/lib/localDates'
import { Button } from '@/components/ui/button'
import { IftaInput } from '@/components/ui/ifta-field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  onValueCommit?: (value: string) => void
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void
  required?: boolean
  disabled?: boolean
}

function parseDateInput(value: string) {
  const germanDate = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
  const canonical = germanDate
    ? `${germanDate[3]}-${germanDate[2]}-${germanDate[1]}`
    : value
  return isValidLocalDate(canonical) ? canonical : null
}

export function DatePicker({
  label,
  value,
  onValueChange,
  onValueCommit,
  onKeyDown,
  required = false,
  disabled = false,
}: DatePickerProps) {
  const { t, locale, language } = useI18n()
  const formatters = useMemo(() => ({
    month: new Intl.DateTimeFormat(locale, { month: 'long' }),
    monthYear: new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }),
    weekdayShort: new Intl.DateTimeFormat(locale, { weekday: 'short' }),
    day: new Intl.DateTimeFormat(locale, {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    }),
  }), [locale])
  const titleId = useId()
  const calendarRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const today = getCurrentLocalDate()
  const initialDate = isValidLocalDate(value) ? value : today
  const displayedValue =
    language === 'de' && isValidLocalDate(value)
      ? `${value.slice(8)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
      : value
  const [viewDate, setViewDate] = useState(initialDate)
  const [focusedDate, setFocusedDate] = useState(initialDate)
  const monthStart = `${viewDate.slice(0, 7)}-01`
  const gridStart = getWeekStartLocalDate(monthStart)
  const dates = Array.from({ length: 42 }, (_, index) =>
    addDaysToLocalDate(gridStart, index),
  )
  const month = Number(viewDate.slice(5, 7))
  const year = Number(viewDate.slice(0, 4))
  const dateLabel = (date: string, formatter: Intl.DateTimeFormat) =>
    formatter.format(
      new Date(
        Number(date.split('-')[0]),
        Number(date.split('-')[1]) - 1,
        Number(date.split('-')[2]),
        12,
      ),
    )

  const changeView = (date: string) => {
    if (!isValidLocalDate(date)) return
    setViewDate(date)
    setFocusedDate(date)
  }

  const focusDate = (date: string) => {
    if (!isValidLocalDate(date)) return
    changeView(date)
    requestAnimationFrame(() =>
      calendarRef.current
        ?.querySelector<HTMLButtonElement>(`[data-picker-date="${date}"]`)
        ?.focus(),
    )
  }
  const selectDate = (date: string) => {
    onValueChange(date)
    onValueCommit?.(date)
    setOpen(false)
  }
  const navigateDay = (
    event: KeyboardEvent<HTMLButtonElement>,
    date: string,
  ) => {
    const dayOfWeek = (new Date(`${date}T12:00:00`).getDay() + 6) % 7
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -dayOfWeek,
      End: 6 - dayOfWeek,
    }
    if (event.key in offsets) {
      event.preventDefault()
      focusDate(addDaysToLocalDate(date, offsets[event.key]))
    } else if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      focusDate(
        addMonthsToLocalDate(
          date,
          (event.key === 'PageUp' ? -1 : 1) * (event.shiftKey ? 12 : 1),
        ),
      )
    }
  }

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setViewDate(initialDate)
          setFocusedDate(initialDate)
        }
        setOpen(next)
      }}
    >
      <div className="relative min-w-0">
        <IftaInput
          label={label}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(value && !parseDateInput(value))}
          value={editing ? draft : displayedValue}
          placeholder={language === 'de' ? 'TT.MM.JJJJ' : 'YYYY-MM-DD'}
          pattern="(\d{4}-\d{2}-\d{2}|\d{2}\.\d{2}\.\d{4})"
          autoComplete="off"
          className="pr-9 text-[0.8rem] tabular-nums sm:text-sm"
          ref={(input) => {
            input?.setCustomValidity(
              value && !parseDateInput(value)
                ? t('ui.picker.invalidDate')
                : '',
            )
          }}
          onFocus={() => {
            setDraft(displayedValue)
            setEditing(true)
          }}
          onBlur={(event) => {
            setEditing(false)
            const canonical = parseDateInput(event.currentTarget.value)
            if (canonical !== null || (!required && !event.currentTarget.value)) {
              onValueCommit?.(canonical ?? '')
            }
          }}
          onChange={(event) => {
            const next = event.currentTarget.value
            setDraft(next)
            onValueChange(parseDateInput(next) ?? next)
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.key === 'ArrowDown' && event.altKey) {
              event.preventDefault()
              setViewDate(initialDate)
              setFocusedDate(initialDate)
              setOpen(true)
            }
          }}
        />
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-1 top-1 size-9 text-muted-foreground"
            aria-label={`${t('ui.picker.openCalendar')}: ${label}`}
          >
            <CalendarDays aria-hidden="true" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="w-[304px] max-w-[calc(100vw-1.5rem)] bg-card text-foreground"
        align="start"
        collisionPadding={12}
        aria-labelledby={titleId}
        data-date-picker
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          calendarRef.current
            ?.querySelector<HTMLButtonElement>(
              `[data-picker-date="${focusedDate}"]`,
            )
            ?.focus()
        }}
      >
        <h3 id={titleId} className="sr-only">
          {label}
        </h3>
        <p className="sr-only" aria-live="polite">
          {dateLabel(viewDate, formatters.monthYear)}
        </p>
        <div className="mb-3 flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('ui.picker.previousMonth')}
            onClick={() => {
              const date = addMonthsToLocalDate(viewDate, -1)
              changeView(date)
            }}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Select
            value={String(month)}
            onValueChange={(next) => {
              const date = addMonthsToLocalDate(viewDate, Number(next) - month)
              changeView(date)
            }}
          >
            <SelectTrigger
              aria-label={t('ui.picker.month')}
              className="min-w-0 flex-1 border-0 bg-transparent px-2 shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, index) => (
                <SelectItem key={index} value={String(index + 1)}>
                  {dateLabel(
                    `${year}-${String(index + 1).padStart(2, '0')}-01`,
                    formatters.month,
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            key={year}
            defaultValue={year}
            aria-label={t('ui.picker.year')}
            inputMode="numeric"
            maxLength={4}
            className="type-action h-9 w-14 rounded-md bg-muted text-center tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onBlur={(event) => {
              const next = Number(event.currentTarget.value)
              if (/^\d{4}$/.test(event.currentTarget.value) && next >= 1000) {
                const date = `${next}-${String(month).padStart(2, '0')}-01`
                changeView(date)
              } else event.currentTarget.value = String(year)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={t('ui.picker.nextMonth')}
            onClick={() => {
              const date = addMonthsToLocalDate(viewDate, 1)
              changeView(date)
            }}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div
          ref={calendarRef}
          role="grid"
          aria-label={dateLabel(viewDate, formatters.monthYear)}
        >
          <div role="row" className="mb-1 grid grid-cols-7">
            {dates.slice(0, 7).map((date) => (
              <span
                role="columnheader"
                aria-label={dateLabel(date, formatters.weekday)}
                key={date}
                className="type-caption py-2 text-center text-muted-foreground"
              >
                {dateLabel(date, formatters.weekdayShort)}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div role="row" key={week} className="grid grid-cols-7 gap-0.5">
              {dates.slice(week * 7, week * 7 + 7).map((date) => (
                <div role="gridcell" key={date} aria-selected={date === value}>
                  <button
                    type="button"
                    data-picker-date={date}
                    disabled={!isValidLocalDate(date)}
                    tabIndex={date === focusedDate ? 0 : -1}
                    aria-label={dateLabel(date, formatters.day)}
                    aria-current={date === today ? 'date' : undefined}
                    className={cn(
                      'type-ui h-9 w-full rounded-md tabular-nums outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                      date.slice(0, 7) !== viewDate.slice(0, 7) &&
                        'text-muted-foreground',
                      date === today &&
                        date !== value &&
                        'font-semibold text-primary underline decoration-primary/50 underline-offset-4',
                      date === value &&
                        'bg-primary font-semibold text-primary-foreground hover:bg-primary/90',
                    )}
                    onFocus={() => setFocusedDate(date)}
                    onKeyDown={(event) => navigateDay(event, date)}
                    onClick={() => selectDate(date)}
                  >
                    {Number(date.slice(8))}
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => selectDate(today)}
          >
            {t('common.today')}
          </Button>
          {!required && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!value}
              onClick={() => selectDate('')}
            >
              {t('ui.picker.clear')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
