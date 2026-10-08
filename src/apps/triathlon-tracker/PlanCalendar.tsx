import { ChevronLeft, ChevronRight, Clock3, Copy, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getWeekStartLocalDate,
  isValidLocalDate,
} from './domain/dates'
import {
  disciplineColors,
  disciplineIcons,
  disciplines,
  formatTrainingDuration,
} from './presentation'
import type { PlannedTraining } from './types'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

function CalendarDateJump({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(value)
  }
  return (
    <DatePicker
      required
      label={t('triathlon.calendar.jumpTo')}
      value={draft}
      onValueChange={(date) => {
        setDraft(date)
        if (isValidLocalDate(date)) onValueChange(date)
      }}
    />
  )
}

type PlanCalendarProps = {
  activeLocalDate: string
  today: string
  plannedTrainings: PlannedTraining[]
  onDateChange: (date: string) => void
  onAdd: (date: string) => void
  onEdit: (training: PlannedTraining) => void
  onCopy: (training: PlannedTraining) => void
  onCopyWeek: () => void
  onMove: (training: PlannedTraining, date: string) => Promise<void>
}

export function PlanCalendar({
  activeLocalDate,
  today,
  plannedTrainings,
  onDateChange,
  onAdd,
  onEdit,
  onCopy,
  onCopyWeek,
  onMove,
}: PlanCalendarProps) {
  const { t, formatDateTime, formatNumber } = useI18n()
  const [view, setView] = useState<'month' | 'week'>('week')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropDate, setDropDate] = useState<string | null>(null)
  const [moving, setMoving] = useState(false)
  const dateLabel = (date: string, options: Intl.DateTimeFormatOptions) =>
    formatDateTime(new Date(`${date}T12:00:00`), options)
  const firstDay =
    view === 'week'
      ? getWeekStartLocalDate(activeLocalDate)
      : getWeekStartLocalDate(`${activeLocalDate.slice(0, 7)}-01`)
  const lastDay =
    view === 'week'
      ? addDaysToLocalDate(firstDay, 6)
      : addDaysToLocalDate(
          getWeekStartLocalDate(
            addDaysToLocalDate(
              addMonthsToLocalDate(`${activeLocalDate.slice(0, 7)}-01`, 1),
              -1,
            ),
          ),
          6,
        )
  const weekStarts: string[] = []
  for (let date = firstDay; date <= lastDay; date = addDaysToLocalDate(date, 7))
    weekStarts.push(date)
  const byDate = useMemo(() => {
    const grouped = new Map<string, PlannedTraining[]>()
    for (const training of plannedTrainings) {
      const entries = grouped.get(training.localDate) ?? []
      entries.push(training)
      grouped.set(training.localDate, entries)
    }
    for (const entries of grouped.values())
      entries.sort(
        (a, b) =>
          (a.startMinutes ?? 1440) - (b.startMinutes ?? 1440) ||
          a.position - b.position,
      )
    return grouped
  }, [plannedTrainings])
  const title =
    view === 'month'
      ? dateLabel(activeLocalDate, { month: 'long', year: 'numeric' })
      : `${dateLabel(firstDay, { day: 'numeric', month: 'short' })} – ${dateLabel(lastDay, { day: 'numeric', month: 'short', year: 'numeric' })}`

  return (
    <section
      className="tri-calendar grid min-w-0 gap-4"
      aria-label={t('triathlon.tabs.calendar')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-section-title">{title}</h2>
        </div>
        <Button onClick={() => onAdd(activeLocalDate)}>
          <Plus aria-hidden="true" />
          {t('triathlon.plan.add')}
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            aria-label={t('common.back')}
            size="icon"
            variant="outline"
            onClick={() =>
              onDateChange(
                view === 'month'
                  ? addMonthsToLocalDate(activeLocalDate, -1)
                  : addDaysToLocalDate(activeLocalDate, -7),
              )
            }
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button variant="outline" onClick={() => onDateChange(today)}>
            {t('common.today')}
          </Button>
          <Button
            aria-label={t('common.next')}
            size="icon"
            variant="outline"
            onClick={() =>
              onDateChange(
                view === 'month'
                  ? addMonthsToLocalDate(activeLocalDate, 1)
                  : addDaysToLocalDate(activeLocalDate, 7),
              )
            }
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="size-9 sm:w-auto sm:px-3"
            aria-label={t('triathlon.copyWeek.action')}
            title={t('triathlon.copyWeek.action')}
            onClick={onCopyWeek}
          >
            <Copy aria-hidden="true" />
            <span className="hidden sm:inline">
              {t('triathlon.copyWeek.action')}
            </span>
          </Button>
          <SegmentedControl
            aria-label={t('triathlon.tabs.calendar')}
            value={view}
            onValueChange={(value) => setView(value as 'week' | 'month')}
            options={(['week', 'month'] as const).map((value) => ({
              value,
              label: t(`triathlon.calendar.${value}`),
            }))}
          />
        </div>
      </div>
      {view === 'month' && (
        <div className="grid grid-cols-7 gap-1 rounded-lg border bg-card p-2 lg:hidden">
          {Array.from({ length: 7 }, (_, day) => (
            <span
              key={day}
              className="type-caption py-1 text-center text-muted-foreground"
            >
              {dateLabel(addDaysToLocalDate(firstDay, day), {
                weekday: 'short',
              })}
            </span>
          ))}
          {weekStarts
            .flatMap((start) =>
              Array.from({ length: 7 }, (_, day) =>
                addDaysToLocalDate(start, day),
              ),
            )
            .map((date) => (
              <button
                type="button"
                key={date}
                aria-label={dateLabel(date, { dateStyle: 'full' })}
                aria-pressed={date === activeLocalDate}
                aria-current={date === today ? 'date' : undefined}
                className={cn(
                  'type-ui grid min-h-10 justify-items-center rounded-md py-1 focus-visible:outline-2 focus-visible:outline-ring',
                  date.slice(0, 7) !== activeLocalDate.slice(0, 7) &&
                    'text-muted-foreground',
                  date === activeLocalDate
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
                onClick={() => onDateChange(date)}
              >
                {Number(date.slice(-2))}
                <span
                  className={cn(
                    'size-1 rounded-full',
                    byDate.has(date) ? 'bg-current' : 'bg-transparent',
                  )}
                />
              </button>
            ))}
        </div>
      )}
      <div
        className="overflow-hidden rounded-lg border bg-card"
        aria-busy={moving}
      >
        {view === 'week' && (
          <div
            className="grid grid-cols-7 gap-1 border-b p-2"
            data-week-strip
          >
            {Array.from({ length: 7 }, (_, day) => {
              const date = addDaysToLocalDate(firstDay, day)
              const selected = date === activeLocalDate
              return (
                <button
                  type="button"
                  key={date}
                  aria-label={dateLabel(date, { dateStyle: 'full' })}
                  aria-pressed={selected}
                  aria-current={date === today ? 'date' : undefined}
                  className={cn(
                    'grid min-h-12 w-full max-w-16 justify-items-center gap-0.5 justify-self-center rounded-[10px] py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selected
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted',
                  )}
                  onClick={() => {
                    onDateChange(date)
                    if (!window.matchMedia('(min-width: 768px)').matches)
                      document
                        .querySelector(`[data-calendar-date="${date}"]`)
                        ?.scrollIntoView({ block: 'nearest' })
                  }}
                >
                  <span
                    className={cn(
                      'text-[11px] font-medium leading-4',
                      selected
                        ? 'text-primary-foreground/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    {dateLabel(date, { weekday: 'short' })}
                  </span>
                  <span
                    className={cn(
                      'type-action tabular-nums',
                      !selected && date === today && 'text-primary',
                    )}
                  >
                    {Number(date.slice(-2))}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-1 rounded-full',
                      byDate.has(date) ? 'bg-current' : 'bg-transparent',
                    )}
                  />
                </button>
              )
            })}
          </div>
        )}
        {view === 'month' && (
        <div className="hidden grid-cols-[repeat(7,minmax(0,1fr))_9rem] border-b lg:grid">
          {Array.from({ length: 7 }, (_, day) => (
            <div
              className="type-caption px-3 py-2 font-medium text-muted-foreground"
              key={day}
            >
              {dateLabel(addDaysToLocalDate(firstDay, day), {
                weekday: 'short',
              })}
            </div>
          ))}
          <div className="type-caption hidden border-l px-3 py-3 font-semibold text-muted-foreground lg:block">
            {t('triathlon.calendar.weekSummary')}
          </div>
        </div>
        )}
        {weekStarts.map((weekStart) => {
          const days = Array.from({ length: 7 }, (_, day) =>
            addDaysToLocalDate(weekStart, day),
          )
          const entries = days.flatMap((date) => byDate.get(date) ?? [])
          const totalSeconds = entries.reduce(
            (sum, entry) => sum + (entry.durationSeconds ?? 0),
            0,
          )
          return (
            <div
              key={weekStart}
              className={cn(
                'border-b border-border/50 last:border-b-0 lg:grid lg:grid-cols-[repeat(7,minmax(0,1fr))_9rem]',
                view === 'month' && !days.includes(activeLocalDate) && 'hidden',
                view === 'week' && 'md:grid md:grid-cols-7 lg:grid-cols-7',
              )}
            >
              {days.map((date) => {
                const trainings = byDate.get(date) ?? []
                const isToday = date === today
                return (
                  <div
                    key={date}
                    data-calendar-date={date}
                    className={cn(
                      'min-w-0 border-b border-border/50 px-3 py-3 last:border-b-0 lg:block lg:min-h-40 lg:border-b-0 lg:border-r',
                      view === 'month' && date !== activeLocalDate && 'hidden',
                      view === 'week' &&
                        'md:min-h-56 md:border-b-0 md:border-r lg:min-h-64',
                      date.slice(0, 7) !== activeLocalDate.slice(0, 7) &&
                        view === 'month' &&
                        'bg-muted/40',
                      isToday && 'bg-primary/5',
                      dropDate === date && 'ring-2 ring-inset ring-primary',
                    )}
                    onDragOver={(event) => {
                      if (draggedId && !moving) {
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        setDropDate(date)
                      }
                    }}
                    onDragLeave={() =>
                      setDropDate((current) =>
                        current === date ? null : current,
                      )
                    }
                    onDrop={async (event) => {
                      event.preventDefault()
                      const training = plannedTrainings.find(
                        (item) => item.id === draggedId,
                      )
                      setDropDate(null)
                      setDraggedId(null)
                      if (!training || training.localDate === date || moving)
                        return
                      setMoving(true)
                      try {
                        await onMove(training, date)
                      } finally {
                        setMoving(false)
                      }
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-1">
                      <time
                        dateTime={date}
                        aria-current={isToday ? 'date' : undefined}
                        className={cn(
                          'type-ui flex items-center gap-2 font-semibold',
                          isToday ? 'text-primary' : 'text-foreground',
                        )}
                      >
                        <span
                          className={cn(
                            'lg:hidden',
                            view === 'week' && 'md:hidden',
                          )}
                        >
                          {dateLabel(date, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                        <span
                          className={cn(
                            'hidden size-8 items-center justify-center rounded-[10px] text-base tabular-nums lg:flex',
                            view === 'week' && 'lg:hidden',
                            isToday && 'bg-primary text-primary-foreground',
                          )}
                        >
                          {Number(date.slice(-2))}
                        </span>
                      </time>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        aria-label={t('triathlon.calendar.addOnDate', {
                          date: dateLabel(date, { dateStyle: 'full' }),
                        })}
                        onClick={() => onAdd(date)}
                      >
                        <Plus aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                    <div className="grid gap-2.5">
                      {trainings.map((training) => {
                        const label =
                          training.label ||
                          t(`triathlon.discipline.${training.discipline}`)
                        const meta = [
                          training.startMinutes === null
                            ? null
                            : `${Math.floor(training.startMinutes / 60)}`.padStart(
                                2,
                                '0',
                              ) +
                              ':' +
                              `${training.startMinutes % 60}`.padStart(2, '0'),
                          training.durationSeconds === null
                            ? null
                            : formatTrainingDuration(training.durationSeconds),
                          training.distanceMeters === null
                            ? null
                            : `${formatNumber(training.distanceMeters / 1000, {
                                maximumFractionDigits: 2,
                              })} km`,
                        ].filter((part) => part !== null)
                        return (
                          <article
                            key={training.id}
                            data-discipline={training.discipline}
                            data-planned-training={training.id}
                            draggable={!moving}
                            onDragStart={(event) => {
                              event.dataTransfer.setData(
                                'text/plain',
                                training.id,
                              )
                              event.dataTransfer.effectAllowed = 'move'
                              setDraggedId(training.id)
                            }}
                            onDragEnd={() => {
                              setDraggedId(null)
                              setDropDate(null)
                            }}
                            className={cn(
                              'tri-plan-entry @container group relative overflow-hidden rounded-lg border bg-card transition-colors hover:border-border-strong',
                              draggedId === training.id && 'opacity-50',
                            )}
                          >
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 p-2.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                              onClick={() => onEdit(training)}
                              aria-label={`${training.label ? `${label} · ${t(`triathlon.discipline.${training.discipline}`)}` : label} · ${t('common.edit')}`}
                            >
                              <span className="grid min-w-0 flex-1 gap-0.5 @3xs:pr-9">
                                <span className="type-ui font-semibold leading-snug hyphens-auto [overflow-wrap:anywhere]">
                                  {label}
                                </span>
                                <span className="type-caption flex flex-wrap gap-x-1 text-muted-foreground tabular-nums">
                                  {meta.map((part, index) => (
                                    <span
                                      className="@3xs:whitespace-nowrap"
                                      key={index}
                                    >
                                      {part}
                                      {index < meta.length - 1 && ' ·'}
                                    </span>
                                  ))}
                                </span>
                              </span>
                              <ChevronRight
                                aria-hidden="true"
                                className="hidden size-4 shrink-0 text-subtle-foreground @3xs:block"
                              />
                            </button>
                            <div className="flex justify-end px-1 pb-1 @3xs:absolute @3xs:right-8 @3xs:top-1/2 @3xs:-translate-y-1/2 @3xs:p-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-muted-foreground"
                                aria-label={`${t('triathlon.calendar.duplicate')}: ${label}`}
                                onClick={() => onCopy(training)}
                              >
                                <Copy aria-hidden="true" className="size-3.5" />
                              </Button>
                            </div>
                          </article>
                        )
                      })}
                      {trainings.length === 0 && (
                        <button
                          type="button"
                          onClick={() => onAdd(date)}
                          className="type-caption hidden min-h-16 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-ring lg:flex"
                          aria-label={t('triathlon.calendar.addOnDate', {
                            date: dateLabel(date, { dateStyle: 'full' }),
                          })}
                        >
                          <Plus aria-hidden="true" className="mr-1 size-3" />
                          {t('triathlon.calendar.plan')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              <aside
                className={cn(
                  'bg-muted/40 p-3',
                  view === 'week' &&
                    'flex flex-wrap items-center justify-between gap-3 md:col-span-7 md:border-t lg:col-span-7 lg:border-t',
                )}
                aria-label={`${t('triathlon.calendar.weekSummary')} ${weekStart}`}
              >
                <div
                  className={cn(
                    'flex items-center justify-between gap-2 lg:block',
                    view === 'week' && 'lg:flex',
                  )}
                >
                  <p className="type-caption mb-2 font-semibold text-muted-foreground lg:hidden">
                    {t('triathlon.calendar.weekSummary')} ·{' '}
                    {dateLabel(weekStart, { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="type-action flex items-center gap-1.5 tabular-nums">
                    <Clock3 aria-hidden="true" className="size-3.5" />
                    {formatTrainingDuration(totalSeconds)}
                  </p>
                </div>
                <p className="type-caption mt-1 text-muted-foreground">
                  {entries.length === 1
                    ? t('triathlon.summary.oneTraining')
                    : t('triathlon.summary.trainingCount', {
                        count: entries.length,
                      })}
                </p>
                <div
                  className={cn(
                    'mt-3 flex flex-wrap gap-3 lg:grid lg:gap-2',
                    view === 'week' && 'mt-0 lg:flex lg:gap-4',
                  )}
                >
                  {disciplines.map((discipline) => {
                    const Icon = disciplineIcons[discipline]
                    const matching = entries.filter(
                      (entry) => entry.discipline === discipline,
                    )
                    return (
                      <div
                        className="type-caption flex items-center gap-2 tabular-nums"
                        key={discipline}
                        title={t(`triathlon.discipline.${discipline}`)}
                      >
                        <Icon
                          aria-hidden="true"
                          className="size-3.5 shrink-0"
                          style={{ color: disciplineColors[discipline] }}
                        />
                        <span className="sr-only">
                          {t(`triathlon.discipline.${discipline}`)}:{' '}
                        </span>
                        {formatTrainingDuration(
                          matching.reduce(
                            (sum, entry) => sum + (entry.durationSeconds ?? 0),
                            0,
                          ),
                        )}
                      </div>
                    )
                  })}
                </div>
              </aside>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="type-caption flex flex-wrap gap-4 text-muted-foreground">
          {disciplines.map((discipline) => {
            const Icon = disciplineIcons[discipline]
            return (
              <span className="flex items-center gap-1.5" key={discipline}>
                <Icon
                  aria-hidden="true"
                  className="size-3.5"
                  style={{ color: disciplineColors[discipline] }}
                />
                {t(`triathlon.discipline.${discipline}`)}
              </span>
            )
          })}
        </div>
        <div className="w-full sm:w-52">
          <CalendarDateJump
            value={activeLocalDate}
            onValueChange={onDateChange}
          />
        </div>
      </div>
    </section>
  )
}
