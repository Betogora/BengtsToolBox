import {
  ArrowDownWideNarrow,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  NotebookPen,
  Pencil,
  Plus,
  Trophy,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { averagePaceSeconds, formatPace } from './domain/units'
import {
  disciplineIcons,
  disciplines,
  formatTrainingDuration,
} from './presentation'
import type { ActualTraining, Discipline } from './types'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/DatePicker'
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

const PAGE_SIZE = 20

const chipClass = (active: boolean) =>
  cn(
    'inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium leading-none whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/45 [&_svg]:size-3.5 [&_svg]:shrink-0',
    active
      ? 'border-primary/30 bg-primary-soft text-primary'
      : 'bg-card text-foreground hover:bg-muted',
  )

export function TrainingJournal({
  actualTrainings,
  onEdit,
  onDelete,
  onAdd,
}: {
  actualTrainings: ActualTraining[]
  onEdit: (training: ActualTraining) => void
  onDelete: (id: string) => Promise<void>
  onAdd: () => void
}) {
  const { t, formatDateTime, formatNumber } = useI18n()
  const [discipline, setDiscipline] = useState<Discipline | 'all'>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [ascending, setAscending] = useState(false)
  const [benchmarksOnly, setBenchmarksOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const filtered = actualTrainings
    .filter(
      (training) =>
        (discipline === 'all' || training.discipline === discipline) &&
        (!benchmarksOnly || training.isBenchmark === true) &&
        (!from || training.localDate >= from) &&
        (!to || training.localDate <= to),
    )
    .sort(
      (a, b) =>
        (ascending ? 1 : -1) *
        (a.localDate.localeCompare(b.localDate) ||
          (a.startMinutes ?? 1440) - (b.startMinutes ?? 1440) ||
          a.position - b.position),
    )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(
    currentPage * PAGE_SIZE,
    (currentPage + 1) * PAGE_SIZE,
  )
  const duration = filtered.reduce(
    (sum, training) => sum + (training.durationSeconds ?? 0),
    0,
  )
  const distance = filtered.reduce(
    (sum, training) => sum + (training.distanceMeters ?? 0),
    0,
  )
  const shortDate = (localDate: string) =>
    formatDateTime(new Date(`${localDate}T12:00:00`), {
      day: '2-digit',
      month: '2-digit',
    })
  const rangeLabel =
    from || to
      ? `${from ? shortDate(from) : '…'}–${to ? shortDate(to) : '…'}`
      : t('triathlon.journal.range')

  return (
    <section
      className="grid min-w-0 gap-4"
      aria-label={t('triathlon.tabs.journal')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-section-title">{t('triathlon.journal.title')}</h2>
        <span className="type-caption tabular-nums text-muted-foreground">
          {filtered.length === 1
            ? t('triathlon.summary.oneTraining')
            : t('triathlon.summary.trainingCount', {
                count: filtered.length,
              })}{' '}
          · {formatTrainingDuration(duration)}
          {discipline !== 'all' && (
            <>
              {' '}
              · {formatNumber(distance / 1000, { maximumFractionDigits: 1 })} km
            </>
          )}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={discipline}
          onValueChange={(value) => {
            setDiscipline(value as Discipline | 'all')
            setPage(0)
          }}
        >
          <SelectTrigger
            aria-label={t('triathlon.form.discipline')}
            className={cn(
              chipClass(discipline !== 'all'),
              'w-auto py-0 pr-3 shadow-none focus:ring-[3px] [&>svg]:hidden',
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <ListFilter aria-hidden="true" />
              <SelectValue />
              <ChevronDown aria-hidden="true" className="opacity-60" />
            </span>
          </SelectTrigger>
          <SelectContent className="triathlon-tracker">
            <SelectItem value="all">
              {t('triathlon.journal.allDisciplines')}
            </SelectItem>
            {disciplines.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`triathlon.discipline.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger
            className={chipClass(Boolean(from || to))}
            aria-label={from || to ? `${t('triathlon.journal.range')}: ${rangeLabel}` : undefined}
          >
            <CalendarDays aria-hidden="true" />
            <span className="tabular-nums">{rangeLabel}</span>
            <ChevronDown aria-hidden="true" className="opacity-60" />
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="triathlon-tracker grid w-[min(18rem,calc(100vw-2rem))] gap-2"
          >
            <DatePicker
              label={t('triathlon.journal.from')}
              value={from}
              onValueChange={(value) => {
                setFrom(value)
                setPage(0)
              }}
            />
            <DatePicker
              label={t('triathlon.journal.to')}
              value={to}
              onValueChange={(value) => {
                setTo(value)
                setPage(0)
              }}
            />
          </PopoverContent>
        </Popover>
        <label
          className={cn(
            chipClass(benchmarksOnly),
            'cursor-pointer has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/45',
          )}
        >
          <input
            type="checkbox"
            className="sr-only"
            checked={benchmarksOnly}
            onChange={(event) => {
              setBenchmarksOnly(event.target.checked)
              setPage(0)
            }}
          />
          <Trophy aria-hidden="true" />
          {t('triathlon.journal.benchmarksOnly')}
        </label>
        <button
          type="button"
          className={chipClass(ascending)}
          aria-pressed={ascending}
          onClick={() => {
            setAscending(!ascending)
            setPage(0)
          }}
        >
          <ArrowDownWideNarrow aria-hidden="true" />
          {t('triathlon.form.date')}
          <span aria-hidden="true">{ascending ? '↑' : '↓'}</span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-[30px] px-2.5 text-[13px] text-muted-foreground"
          disabled={discipline === 'all' && !from && !to && !benchmarksOnly}
          onClick={() => {
            setDiscipline('all')
            setFrom('')
            setTo('')
            setBenchmarksOnly(false)
            setPage(0)
          }}
        >
          {t('triathlon.journal.clearFilters')}
        </Button>
      </div>
      {from && to && from > to && (
        <p role="alert" className="type-ui text-destructive">
          {t('triathlon.journal.invalidRange')}
        </p>
      )}
      {error && (
        <p role="alert" className="type-ui text-destructive">
          {error}
        </p>
      )}
      {filtered.length === 0 ? (
        <div className="grid justify-items-center gap-3 rounded-lg border border-dashed bg-card px-4 py-12 text-center">
          <NotebookPen
            aria-hidden="true"
            className="size-8 text-muted-foreground"
          />
          <h3 className="type-card-title">
            {t(
              actualTrainings.length === 0
                ? 'triathlon.journal.empty'
                : 'triathlon.journal.noResults',
            )}
          </h3>
          {actualTrainings.length === 0 && (
            <Button onClick={onAdd}>
              <Plus aria-hidden="true" />
              {t('triathlon.actual.add')}
            </Button>
          )}
        </div>
      ) : (
        <>
          <ul
            aria-label={t('triathlon.journal.title')}
            className="divide-y rounded-lg border bg-card"
          >
            {visible.map((training) => {
              const Icon = disciplineIcons[training.discipline]
              const label = t(`triathlon.discipline.${training.discipline}`)
              const pace =
                training.durationSeconds && training.distanceMeters
                  ? formatPace(
                      averagePaceSeconds(
                        training.durationSeconds,
                        training.distanceMeters,
                        training.discipline,
                      ),
                    )
                  : null
              const meta = [
                training.context
                  ? t(`triathlon.context.${training.context}`)
                  : null,
                training.intervals.length > 0
                  ? t('triathlon.journal.intervals', {
                      count: training.intervals.length,
                    })
                  : null,
                training.averageHeartRateBpm !== null
                  ? `${training.averageHeartRateBpm} bpm`
                  : null,
                training.averagePowerWatts !== null
                  ? `${training.averagePowerWatts} W`
                  : null,
                training.rpe !== null ? `RPE ${training.rpe}/10` : null,
              ].filter((part) => part !== null)
              const secondary = [
                training.distanceMeters === null
                  ? null
                  : `${formatNumber(training.distanceMeters / 1000, { maximumFractionDigits: 2 })} km`,
                pace
                  ? `${pace} /${training.discipline === 'swim' ? '100 m' : 'km'}`
                  : null,
              ].filter((part) => part !== null)
              return (
                <li
                  key={training.id}
                  className="flex items-center gap-3 py-2.5 pl-3 pr-1.5 sm:pl-4 sm:pr-2"
                  data-discipline={training.discipline}
                  data-journal-training={training.id}
                >
                  <span className="tri-sport-icon" aria-hidden="true">
                    <Icon className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="type-ui flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
                      {label}
                      {training.isBenchmark && (
                        <span
                          title={t('triathlon.form.benchmark')}
                          className="inline-flex h-[18px] items-center gap-1 rounded-full bg-primary-soft px-1.5 text-[11px] font-semibold text-primary"
                        >
                          <Trophy aria-hidden="true" className="size-3" />
                          {t('triathlon.journal.benchmark')}
                        </span>
                      )}
                    </p>
                    <p className="type-caption text-muted-foreground tabular-nums">
                      <time dateTime={training.localDate}>
                        {formatDateTime(
                          new Date(`${training.localDate}T12:00:00`),
                          { day: '2-digit', month: 'short', year: '2-digit' },
                        )}
                      </time>
                      {meta.map((part, index) => (
                        <span key={index}>
                          {' · '}
                          <span className="whitespace-nowrap">{part}</span>
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="grid shrink-0 justify-items-end text-right tabular-nums">
                    <span className="type-ui font-semibold">
                      {formatTrainingDuration(training.durationSeconds)}
                    </span>
                    {secondary.length > 0 && (
                      <span className="type-caption flex flex-col items-end text-muted-foreground sm:flex-row sm:gap-1">
                        {secondary.map((part, index) => (
                          <span key={index}>
                            {index > 0 && (
                              <span className="hidden sm:inline">· </span>
                            )}
                            {part}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t('common.edit')}: ${label}`}
                      onClick={() => onEdit(training)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                        <ConfirmButton
                          mode="popover"
                          title={t('triathlon.actual.deleteTitle')}
                          description={t('triathlon.actual.deleteDescription')}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`${t('common.delete')}: ${label}`}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          }
                          onConfirm={async () => {
                            setError(null)
                            try {
                              await onDelete(training.id)
                            } catch {
                              setError(t('triathlon.form.saveFailed'))
                            }
                          }}
                        />
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between gap-2">
            <p className="type-caption tabular-nums text-muted-foreground">
              {t('triathlon.journal.pageRange', {
                start: currentPage * PAGE_SIZE + 1,
                end: Math.min((currentPage + 1) * PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                disabled={currentPage === 0}
                aria-label={t('common.back')}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                disabled={currentPage + 1 === pageCount}
                aria-label={t('common.next')}
                onClick={() => setPage(currentPage + 1)}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
