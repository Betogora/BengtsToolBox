import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Pencil,
  Plus,
  Trophy,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'
import { averagePaceSeconds, formatPace } from './domain/units'
import {
  disciplineColors,
  disciplineIcons,
  disciplines,
  formatTrainingDuration,
} from './presentation'
import type { ActualTraining, Discipline } from './types'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { Button } from '@/components/ui/button'
import { IftaSelectTrigger } from '@/components/ui/ifta-field'
import { DatePicker } from '@/components/ui/DatePicker'
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
  const pageCount = Math.max(1, Math.ceil(filtered.length / 20))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(currentPage * 20, (currentPage + 1) * 20)
  const duration = filtered.reduce(
    (sum, training) => sum + (training.durationSeconds ?? 0),
    0,
  )
  const distance = filtered.reduce(
    (sum, training) => sum + (training.distanceMeters ?? 0),
    0,
  )

  return (
    <section
      className="grid min-w-0 gap-4"
      aria-label={t('triathlon.tabs.journal')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-section-title">{t('triathlon.journal.title')}</h2>
        <span className="type-caption rounded-full bg-muted px-3 py-1.5 tabular-nums text-muted-foreground">
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
      <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Select
          value={discipline}
          onValueChange={(value) => {
            setDiscipline(value as Discipline | 'all')
            setPage(0)
          }}
        >
          <IftaSelectTrigger
            containerClassName="col-span-2 lg:col-span-1"
            label={t('triathlon.form.discipline')}
          >
            <SelectValue />
          </IftaSelectTrigger>
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
        <Button
          variant="ghost"
          className="col-span-2 h-9 lg:col-span-1 lg:h-11"
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="type-ui flex min-h-9 items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={benchmarksOnly}
            onChange={(event) => {
              setBenchmarksOnly(event.target.checked)
              setPage(0)
            }}
          />
          {t('triathlon.journal.benchmarksOnly')}
        </label>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={ascending}
          onClick={() => {
            setAscending(!ascending)
            setPage(0)
          }}
        >
          <ArrowDownWideNarrow aria-hidden="true" className="size-4" />
          {t('triathlon.form.date')}
          <span aria-hidden="true">{ascending ? '↑' : '↓'}</span>
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
          <Table
            aria-label={t('triathlon.journal.title')}
            className="block md:table md:whitespace-nowrap"
            containerClassName="overflow-x-visible md:overflow-x-auto"
          >
            <TableHeader className="hidden md:table-row">
              <TableHead aria-sort={ascending ? 'ascending' : 'descending'}>
                {t('triathlon.form.date')}
              </TableHead>
              <TableHead>{t('triathlon.form.discipline')}</TableHead>
              <TableHead>{t('triathlon.journal.duration')}</TableHead>
              <TableHead>{t('triathlon.journal.distance')}</TableHead>
              <TableHead>{t('triathlon.journal.pace')}</TableHead>
              <TableHead>{t('triathlon.form.metrics')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableHeader>
            <TableBody className="block md:table-row-group">
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
                return (
                  <TableRow
                    key={training.id}
                    className="grid grid-cols-3 items-center gap-x-2 px-3 py-2 hover:bg-muted/30 md:table-row md:p-0"
                    data-journal-training={training.id}
                  >
                    <TableCell className="col-span-1 p-0 md:p-3">
                      <time dateTime={training.localDate}>
                        {formatDateTime(
                          new Date(`${training.localDate}T12:00:00`),
                          { day: '2-digit', month: 'short', year: '2-digit' },
                        )}
                      </time>
                    </TableCell>
                    <TableCell className="col-span-2 p-0 py-1 md:p-3">
                      <span className="flex flex-wrap items-center gap-2 font-semibold">
                        <Icon
                          aria-hidden="true"
                          className="size-4"
                          style={{
                            color: disciplineColors[training.discipline],
                          }}
                        />
                        {label}
                        {training.isBenchmark && (
                          <span
                            title={t('triathlon.form.benchmark')}
                            className="type-caption inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary"
                          >
                            <Trophy aria-hidden="true" className="size-3" />
                            {t('triathlon.journal.benchmark')}
                          </span>
                        )}
                      </span>
                      <span className="type-caption text-muted-foreground">
                        {training.context
                          ? t(`triathlon.context.${training.context}`)
                          : '—'}
                      </span>
                      {training.intervals.length > 0 && (
                        <span className="type-caption block text-muted-foreground">
                          {t('triathlon.journal.intervals', {
                            count: training.intervals.length,
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-0 py-2 tabular-nums md:p-3">
                      <span className="type-caption block text-muted-foreground md:hidden">
                        {t('triathlon.journal.duration')}
                      </span>
                      {formatTrainingDuration(training.durationSeconds)}
                    </TableCell>
                    <TableCell className="p-0 py-2 tabular-nums md:p-3">
                      <span className="type-caption block text-muted-foreground md:hidden">
                        {t('triathlon.journal.distance')}
                      </span>
                      {training.distanceMeters === null
                        ? '—'
                        : `${formatNumber(training.distanceMeters / 1000, { maximumFractionDigits: 2 })} km`}
                    </TableCell>
                    <TableCell className="p-0 py-2 tabular-nums md:p-3">
                      <span className="type-caption block text-muted-foreground md:hidden">
                        {t('triathlon.journal.pace')}
                      </span>
                      {pace
                        ? `${pace} /${training.discipline === 'swim' ? '100 m' : 'km'}`
                        : '—'}
                    </TableCell>
                    <TableCell className="col-span-2 p-0 tabular-nums md:p-3">
                      <div className="type-caption flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground md:grid md:gap-1">
                        {training.averageHeartRateBpm !== null && (
                          <span title={t('triathlon.form.averageHeartRate')}>
                            {training.averageHeartRateBpm} bpm
                          </span>
                        )}
                        {training.averagePowerWatts !== null && (
                          <span title={t('triathlon.form.averagePower')}>
                            {training.averagePowerWatts} W
                          </span>
                        )}
                        {training.rpe !== null && (
                          <span>RPE {training.rpe}/10</span>
                        )}
                        {training.averageHeartRateBpm === null &&
                          training.averagePowerWatts === null &&
                          training.rpe === null && <span>—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="p-0 md:p-3">
                      <div className="flex justify-end gap-1 md:justify-start">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`${t('common.edit')}: ${label}`}
                          onClick={() => onEdit(training)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <ConfirmButton
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
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-2">
            <p className="type-caption tabular-nums text-muted-foreground">
              {currentPage * 20 + 1}–
              {Math.min((currentPage + 1) * 20, filtered.length)} /{' '}
              {filtered.length}
            </p>
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="outline"
                disabled={currentPage === 0}
                aria-label={t('common.back')}
                onClick={() => setPage(currentPage - 1)}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                size="icon"
                variant="outline"
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
