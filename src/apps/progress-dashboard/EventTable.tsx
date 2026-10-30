import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'

import type {
  ProgressDataset,
  ProgressEvent,
  ProgressEventIcon,
} from '@/apps/progress-dashboard/types'
import type { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { eventIconComponents } from '@/apps/progress-dashboard/eventIcons'
import { getEventTable } from '@/apps/progress-dashboard/logic'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { DatePicker } from '@/components/ui/DatePicker'
import { DeleteButton } from '@/components/ui/DeleteButton'
import { TimePicker } from '@/components/ui/TimePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import { isValidLocalDate } from '@/lib/localDates'

// Nur eine Darstellung wird aufgebaut; beide gleichzeitig verdoppeln die teuren Zeilen.
const desktopQuery = '(min-width: 48rem)'
const subscribeDesktop = (onChange: () => void) => {
  const query = window.matchMedia(desktopQuery)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
const useIsDesktop = () =>
  useSyncExternalStore(
    subscribeDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  )

// So viele Zeilen erscheinen sofort beim Aufklappen, der Rest folgt im Hintergrund.
const initialRowCount = 12

const drinkValueOptions = [
  0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
]

function getDrinkValueSelectValue(value: number) {
  const absoluteValue = Math.abs(value)
  const matchingValue = drinkValueOptions.find(
    (option) => Math.abs(option - absoluteValue) < 0.001,
  )

  return String(matchingValue ?? 1)
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDateTimeLocalValue(value: string, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function ProgressEventDateTime({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(toDateTimeLocalValue(value))
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(toDateTimeLocalValue(value))
  }
  const date = draft.split('T')[0]
  const time = draft.split('T')[1] ?? ''
  const update = (nextDate: string, nextTime: string) => {
    const next = `${nextDate}T${nextTime}`
    setDraft(next)
    if (isValidLocalDate(nextDate) && /^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) {
      onValueChange(fromDateTimeLocalValue(next, value))
    }
  }

  return (
    <div className="grid min-w-0 gap-2 min-[24rem]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:min-w-[16.5rem]">
      <DatePicker
        required
        label={t('ui.picker.date')}
        value={date}
        onValueChange={(next) => update(next, time)}
      />
      <TimePicker
        required
        label={t('ui.picker.time')}
        value={time}
        onValueChange={(next) => update(date, next)}
      />
    </div>
  )
}

export function EventTable({
  dataset,
  icons,
  onDeleteEvent,
  onUpdateEvent,
}: {
  dataset: ProgressDataset
  icons: ReturnType<typeof useProgressDashboard>['progressEventIcons']
  onDeleteEvent: (eventId: string) => void
  onUpdateEvent: (
    eventId: string,
    partialValue: Partial<
      Pick<ProgressEvent, 'createdAtClientIso' | 'icon' | 'valueDelta'>
    >,
  ) => void
}) {
  const { t } = useI18n()
  const isDesktop = useIsDesktop()
  const allEvents = useMemo(() => getEventTable(dataset.events), [dataset.events])
  const [showAllRows, setShowAllRows] = useState(false)
  const events = showAllRows ? allEvents : allEvents.slice(0, initialRowCount)

  useEffect(() => {
    startTransition(() => setShowAllRows(true))
  }, [])

  if (events.length === 0) {
    return (
      <EmptyState>
        {t('progress.emptyEvents')}
      </EmptyState>
    )
  }

  const renderDateInput = (event: ProgressEvent) => (
    <ProgressEventDateTime
      value={event.createdAtClientIso}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          createdAtClientIso: value,
        })
      }
    />
  )
  const renderPlayerLabel = (event: ProgressEvent) => (
    <div className="type-label flex min-w-0 items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: event.playerColor }}
      />
      <span className="min-w-0 break-words">{event.playerName}</span>
    </div>
  )
  const renderValueControls = (event: ProgressEvent) => (
    <div className="flex gap-2">
      <Select
        value={event.valueDelta < 0 ? '-' : '+'}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (value === '-' ? -1 : 1) * Math.abs(event.valueDelta || 1),
          })
        }
      >
        <SelectTrigger
          aria-label={`${t('progress.eventSign')}: ${event.playerName}`}
          className="w-20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="+">+</SelectItem>
          <SelectItem value="-">-</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={getDrinkValueSelectValue(event.valueDelta)}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (event.valueDelta < 0 ? -1 : 1) * Number(value),
          })
        }
      >
        <SelectTrigger
          aria-label={`${t('progress.eventValue')}: ${event.playerName}`}
          className="w-28"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {drinkValueOptions.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {formatNumber(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  const renderIconSelect = (event: ProgressEvent) => (
    <Select
      value={event.icon}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          icon: value as ProgressEventIcon,
        })
      }
    >
      <SelectTrigger aria-label={`Icon: ${event.playerName}`} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {icons.map((icon) => (
          <SelectItem key={icon.id} value={icon.id}>
            <span className="flex items-center gap-2">
              {(() => {
                const Icon = eventIconComponents[icon.id]

                return <Icon className="size-4" />
              })()}
              {icon.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const renderDeleteButton = (event: ProgressEvent) => (
    <ConfirmButton
      mode="popover"
      title={t('common.event.delete')}
      description={t('common.event.deleteDescription')}
      onConfirm={() => onDeleteEvent(event.id)}
      trigger={<DeleteButton aria-label={t('common.event.delete')} />}
    />
  )

  if (!isDesktop) {
    return (
      <div className="grid gap-2">
        {events.map((event) => (
          <div
            key={event.id}
            className="type-ui rounded-md border bg-card p-3"
            style={{ backgroundColor: `color-mix(in srgb, ${event.playerColor} 12%, var(--card))` }}
          >
            <div className="flex items-start justify-between gap-3">
              {renderPlayerLabel(event)}
              {renderDeleteButton(event)}
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                {renderDateInput(event)}
              </div>
              <div className="grid gap-3 min-[26rem]:grid-cols-2">
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    {t('progress.eventValue')}
                  </div>
                  {renderValueControls(event)}
                </div>
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    Icon
                  </div>
                  {renderIconSelect(event)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Table className="min-w-[760px]">
      <TableHeader>
          <TableHead>{t('progress.time')}</TableHead>
          <TableHead>{t('common.player')}</TableHead>
          <TableHead>{t('progress.eventValue')}</TableHead>
          <TableHead>Icon</TableHead>
          <TableHead className="text-right">{t('decisionWheel.action')}</TableHead>
      </TableHeader>
      <TableBody>
        {events.map((event) => (
          <TableRow key={event.id}>
            <TableCell>
              {renderDateInput(event)}
            </TableCell>
            <TableCell>
              <div className="type-label flex items-center gap-2">
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: event.playerColor }}
                />
                {event.playerName}
              </div>
            </TableCell>
            <TableCell>
              {renderValueControls(event)}
            </TableCell>
            <TableCell>
              {renderIconSelect(event)}
            </TableCell>
            <TableCell className="text-right">
              {renderDeleteButton(event)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
