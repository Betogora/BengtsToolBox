import { Clock3 } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { IftaInput } from '@/components/ui/ifta-field'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'

type TimePickerProps = {
  label: string
  value: string
  onValueChange: (value: string) => void
  required?: boolean
  disabled?: boolean
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/

export function TimePicker({
  label,
  value,
  onValueChange,
  required = false,
  disabled = false,
}: TimePickerProps) {
  const { t } = useI18n()
  const titleId = useId()
  const hourRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('08')
  const [minutes, setMinutes] = useState('00')
  const valid =
    /^\d{1,2}$/.test(hours) &&
    Number(hours) < 24 &&
    /^\d{1,2}$/.test(minutes) &&
    Number(minutes) < 60
  const selectTime = (time: string) => {
    onValueChange(time)
    setOpen(false)
  }

  return (
    <Popover
      modal
      open={open}
      onOpenChange={(next) => {
        if (next) {
          const parts = timePattern.test(value)
            ? value.split(':')
            : ['08', '00']
          setHours(parts[0])
          setMinutes(parts[1])
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
          hourRef.current?.focus()
          hourRef.current?.select()
        }}
      >
        <h3 id={titleId} className="type-action mb-3">
          {label}
        </h3>
        <div
          className="grid grid-cols-[1fr_auto_1fr] items-start gap-2"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && valid) {
              event.preventDefault()
              selectTime(
                `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`,
              )
            }
          }}
        >
          <label className="grid gap-1 text-center">
            <span className="type-caption text-muted-foreground">
              {t('ui.picker.hours')}
            </span>
            <input
              ref={hourRef}
              aria-label={t('ui.picker.hours')}
              inputMode="numeric"
              pattern="([01]?[0-9]|2[0-3])"
              maxLength={2}
              value={hours}
              onChange={(event) =>
                setHours(event.currentTarget.value.replace(/\D/g, ''))
              }
              className="h-16 w-full rounded-lg border bg-muted/50 text-center text-3xl font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <span
            aria-hidden="true"
            className="pt-8 text-3xl text-muted-foreground"
          >
            :
          </span>
          <label className="grid gap-1 text-center">
            <span className="type-caption text-muted-foreground">
              {t('ui.picker.minutes')}
            </span>
            <input
              aria-label={t('ui.picker.minutes')}
              inputMode="numeric"
              pattern="[0-5]?[0-9]"
              maxLength={2}
              value={minutes}
              onChange={(event) =>
                setMinutes(event.currentTarget.value.replace(/\D/g, ''))
              }
              className="h-16 w-full rounded-lg border bg-muted/50 text-center text-3xl font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        </div>
        <div className="my-3 grid grid-cols-4 gap-1">
          {['06:00', '08:00', '12:00', '18:00'].map((time) => (
            <Button
              type="button"
              key={time}
              size="sm"
              variant="outline"
              className="px-1 tabular-nums"
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
            disabled={!valid}
            onClick={() =>
              selectTime(
                `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`,
              )
            }
          >
            {t('ui.picker.apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
