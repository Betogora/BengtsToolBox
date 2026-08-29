import {
  Bike,
  CalendarDays,
  ChevronDown,
  Clock3,
  Copy,
  Footprints,
  Pencil,
  Plus,
  Trash2,
  Waves,
} from 'lucide-react'
import type { FormEvent, ReactNode } from 'react'
import { useMemo, useState } from 'react'

import type {
  ActualTraining,
  CyclingContext,
  Discipline,
  IntervalSegment,
  PlannedTraining,
  RunningContext,
  SwimmingContext,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import {
  addDaysToLocalDate,
  averagePaceSeconds,
  durationSecondsFromAveragePace,
  formatPace,
  getWeekStartLocalDate,
  isValidLocalDate,
  parsePace,
  validateActualTraining,
} from '@/apps/triathlon-tracker/domain'
import type {
  ActualTrainingInput,
  PlannedTrainingInput,
  PlannedWeekCopyPreview,
} from '@/apps/triathlon-tracker/hooks/useTriathlonTracker'
import { disciplineColors } from '@/apps/triathlon-tracker/presentation'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
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
import { cn } from '@/lib/utils'

export type {
  ActualTrainingInput,
  PlannedTrainingInput,
  PlannedWeekCopyPreview,
} from '@/apps/triathlon-tracker/hooks/useTriathlonTracker'

type CalendarEntry =
  | { kind: 'planned'; value: PlannedTraining }
  | { kind: 'actual'; value: ActualTraining }

const disciplineIcons = {
  swim: Waves,
  bike: Bike,
  run: Footprints,
} satisfies Record<Discipline, typeof Waves>

function isoDateAtNoon(localDate: string) {
  return new Date(`${localDate}T12:00:00`)
}

function toLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthDates(activeLocalDate: string) {
  const active = isoDateAtNoon(activeLocalDate)
  const first = new Date(active.getFullYear(), active.getMonth(), 1, 12)
  const last = new Date(active.getFullYear(), active.getMonth() + 1, 0, 12)
  const firstVisible = getWeekStartLocalDate(toLocalDate(first))
  const lastDay = last.getDay()
  const lastVisible = addDaysToLocalDate(
    toLocalDate(last),
    lastDay === 0 ? 0 : 7 - lastDay,
  )
  const dates: string[] = []

  for (
    let date = firstVisible;
    date <= lastVisible;
    date = addDaysToLocalDate(date, 1)
  ) {
    dates.push(date)
  }

  return dates
}

function secondsToMinutes(seconds: number | null) {
  return seconds === null ? '' : `${seconds / 60}`
}

function roundedMinutes(seconds: number) {
  return `${Number((seconds / 60).toFixed(2))}`
}

function metersToKilometers(meters: number | null) {
  return meters === null ? '' : `${meters / 1000}`
}

function minutesToTime(minutes: number | null) {
  if (minutes === null) return ''
  return `${Math.floor(minutes / 60)}`.padStart(2, '0') + ':' + `${minutes % 60}`.padStart(2, '0')
}

function timeToMinutes(value: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function optionalNumber(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return null
  const roundedMinutes = Math.round(seconds / 60)
  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60
  return hours > 0 ? `${hours} h ${minutes ? `${minutes} min` : ''}`.trim() : `${minutes} min`
}

function formatDistance(meters: number | null, locale: string) {
  if (meters === null) return null
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)} km`
}

function getDisciplineLabel(discipline: Discipline, t: ReturnType<typeof useI18n>['t']) {
  return t(`triathlon.discipline.${discipline}`)
}

function getContextLabel(context: TrainingContext | null, t: ReturnType<typeof useI18n>['t']) {
  return context === null
    ? t('triathlon.context.none')
    : t(`triathlon.context.${context}`)
}

function contextsForDiscipline(discipline: Discipline): TrainingContext[] {
  if (discipline === 'swim') return ['pool-25', 'pool-50', 'open-water']
  if (discipline === 'bike') return ['indoor', 'outdoor']
  return ['road', 'track', 'treadmill']
}

type DefaultTrainingContexts = {
  swim: SwimmingContext
  bike: CyclingContext
  run: RunningContext
}

function defaultContext(
  discipline: Discipline,
  defaultContexts: DefaultTrainingContexts,
): TrainingContext {
  return defaultContexts[discipline]
}

function averagePaceLabel(
  discipline: Discipline,
  t: ReturnType<typeof useI18n>['t'],
) {
  return discipline === 'swim'
    ? t('triathlon.form.averagePace100Meters')
    : t('triathlon.form.averagePaceKilometer')
}

function formattedAveragePace(training: ActualTraining) {
  if (training.durationSeconds === null || training.distanceMeters === null) {
    return null
  }

  const pace = formatPace(averagePaceSeconds(
    training.durationSeconds,
    training.distanceMeters,
    training.discipline,
  ))
  if (!pace) return null
  return `${pace} min/${training.discipline === 'swim' ? '100 m' : 'km'}`
}

function buildEntryLabel(entry: CalendarEntry, locale: string) {
  const duration = formatDuration(entry.value.durationSeconds)
  const distance = formatDistance(entry.value.distanceMeters, locale)
  return [duration, distance].filter(Boolean).join(' · ')
}

function sortCalendarEntries(entries: CalendarEntry[]) {
  return [...entries].sort(
    (left, right) =>
      (left.value.startMinutes ?? Number.MAX_SAFE_INTEGER) -
        (right.value.startMinutes ?? Number.MAX_SAFE_INTEGER) ||
      left.value.position - right.value.position,
  )
}

function entriesForDate(
  localDate: string,
  plannedTrainings: PlannedTraining[],
  actualTrainings: ActualTraining[],
) {
  return sortCalendarEntries([
    ...plannedTrainings
      .filter((training) => training.localDate === localDate)
      .map((value) => ({ kind: 'planned' as const, value })),
    ...actualTrainings
      .filter((training) => training.localDate === localDate)
      .map((value) => ({ kind: 'actual' as const, value })),
  ])
}

function TrainingChip({
  entry,
  onSelect,
}: {
  entry: CalendarEntry
  onSelect: (entry: CalendarEntry) => void
}) {
  const { locale, t } = useI18n()
  const Icon = disciplineIcons[entry.value.discipline]
  const disciplineColor = disciplineColors[entry.value.discipline]
  const label = buildEntryLabel(entry, locale)
  const detail = [
    minutesToTime(entry.value.startMinutes),
    label,
    entry.kind === 'planned' ? entry.value.label : null,
  ].filter(Boolean).join(' · ')

  return (
    <Button
      className={cn(
        'type-caption h-11 w-full min-w-0 items-start justify-start gap-1.5 whitespace-normal rounded-md px-2 py-1.5 text-left shadow-none',
        entry.kind === 'planned'
          ? 'border-dashed bg-background'
          : 'border-solid',
      )}
      style={entry.kind === 'actual' ? {
        backgroundColor: `color-mix(in srgb, ${disciplineColor} 10%, var(--card))`,
        borderColor: `color-mix(in srgb, ${disciplineColor} 40%, var(--border))`,
      } : undefined}
      type="button"
      variant={entry.kind === 'planned' ? 'outline' : 'secondary'}
      onClick={() => onSelect(entry)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" style={{ color: disciplineColor }} />
      <span className="min-w-0 flex-1 overflow-hidden">
        <span className="flex min-w-0 items-center gap-1 leading-4">
          <span className="truncate">{getDisciplineLabel(entry.value.discipline, t)}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">
            {entry.kind === 'planned' ? t('triathlon.status.planned') : t('triathlon.status.actual')}
          </span>
        </span>
        {detail && (
          <span className="block truncate leading-4 text-muted-foreground">
            {detail}
          </span>
        )}
      </span>
    </Button>
  )
}

function AddTrainingCard({
  compact = false,
  date,
  onAdd,
}: {
  compact?: boolean
  date: string
  onAdd: (date: string) => void
}) {
  const { formatDateTime, t } = useI18n()

  return (
    <Button
      aria-label={t('triathlon.calendar.addOnDate', {
        date: formatDateTime(isoDateAtNoon(date), { dateStyle: 'medium' }),
      })}
      className={cn(
        'type-caption h-11 w-full border-dashed px-2 text-muted-foreground shadow-none',
        compact ? 'justify-center' : 'justify-start',
      )}
      type="button"
      variant="outline"
      onClick={() => onAdd(date)}
    >
      <Plus aria-hidden="true" />
      <span className={cn(compact && 'sr-only')}>{t('triathlon.plan.add')}</span>
    </Button>
  )
}

function DayPanel({
  date,
  entries,
  isLastColumn,
  isLastRow,
  isOutsideMonth = false,
  isToday,
  onAdd,
  onSelectEntry,
}: {
  date: string
  entries: CalendarEntry[]
  isLastColumn: boolean
  isLastRow: boolean
  isOutsideMonth?: boolean
  isToday: boolean
  onAdd: (date: string) => void
  onSelectEntry: (entry: CalendarEntry) => void
}) {
  const { formatDateTime } = useI18n()

  return (
    <div
      className={cn(
        'flex h-full min-h-0 min-w-0 flex-col border-b border-r p-2',
        isLastColumn && 'border-r-0',
        isLastRow && 'border-b-0',
        isOutsideMonth && 'bg-muted/30 text-muted-foreground',
      )}
      data-calendar-date={date}
    >
      <div className="mb-2 flex items-center">
        <time
          className={cn(
            'type-caption inline-flex min-w-7 items-center justify-center rounded-md px-1.5 py-1 tabular-nums',
            isToday && 'bg-primary text-primary-foreground',
          )}
          dateTime={date}
        >
          {formatDateTime(isoDateAtNoon(date), { day: 'numeric' })}
        </time>
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto overscroll-contain pr-1">
        {entries.map((entry) => (
          <TrainingChip
            key={`${entry.kind}-${entry.value.id}`}
            entry={entry}
            onSelect={onSelectEntry}
          />
        ))}
        <AddTrainingCard compact date={date} onAdd={onAdd} />
      </div>
    </div>
  )
}

export function MonthCalendar({
  activeLocalDate,
  actualTrainings,
  plannedTrainings,
  todayLocalDate,
  onAdd,
  onSelectEntry,
}: {
  activeLocalDate: string
  actualTrainings: ActualTraining[]
  plannedTrainings: PlannedTraining[]
  todayLocalDate: string
  onAdd: (date: string) => void
  onSelectEntry: (entry: CalendarEntry) => void
}) {
  const { formatDateTime, t } = useI18n()
  const dates = useMemo(() => getMonthDates(activeLocalDate), [activeLocalDate])
  const activeMonth = activeLocalDate.slice(0, 7)
  const weeks = Array.from(
    { length: dates.length / 7 },
    (_, index) => dates.slice(index * 7, index * 7 + 7),
  )
  const monthDates = dates.filter((date) => date.startsWith(activeMonth))
  const [selectedDate, setSelectedDate] = useState(
    todayLocalDate.startsWith(activeMonth) ? todayLocalDate : monthDates[0],
  )
  const selectedEntries = entriesForDate(
    selectedDate,
    plannedTrainings,
    actualTrainings,
  )
  const weekDays = Array.from({ length: 7 }, (_, index) => addDaysToLocalDate('2026-08-17', index))

  return (
    <>
      <div className="hidden overflow-hidden rounded-md border lg:block">
        <div className="grid grid-cols-7 bg-muted/70">
          {weekDays.map((date) => (
            <div className="type-action border-r p-2 text-center last:border-r-0" key={date}>
              {formatDateTime(isoDateAtNoon(date), { weekday: 'short' })}
            </div>
          ))}
        </div>
        <div>
          {weeks.map((week, weekIndex) => {
            const isCurrentWeek = week.includes(todayLocalDate)
            return (
              <div
                className={cn(
                  'relative grid auto-rows-[11.5rem] grid-cols-7',
                  isCurrentWeek && 'z-10 bg-primary/[0.025] ring-1 ring-inset ring-primary/40',
                )}
                data-current-week={isCurrentWeek || undefined}
                key={week[0]}
              >
                {week.map((date, dayIndex) => (
                  <DayPanel
                    date={date}
                    entries={entriesForDate(date, plannedTrainings, actualTrainings)}
                    isLastColumn={dayIndex === 6}
                    isLastRow={weekIndex === weeks.length - 1}
                    isOutsideMonth={!date.startsWith(activeMonth)}
                    isToday={date === todayLocalDate}
                    key={date}
                    onAdd={onAdd}
                    onSelectEntry={onSelectEntry}
                  />
                ))}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        <div className="overflow-hidden rounded-md border bg-background">
          <div className="grid grid-cols-7 border-b bg-muted/70">
            {weekDays.map((date) => (
              <div className="type-caption py-2 text-center text-muted-foreground" key={date}>
                <span aria-hidden="true">
                  {formatDateTime(isoDateAtNoon(date), { weekday: 'narrow' })}
                </span>
                <span className="sr-only">
                  {formatDateTime(isoDateAtNoon(date), { weekday: 'long' })}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-border">
            {dates.map((date) => {
              const entries = entriesForDate(date, plannedTrainings, actualTrainings)
              const isSelected = date === selectedDate
              return (
                <button
                  aria-label={formatDateTime(isoDateAtNoon(date), { dateStyle: 'full' })}
                  aria-current={date === todayLocalDate ? 'date' : undefined}
                  aria-pressed={isSelected}
                  className={cn(
                    'relative flex min-h-12 flex-col items-center justify-center gap-0.5 bg-background py-1.5 text-sm tabular-nums transition-colors hover:bg-accent focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    !date.startsWith(activeMonth) && 'text-muted-foreground',
                    isSelected && 'bg-primary/10 font-semibold text-primary',
                  )}
                  key={date}
                  type="button"
                  onClick={() => setSelectedDate(date)}
                >
                  <span className={cn(
                    'inline-flex size-7 items-center justify-center rounded-full',
                    date === todayLocalDate && 'bg-primary text-primary-foreground',
                  )}>
                    {formatDateTime(isoDateAtNoon(date), { day: 'numeric' })}
                  </span>
                  {entries.length > 0 && (
                    <span className="type-caption leading-none text-muted-foreground">
                      {entries.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <section
          className="flex h-40 min-h-0 flex-col rounded-md border bg-background p-3"
          data-calendar-date={selectedDate}
        >
          <div className="mb-2 flex items-center gap-2">
            <h3 className="type-action">
              <time dateTime={selectedDate}>
                {formatDateTime(isoDateAtNoon(selectedDate), {
                  dateStyle: 'full',
                })}
              </time>
            </h3>
            {selectedDate === todayLocalDate && (
              <Badge variant="secondary">{t('common.today')}</Badge>
            )}
          </div>
          <div className="grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto overscroll-contain pr-1">
            {selectedEntries.map((entry) => (
              <TrainingChip
                key={`${entry.kind}-${entry.value.id}`}
                entry={entry}
                onSelect={onSelectEntry}
              />
            ))}
            <AddTrainingCard date={selectedDate} onAdd={onAdd} />
          </div>
        </section>
      </div>
    </>
  )
}

export function WeekCalendar({
  actualTrainings,
  plannedTrainings,
  todayLocalDate,
  weekStartLocalDate,
  onAdd,
  onSelectEntry,
}: {
  actualTrainings: ActualTraining[]
  plannedTrainings: PlannedTraining[]
  todayLocalDate: string
  weekStartLocalDate: string
  onAdd: (date: string) => void
  onSelectEntry: (entry: CalendarEntry) => void
}) {
  const { formatDateTime } = useI18n()
  const dates = Array.from({ length: 7 }, (_, index) => addDaysToLocalDate(weekStartLocalDate, index))

  return (
    <div className="grid gap-2 lg:grid-cols-7">
      {dates.map((date) => {
        const entries = entriesForDate(date, plannedTrainings, actualTrainings)
        return (
          <section
            className={cn(
              'flex h-28 min-h-0 min-w-0 flex-col rounded-md border bg-background p-2 lg:h-52 lg:p-3',
              date === todayLocalDate && 'border-primary/50 ring-1 ring-primary/15',
            )}
            data-calendar-date={date}
            key={date}
          >
            <div className="mb-2 flex items-center gap-2 lg:mb-3 lg:block">
              <h3 className="type-action lg:text-center">
                <time dateTime={date}>
                  {formatDateTime(isoDateAtNoon(date), {
                    day: '2-digit',
                    month: 'short',
                    weekday: 'short',
                  })}
                </time>
              </h3>
            </div>
            <div className="grid min-h-0 flex-1 content-start gap-1.5 overflow-y-auto overscroll-contain pr-1">
              {entries.map((entry) => (
                <TrainingChip
                  key={`${entry.kind}-${entry.value.id}`}
                  entry={entry}
                  onSelect={onSelectEntry}
                />
              ))}
              <AddTrainingCard date={date} onAdd={onAdd} />
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DisciplineSelect({
  value,
  onValueChange,
}: {
  value: Discipline
  onValueChange: (value: Discipline) => void
}) {
  const { t } = useI18n()
  return (
    <Select value={value} onValueChange={(next) => onValueChange(next as Discipline)}>
      <IftaSelectTrigger label={t('triathlon.form.discipline')}>
        <SelectValue />
      </IftaSelectTrigger>
      <SelectContent>
        {(['swim', 'bike', 'run'] as const).map((discipline) => (
          <SelectItem key={discipline} value={discipline}>
            {getDisciplineLabel(discipline, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

type PlannedTrainingDialogProps = {
  initialDate: string
  open: boolean
  training: PlannedTraining | null
  onDelete?: (id: string) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onSave: (value: PlannedTrainingInput) => Promise<unknown> | unknown
}

export function PlannedTrainingDialog(props: PlannedTrainingDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <PlannedTrainingDialogContent
          key={props.training?.id ?? `new-${props.initialDate}`}
          {...props}
        />
      )}
    </Dialog>
  )
}

function PlannedTrainingDialogContent({
  initialDate,
  training,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<PlannedTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const [localDate, setLocalDate] = useState(training?.localDate ?? initialDate)
  const [startTime, setStartTime] = useState(minutesToTime(training?.startMinutes ?? null))
  const [discipline, setDiscipline] = useState<Discipline>(training?.discipline ?? 'run')
  const [durationMinutes, setDurationMinutes] = useState(secondsToMinutes(training?.durationSeconds ?? null))
  const [distanceKilometers, setDistanceKilometers] = useState(metersToKilometers(training?.distanceMeters ?? null))
  const [label, setLabel] = useState(training?.label ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = optionalNumber(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)

    if (!localDate || (parsedDuration !== null && parsedDuration < 0) || (parsedDistance !== null && parsedDistance < 0)) {
      setError(t('triathlon.form.invalidValues'))
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave({
        localDate,
        startMinutes: timeToMinutes(startTime),
        discipline,
        durationSeconds: parsedDuration === null ? null : Math.round(parsedDuration * 60),
        distanceMeters: parsedDistance === null ? null : Math.round(parsedDistance * 1000),
        label: label.trim().slice(0, 40),
      })
      onOpenChange(false)
    } catch {
      setError(t('triathlon.form.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>
              {training ? t('triathlon.plan.edit') : t('triathlon.plan.add')}
            </DialogTitle>
            <DialogDescription>{t('triathlon.plan.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <IftaInput
              required
              label={t('triathlon.form.date')}
              type="date"
              value={localDate}
              onChange={(event) => setLocalDate(event.currentTarget.value)}
            />
            <IftaInput
              label={t('triathlon.form.timeOptional')}
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.currentTarget.value)}
            />
            <DisciplineSelect value={discipline} onValueChange={setDiscipline} />
            <IftaInput
              inputMode="decimal"
              label={t('triathlon.form.durationMinutes')}
              min="0"
              step="1"
              type="number"
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.currentTarget.value)}
            />
            <IftaInput
              inputMode="decimal"
              label={t('triathlon.form.distanceKilometers')}
              min="0"
              step="0.01"
              type="number"
              value={distanceKilometers}
              onChange={(event) => setDistanceKilometers(event.currentTarget.value)}
            />
            <IftaInput
              className="sm:col-span-1"
              label={t('triathlon.form.shortLabel')}
              maxLength={40}
              value={label}
              onChange={(event) => setLabel(event.currentTarget.value)}
            />
          </div>
          {error && <p className="type-ui text-destructive" role="alert">{error}</p>}
          <DialogFooter className="sm:justify-between">
            <div>
              {training && onDelete && (
                <ConfirmButton
                  description={t('triathlon.plan.deleteDescription')}
                  title={t('triathlon.plan.deleteTitle')}
                  trigger={
                    <Button type="button" variant="destructive">
                      <Trash2 aria-hidden="true" />
                      {t('common.delete')}
                    </Button>
                  }
                  onConfirm={async () => {
                    try {
                      await onDelete(training.id)
                      onOpenChange(false)
                    } catch {
                      setError(t('triathlon.form.saveFailed'))
                    }
                  }}
                />
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('common.cancel')}</Button>
              </DialogClose>
              <Button disabled={isSaving} type="submit">
                {isSaving ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </DialogContent>
  )
}

type IntervalDraft = {
  id: string
  kind: IntervalSegment['kind']
  durationMinutes: string
  distanceMeters: string
  averageHeartRateBpm: string
  averagePowerWatts: string
}

function intervalToDraft(interval: IntervalSegment): IntervalDraft {
  return {
    id: interval.id,
    kind: interval.kind,
    durationMinutes: secondsToMinutes(interval.durationSeconds),
    distanceMeters: interval.distanceMeters === null ? '' : `${interval.distanceMeters}`,
    averageHeartRateBpm: interval.averageHeartRateBpm === null ? '' : `${interval.averageHeartRateBpm}`,
    averagePowerWatts: interval.averagePowerWatts === null ? '' : `${interval.averagePowerWatts}`,
  }
}

function createIntervalDraft(): IntervalDraft {
  return {
    id: `interval-${crypto.randomUUID()}`,
    kind: 'work',
    durationMinutes: '',
    distanceMeters: '',
    averageHeartRateBpm: '',
    averagePowerWatts: '',
  }
}

function IntervalEditor({
  intervals,
  onChange,
}: {
  intervals: IntervalDraft[]
  onChange: (intervals: IntervalDraft[]) => void
}) {
  const { t } = useI18n()

  const update = (id: string, partial: Partial<IntervalDraft>) =>
    onChange(intervals.map((interval) => interval.id === id ? { ...interval, ...partial } : interval))

  return (
    <section className="grid gap-3 rounded-md border bg-secondary/35 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="type-action">{t('triathlon.intervals.title')}</h3>
          <p className="type-caption text-muted-foreground">{t('triathlon.intervals.description')}</p>
        </div>
        <Button
          disabled={intervals.length >= 100}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => onChange([...intervals, createIntervalDraft()])}
        >
          <Plus aria-hidden="true" />
          {t('triathlon.intervals.add')}
        </Button>
      </div>
      {intervals.length === 0 ? (
        <p className="type-ui rounded-md border border-dashed bg-background p-4 text-center text-muted-foreground">
          {t('triathlon.intervals.empty')}
        </p>
      ) : (
        <div className="grid gap-3">
          {intervals.map((interval, index) => (
            <div className="grid gap-2 rounded-md border bg-background p-3" key={interval.id}>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline">{t('triathlon.intervals.number', { number: index + 1 })}</Badge>
                <Button
                  aria-label={t('triathlon.intervals.remove', { number: index + 1 })}
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => onChange(intervals.filter((entry) => entry.id !== interval.id))}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <Select value={interval.kind} onValueChange={(value) => update(interval.id, { kind: value as IntervalSegment['kind'] })}>
                  <IftaSelectTrigger label={t('triathlon.intervals.kind')}>
                    <SelectValue />
                  </IftaSelectTrigger>
                  <SelectContent>
                    <SelectItem value="work">{t('triathlon.intervals.work')}</SelectItem>
                    <SelectItem value="rest">{t('triathlon.intervals.rest')}</SelectItem>
                  </SelectContent>
                </Select>
                <IftaInput
                  label={t('triathlon.form.durationMinutes')}
                  min="0"
                  step="0.1"
                  type="number"
                  value={interval.durationMinutes}
                  onChange={(event) => update(interval.id, { durationMinutes: event.currentTarget.value })}
                />
                <IftaInput
                  label={t('triathlon.form.distanceMeters')}
                  min="0"
                  step="1"
                  type="number"
                  value={interval.distanceMeters}
                  onChange={(event) => update(interval.id, { distanceMeters: event.currentTarget.value })}
                />
                <IftaInput
                  label={t('triathlon.form.averageHeartRate')}
                  min="30"
                  max="250"
                  type="number"
                  value={interval.averageHeartRateBpm}
                  onChange={(event) => update(interval.id, { averageHeartRateBpm: event.currentTarget.value })}
                />
                <IftaInput
                  label={t('triathlon.form.averagePower')}
                  min="0"
                  type="number"
                  value={interval.averagePowerWatts}
                  onChange={(event) => update(interval.id, { averagePowerWatts: event.currentTarget.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

type ActualTrainingDialogProps = {
  defaultContexts: DefaultTrainingContexts
  initialDate: string
  open: boolean
  training: ActualTraining | null
  onDelete?: (id: string) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onSave: (value: ActualTrainingInput) => Promise<unknown> | unknown
}

export function ActualTrainingDialog(props: ActualTrainingDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && (
        <ActualTrainingDialogContent
          key={props.training?.id ?? `new-${props.initialDate}`}
          {...props}
        />
      )}
    </Dialog>
  )
}

function ActualTrainingDialogContent({
  defaultContexts,
  initialDate,
  training,
  onDelete,
  onOpenChange,
  onSave,
}: Omit<ActualTrainingDialogProps, 'open'>) {
  const { t } = useI18n()
  const initialDiscipline = training?.discipline ?? 'run'
  const [localDate, setLocalDate] = useState(training?.localDate ?? initialDate)
  const [startTime, setStartTime] = useState(minutesToTime(training?.startMinutes ?? null))
  const [discipline, setDiscipline] = useState<Discipline>(initialDiscipline)
  const [context, setContext] = useState<TrainingContext | null>(
    training?.context ?? defaultContext(initialDiscipline, defaultContexts),
  )
  const [durationMinutes, setDurationMinutes] = useState(secondsToMinutes(training?.durationSeconds ?? null))
  const [distanceKilometers, setDistanceKilometers] = useState(metersToKilometers(training?.distanceMeters ?? null))
  const [averagePace, setAveragePace] = useState(() => formatPace(
    training?.durationSeconds && training.distanceMeters
      ? averagePaceSeconds(
          training.durationSeconds,
          training.distanceMeters,
          training.discipline,
        )
      : null,
  ))
  const [paceSource, setPaceSource] = useState<'duration' | 'pace'>('duration')
  const [averageHeartRateBpm, setAverageHeartRateBpm] = useState(training?.averageHeartRateBpm === null || !training ? '' : `${training.averageHeartRateBpm}`)
  const [averagePowerWatts, setAveragePowerWatts] = useState(training?.averagePowerWatts === null || !training ? '' : `${training.averagePowerWatts}`)
  const [rpe, setRpe] = useState(training?.rpe === null || !training ? '' : `${training.rpe}`)
  const [intervals, setIntervals] = useState<IntervalDraft[]>((training?.intervals ?? []).map(intervalToDraft))
  const [showDetails, setShowDetails] = useState(Boolean(training && (
    training.averagePowerWatts !== null ||
    training.rpe !== null ||
    training.intervals.length > 0
  )))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [durationWarningConfirmed, setDurationWarningConfirmed] = useState(false)

  const handleDisciplineChange = (nextDiscipline: Discipline) => {
    setDiscipline(nextDiscipline)
    setContext(defaultContext(nextDiscipline, defaultContexts))
    const parsedDuration = optionalNumber(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)
    setAveragePace(
      parsedDuration !== null && parsedDistance !== null
        ? formatPace(averagePaceSeconds(
            parsedDuration * 60,
            parsedDistance * 1_000,
            nextDiscipline,
          ))
        : '',
    )
  }

  const handleDurationChange = (value: string) => {
    setDurationMinutes(value)
    setPaceSource('duration')
    const parsedDuration = optionalNumber(value)
    const parsedDistance = optionalNumber(distanceKilometers)
    setAveragePace(
      parsedDuration !== null && parsedDistance !== null
        ? formatPace(averagePaceSeconds(
            parsedDuration * 60,
            parsedDistance * 1_000,
            discipline,
          ))
        : '',
    )
  }

  const handlePaceChange = (value: string) => {
    setAveragePace(value)
    setPaceSource('pace')
    const parsedAveragePace = parsePace(value)
    const parsedDistance = optionalNumber(distanceKilometers)
    const calculatedDuration =
      parsedAveragePace !== null && parsedDistance !== null
        ? durationSecondsFromAveragePace(
            parsedAveragePace,
            parsedDistance * 1_000,
            discipline,
          )
        : null
    setDurationMinutes(calculatedDuration === null ? '' : roundedMinutes(calculatedDuration))
  }

  const handleDistanceChange = (value: string) => {
    setDistanceKilometers(value)
    const parsedDistance = optionalNumber(value)
    if (parsedDistance === null) {
      setAveragePace('')
      return
    }

    if (paceSource === 'pace') {
      const parsedAveragePace = parsePace(averagePace)
      const calculatedDuration = parsedAveragePace === null
        ? null
        : durationSecondsFromAveragePace(
            parsedAveragePace,
            parsedDistance * 1_000,
            discipline,
          )
      setDurationMinutes(calculatedDuration === null ? '' : roundedMinutes(calculatedDuration))
      return
    }

    const parsedDuration = optionalNumber(durationMinutes)
    setAveragePace(
      parsedDuration === null
        ? ''
        : formatPace(averagePaceSeconds(
            parsedDuration * 60,
            parsedDistance * 1_000,
            discipline,
          )),
    )
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const parsedDuration = optionalNumber(durationMinutes)
    const parsedDistance = optionalNumber(distanceKilometers)
    const parsedAveragePace = averagePace ? parsePace(averagePace) : null
    const parsedHr = optionalNumber(averageHeartRateBpm)
    const parsedPower = optionalNumber(averagePowerWatts)
    const parsedRpe = optionalNumber(rpe)

    if (
      !localDate ||
      ((parsedDuration === null || parsedDuration <= 0) &&
        (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedDuration !== null && parsedDuration < 0) ||
      (parsedDistance !== null && parsedDistance < 0) ||
      (averagePace !== '' && parsedAveragePace === null) ||
      (parsedAveragePace !== null && (parsedDistance === null || parsedDistance <= 0)) ||
      (parsedHr !== null && (parsedHr < 30 || parsedHr > 250)) ||
      (parsedPower !== null && parsedPower < 0) ||
      (parsedRpe !== null && (parsedRpe < 1 || parsedRpe > 10))
    ) {
      setError(t('triathlon.form.actualInvalid'))
      return
    }

    const parsedIntervals: IntervalSegment[] = intervals.map((interval, index) => ({
      id: interval.id,
      position: index + 1,
      kind: interval.kind,
      durationSeconds: optionalNumber(interval.durationMinutes) === null
        ? null
        : Math.round(Number(interval.durationMinutes.replace(',', '.')) * 60),
      distanceMeters: optionalNumber(interval.distanceMeters),
      averageHeartRateBpm: optionalNumber(interval.averageHeartRateBpm),
      averagePowerWatts: optionalNumber(interval.averagePowerWatts),
    }))
    const nextTraining: ActualTrainingInput = {
      localDate,
      startMinutes: timeToMinutes(startTime),
      discipline,
      context,
      durationSeconds: parsedDuration === null ? null : Math.round(parsedDuration * 60),
      distanceMeters: parsedDistance === null ? null : Math.round(parsedDistance * 1000),
      averageHeartRateBpm: parsedHr,
      averagePowerWatts: parsedPower,
      rpe: parsedRpe,
      intervals: parsedIntervals,
    }
    const validationIssues = validateActualTraining({
      ...nextTraining,
      id: training?.id ?? 'draft',
      position: training?.position ?? 0,
    })
    if (validationIssues.some((issue) => issue.severity === 'error')) {
      setError(t('triathlon.form.invalidValues'))
      return
    }
    const hasDurationWarning = validationIssues.some(
      (issue) => issue.code === 'interval-sum-mismatch',
    )

    if (hasDurationWarning && !durationWarningConfirmed) {
      setDurationWarningConfirmed(true)
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      await onSave(nextTraining)
      onOpenChange(false)
    } catch {
      setError(t('triathlon.form.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <form className="grid gap-4" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>
              {training ? t('triathlon.actual.edit') : t('triathlon.actual.add')}
            </DialogTitle>
            <DialogDescription>{t('triathlon.actual.description')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <IftaInput
              required
              label={t('triathlon.form.date')}
              type="date"
              value={localDate}
              onChange={(event) => setLocalDate(event.currentTarget.value)}
            />
            <IftaInput
              label={t('triathlon.form.timeOptional')}
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.currentTarget.value)}
            />
            <DisciplineSelect value={discipline} onValueChange={handleDisciplineChange} />
            <Select
              key={discipline}
              value={context ?? 'none'}
              onValueChange={(value) => setContext(
                value === 'none' ? null : value as TrainingContext,
              )}
            >
              <IftaSelectTrigger label={t('triathlon.form.context')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('triathlon.context.none')}</SelectItem>
                {contextsForDiscipline(discipline).map((option) => (
                  <SelectItem key={option} value={option}>{getContextLabel(option, t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <IftaInput
              label={t('triathlon.form.durationMinutes')}
              min="0"
              step="0.01"
              type="number"
              value={durationMinutes}
              onChange={(event) => handleDurationChange(event.currentTarget.value)}
            />
            <IftaInput
              label={t('triathlon.form.distanceKilometers')}
              min="0"
              step="0.01"
              type="number"
              value={distanceKilometers}
              onChange={(event) => handleDistanceChange(event.currentTarget.value)}
            />
            <IftaInput
              inputMode="numeric"
              label={averagePaceLabel(discipline, t)}
              placeholder="5:30"
              value={averagePace}
              onChange={(event) => handlePaceChange(event.currentTarget.value)}
            />
            <IftaInput
              label={t('triathlon.form.averageHeartRate')}
              min="30"
              max="250"
              type="number"
              value={averageHeartRateBpm}
              onChange={(event) => setAverageHeartRateBpm(event.currentTarget.value)}
            />
          </div>

          <section className="overflow-hidden rounded-md border">
            <Button
              aria-controls="actual-training-details"
              aria-expanded={showDetails}
              className="h-11 w-full justify-between rounded-none px-3"
              type="button"
              variant="ghost"
              onClick={() => setShowDetails((current) => !current)}
            >
              {t('triathlon.form.moreDetails')}
              <ChevronDown
                aria-hidden="true"
                className={cn('transition-transform', showDetails && 'rotate-180')}
              />
            </Button>
            {showDetails && (
              <div className="grid gap-4 border-t p-3" id="actual-training-details">
                <div className="grid gap-3 sm:grid-cols-2">
                  <IftaInput
                    label={t('triathlon.form.averagePower')}
                    min="0"
                    type="number"
                    value={averagePowerWatts}
                    onChange={(event) => setAveragePowerWatts(event.currentTarget.value)}
                  />
                  <IftaInput
                    label={t('triathlon.form.rpe')}
                    min="1"
                    max="10"
                    type="number"
                    value={rpe}
                    onChange={(event) => setRpe(event.currentTarget.value)}
                  />
                </div>
                <IntervalEditor intervals={intervals} onChange={setIntervals} />
              </div>
            )}
          </section>

          {durationWarningConfirmed && (
            <p className="type-ui rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200" role="status">
              {t('triathlon.intervals.durationWarning')}
            </p>
          )}
          {error && <p className="type-ui text-destructive" role="alert">{error}</p>}
          <DialogFooter className="sticky bottom-0 z-10 -mx-1 border-t bg-background/95 px-1 pt-3 backdrop-blur sm:justify-between">
            <div>
              {training && onDelete && (
                <ConfirmButton
                  description={t('triathlon.actual.deleteDescription')}
                  title={t('triathlon.actual.deleteTitle')}
                  trigger={
                    <Button type="button" variant="destructive">
                      <Trash2 aria-hidden="true" />
                      {t('common.delete')}
                    </Button>
                  }
                  onConfirm={async () => {
                    try {
                      await onDelete(training.id)
                      onOpenChange(false)
                    } catch {
                      setError(t('triathlon.form.saveFailed'))
                    }
                  }}
                />
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('common.cancel')}</Button>
              </DialogClose>
              <Button disabled={isSaving} type="submit">
                {isSaving
                  ? t('common.saving')
                  : durationWarningConfirmed
                    ? t('common.confirm')
                    : t('common.save')}
              </Button>
            </div>
          </DialogFooter>
        </form>
    </DialogContent>
  )
}

type WeekCopyDialogProps = {
  currentWeekStart: string
  open: boolean
  onCopy: (preview: PlannedWeekCopyPreview) => Promise<unknown> | unknown
  onOpenChange: (open: boolean) => void
  onPreview: (source: string, target: string) => PlannedWeekCopyPreview
}

export function WeekCopyDialog(props: WeekCopyDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      {props.open && <WeekCopyDialogContent key={props.currentWeekStart} {...props} />}
    </Dialog>
  )
}

function WeekCopyDialogContent({
  currentWeekStart,
  onCopy,
  onOpenChange,
  onPreview,
}: Omit<WeekCopyDialogProps, 'open'>) {
  const { formatDateTime, t } = useI18n()
  const [source, setSource] = useState(currentWeekStart)
  const [target, setTarget] = useState(addDaysToLocalDate(currentWeekStart, 7))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preview = useMemo(
    () => isValidLocalDate(source) && isValidLocalDate(target)
      ? onPreview(getWeekStartLocalDate(source), getWeekStartLocalDate(target))
      : null,
    [onPreview, source, target],
  )

  return (
    <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('triathlon.copyWeek.title')}</DialogTitle>
          <DialogDescription>{t('triathlon.copyWeek.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <IftaInput required label={t('triathlon.copyWeek.source')} type="date" value={source} onChange={(event) => setSource(event.currentTarget.value)} />
          <IftaInput required label={t('triathlon.copyWeek.target')} type="date" value={target} onChange={(event) => setTarget(event.currentTarget.value)} />
        </div>
        {preview ? <div className="grid gap-2 rounded-md border bg-secondary/35 p-3">
          <p className="type-action">
            {t('triathlon.copyWeek.previewCount', { count: preview.copies.length })}
          </p>
          <p className="type-ui text-muted-foreground">
            {formatDateTime(isoDateAtNoon(preview.sourceWeekStartLocalDate), { dateStyle: 'medium' })}
            {' → '}
            {formatDateTime(isoDateAtNoon(preview.targetWeekStartLocalDate), { dateStyle: 'medium' })}
          </p>
          {preview.existingTargetTrainings.length > 0 && (
            <p className="type-ui text-amber-700 dark:text-amber-300">
              {t('triathlon.copyWeek.existingWarning', { count: preview.existingTargetTrainings.length })}
            </p>
          )}
        </div> : (
          <p className="type-ui text-destructive" role="alert">
            {t('triathlon.copyWeek.invalidDate')}
          </p>
        )}
        {error && <p className="type-ui text-destructive" role="alert">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">{t('common.cancel')}</Button>
          </DialogClose>
          <Button
            disabled={isSaving || !preview || preview.copies.length === 0}
            type="button"
            onClick={async () => {
              if (!preview) return
              setIsSaving(true)
              setError(null)
              try {
                await onCopy(preview)
                onOpenChange(false)
              } catch {
                setError(t('triathlon.form.saveFailed'))
              } finally {
                setIsSaving(false)
              }
            }}
          >
            <Copy aria-hidden="true" />
              {isSaving
                ? t('common.saving')
              : t('triathlon.copyWeek.confirm', { count: preview?.copies.length ?? 0 })}
          </Button>
        </DialogFooter>
    </DialogContent>
  )
}

export function CurrentWeekSummary({
  actualCount,
  bikeDistanceMeters,
  bikeDurationSeconds,
  bikeTrainingCount,
  runDistanceMeters,
  runDurationSeconds,
  runTrainingCount,
  swimDistanceMeters,
  swimDurationSeconds,
  swimTrainingCount,
  totalDurationSeconds,
}: {
  actualCount: number
  bikeDistanceMeters: number
  bikeDurationSeconds: number
  bikeTrainingCount: number
  runDistanceMeters: number
  runDurationSeconds: number
  runTrainingCount: number
  swimDistanceMeters: number
  swimDurationSeconds: number
  swimTrainingCount: number
  totalDurationSeconds: number
}) {
  const { locale, t } = useI18n()
  const disciplines = [
    { discipline: 'swim' as const, duration: swimDurationSeconds, distance: swimDistanceMeters, count: swimTrainingCount },
    { discipline: 'bike' as const, duration: bikeDurationSeconds, distance: bikeDistanceMeters, count: bikeTrainingCount },
    { discipline: 'run' as const, duration: runDurationSeconds, distance: runDistanceMeters, count: runTrainingCount },
  ]
  const trainingCountLabel = (count: number) => count === 1
    ? t('triathlon.summary.oneTraining')
    : t('triathlon.summary.trainingCount', { count })

  return (
    <section aria-labelledby="current-week-title">
      <Card>
        <CardContent className="grid grid-cols-2 gap-px bg-border p-0 sm:grid-cols-4">
          <div className="min-w-0 bg-card p-3 sm:p-4" data-week-summary-item>
            <h2 id="current-week-title" className="type-label text-muted-foreground">
              {t('triathlon.summary.thisWeek')}
            </h2>
            <p className="type-card-title mt-1 tabular-nums sm:text-2xl">{formatDuration(totalDurationSeconds)}</p>
            <p className="type-caption mt-1 text-muted-foreground">
              {trainingCountLabel(actualCount)}
            </p>
          </div>

          {disciplines.map(({ discipline, duration, distance, count }) => {
            const Icon = disciplineIcons[discipline]
            const disciplineColor = disciplineColors[discipline]
            return (
              <div
                className="min-w-0 bg-card p-3 sm:p-4"
                data-discipline-summary={discipline}
                data-week-summary-item
                key={discipline}
                style={{ boxShadow: `inset 0 3px 0 ${disciplineColor}` }}
              >
                <p className="type-label flex items-center gap-2 text-muted-foreground">
                  <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color: disciplineColor }} />
                  {getDisciplineLabel(discipline, t)}
                </p>
                <p className="type-card-title mt-1 tabular-nums sm:text-2xl">{formatDuration(duration)}</p>
                <p className="type-caption mt-1 truncate text-muted-foreground">
                  {formatDistance(distance, locale)} · {trainingCountLabel(count)}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </section>
  )
}

export function PerformanceCards({
  cards,
}: {
  cards: Array<{
    discipline: Discipline
    label: string
    value: string | null
    detail?: string | null
  }>
}) {
  const { t } = useI18n()
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = disciplineIcons[card.discipline]
        const disciplineColor = disciplineColors[card.discipline]
        return (
          <Card
            data-performance-card={card.discipline}
            key={`${card.discipline}-${card.label}`}
            style={{ boxShadow: `inset 0 3px 0 ${disciplineColor}` }}
          >
            <CardHeader className="p-3 pb-1 sm:p-4 sm:pb-2">
              <CardTitle className="type-label flex items-center gap-2 text-muted-foreground">
                <Icon aria-hidden="true" className="size-4" style={{ color: disciplineColor }} />
                {card.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
              {card.value ? (
                <>
                  <p className="type-metric-lg tabular-nums">{card.value}</p>
                  {card.detail && <p className="type-caption mt-1 text-muted-foreground">{card.detail}</p>}
                </>
              ) : (
                <>
                  <p className="type-ui text-muted-foreground">{t('triathlon.performance.notEnough')}</p>
                  {card.detail && <p className="type-caption mt-1 text-muted-foreground">{card.detail}</p>}
                </>
              )}
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

export function RecentTrainings({
  actualTrainings,
  onDelete,
  onEdit,
}: {
  actualTrainings: ActualTraining[]
  onDelete: (id: string) => Promise<unknown> | unknown
  onEdit: (training: ActualTraining) => void
}) {
  const { formatDateTime, locale, t } = useI18n()
  const [error, setError] = useState<string | null>(null)
  const recent = [...actualTrainings]
    .sort((left, right) => right.localDate.localeCompare(left.localDate) || right.position - left.position)
    .slice(0, 12)

  if (recent.length === 0) return <EmptyState>{t('triathlon.recent.empty')}</EmptyState>

  const removeTraining = async (id: string) => {
    setError(null)
    try {
      await onDelete(id)
    } catch {
      setError(t('triathlon.form.saveFailed'))
    }
  }

  const actionsFor = (training: ActualTraining) => (
    <div className="flex justify-end gap-1">
      <Button
        aria-label={`${t('common.edit')}: ${getDisciplineLabel(training.discipline, t)}`}
        size="icon"
        variant="ghost"
        onClick={() => onEdit(training)}
      >
        <Pencil aria-hidden="true" />
      </Button>
      <ConfirmButton
        description={t('triathlon.actual.deleteDescription')}
        title={t('triathlon.actual.deleteTitle')}
        trigger={
          <Button
            aria-label={`${t('common.delete')}: ${getDisciplineLabel(training.discipline, t)}`}
            size="icon"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        }
        onConfirm={() => removeTraining(training.id)}
      />
    </div>
  )

  return (
    <div className="grid gap-2">
      {error && <p className="type-ui text-destructive" role="alert">{error}</p>}
      <div className="divide-y overflow-hidden rounded-md border bg-card md:hidden">
        {recent.map((training) => {
          const Icon = disciplineIcons[training.discipline]
          const metrics = [
            formatDuration(training.durationSeconds),
            formatDistance(training.distanceMeters, locale),
            formattedAveragePace(training),
          ].filter(Boolean).join(' · ')
          return (
            <article className="grid gap-1 p-2.5" key={training.id}>
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="type-action flex items-center gap-2">
                    <Icon
                      aria-hidden="true"
                      className="size-4 shrink-0"
                      style={{ color: disciplineColors[training.discipline] }}
                    />
                    {getDisciplineLabel(training.discipline, t)}
                  </p>
                  <p className="type-caption mt-0.5 text-muted-foreground">
                    <time dateTime={training.localDate}>
                      {formatDateTime(isoDateAtNoon(training.localDate), { dateStyle: 'medium' })}
                    </time>
                    {training.context ? ` · ${getContextLabel(training.context, t)}` : ''}
                  </p>
                </div>
                {actionsFor(training)}
              </div>
              <p className="type-ui tabular-nums" data-recent-training-metrics>{metrics}</p>
            </article>
          )
        })}
      </div>

      <Table containerClassName="hidden md:block">
        <TableHeader>
          <TableHead>{t('triathlon.form.date')}</TableHead>
          <TableHead>{t('triathlon.form.discipline')}</TableHead>
          <TableHead>{t('triathlon.recent.title')}</TableHead>
          <TableHead>{t('triathlon.form.context')}</TableHead>
          <TableHead className="w-24 text-right">{t('common.actions')}</TableHead>
        </TableHeader>
        <TableBody>
          {recent.map((training) => {
            const Icon = disciplineIcons[training.discipline]
            return (
              <TableRow key={training.id}>
                <TableCell className="whitespace-nowrap">
                  <time dateTime={training.localDate}>
                    {formatDateTime(isoDateAtNoon(training.localDate), { dateStyle: 'medium' })}
                  </time>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Icon
                      aria-hidden="true"
                      className="size-4"
                      style={{ color: disciplineColors[training.discipline] }}
                    />
                    {getDisciplineLabel(training.discipline, t)}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap" data-recent-training-metrics>
                  {[
                    formatDuration(training.durationSeconds),
                    formatDistance(training.distanceMeters, locale),
                    formattedAveragePace(training),
                  ].filter(Boolean).join(' · ')}
                </TableCell>
                <TableCell className="whitespace-nowrap">{getContextLabel(training.context, t)}</TableCell>
                <TableCell>{actionsFor(training)}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function CalendarActions({
  calendarTitle,
  view,
  onCopyWeek,
  onNavigate,
  onViewChange,
}: {
  calendarTitle: string
  view: 'month' | 'week'
  onCopyWeek: () => void
  onNavigate: (direction: 'previous' | 'today' | 'next') => void
  onViewChange: (view: 'month' | 'week') => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-2">
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-primary" />
        <h2 className="type-section-title min-w-0 leading-tight sm:truncate">{calendarTitle}</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex h-9 items-center rounded-md bg-background ring-1 ring-inset ring-border">
          <Button aria-pressed={view === 'month'} className="h-full" size="sm" variant={view === 'month' ? 'secondary' : 'ghost'} onClick={() => onViewChange('month')}>
            {t('triathlon.calendar.month')}
          </Button>
          <Button aria-pressed={view === 'week'} className="h-full" size="sm" variant={view === 'week' ? 'secondary' : 'ghost'} onClick={() => onViewChange('week')}>
            {t('triathlon.calendar.week')}
          </Button>
        </div>
        <Button aria-label={t('triathlon.copyWeek.action')} className="h-9" size="sm" variant="outline" onClick={onCopyWeek}>
          <Copy aria-hidden="true" />
          <span className="hidden sm:inline">{t('triathlon.copyWeek.action')}</span>
        </Button>
        <Button className="h-9" size="sm" variant="outline" onClick={() => onNavigate('previous')}>{t('common.back')}</Button>
        <Button className="h-9" size="sm" variant="outline" onClick={() => onNavigate('today')}>{t('common.today')}</Button>
        <Button className="h-9" size="sm" variant="outline" onClick={() => onNavigate('next')}>{t('common.next')}</Button>
      </div>
    </div>
  )
}

export function HeaderActions({
  onAddActual,
}: {
  onAddActual: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={onAddActual}>
        <Plus aria-hidden="true" />
        {t('triathlon.actual.add')}
      </Button>
    </div>
  )
}

export function LoadingState() {
  const { t } = useI18n()
  return (
    <div className="grid gap-3" role="status">
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-72 animate-pulse rounded-lg bg-muted" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

export function SyncStatus() {
  const { t } = useI18n()
  return <Badge variant="secondary"><Clock3 aria-hidden="true" />{t('common.syncing')}</Badge>
}

export function SectionHeading({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return <h2 className="type-section-title flex items-center gap-2">{icon}{children}</h2>
}
