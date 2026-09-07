import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  NotebookPen,
  Pencil,
  Plus,
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
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const filtered = actualTrainings
    .filter(
      (training) =>
        (discipline === 'all' || training.discipline === discipline) &&
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
            : t('triathlon.summary.trainingCount', { count: filtered.length })} ·{' '}
          {formatTrainingDuration(duration)} ·{' '}
          {formatNumber(distance / 1000, { maximumFractionDigits: 1 })} km
        </span>
      </div>
      <div className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Select
          value={discipline}
          onValueChange={(value) => {
            setDiscipline(value as Discipline | 'all')
            setPage(0)
          }}
        >
          <IftaSelectTrigger label={t('triathlon.form.discipline')}>
            <SelectValue />
          </IftaSelectTrigger>
          <SelectContent>
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
        <IftaInput
          label={t('triathlon.journal.from')}
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setPage(0)
          }}
        />
        <IftaInput
          label={t('triathlon.journal.to')}
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
            setPage(0)
          }}
        />
        <Button
          variant="ghost"
          className="h-11"
          disabled={discipline === 'all' && !from && !to}
          onClick={() => {
            setDiscipline('all')
            setFrom('')
            setTo('')
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
          <Table
            aria-label={t('triathlon.journal.title')}
            className="whitespace-nowrap"
          >
            <TableHeader>
              <TableHead aria-sort={ascending ? 'ascending' : 'descending'}>
                <button
                  className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    setAscending(!ascending)
                    setPage(0)
                  }}
                >
                  {t('triathlon.form.date')}
                  <ArrowDownWideNarrow aria-hidden="true" className="size-4" />
                </button>
              </TableHead>
              <TableHead>{t('triathlon.form.discipline')}</TableHead>
              <TableHead>{t('triathlon.journal.duration')}</TableHead>
              <TableHead>{t('triathlon.journal.distance')}</TableHead>
              <TableHead>{t('triathlon.journal.pace')}</TableHead>
              <TableHead>{t('triathlon.form.averageHeartRate')}</TableHead>
              <TableHead>{t('triathlon.form.averagePower')}</TableHead>
              <TableHead>RPE</TableHead>
              <TableHead>{t('triathlon.form.context')}</TableHead>
              <TableHead>{t('common.actions')}</TableHead>
            </TableHeader>
            <TableBody>
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
                    className="hover:bg-muted/30"
                    data-journal-training={training.id}
                  >
                    <TableCell>
                      <time dateTime={training.localDate}>
                        {formatDateTime(
                          new Date(`${training.localDate}T12:00:00`),
                          { day: '2-digit', month: 'short', year: 'numeric' },
                        )}
                      </time>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 font-semibold">
                        <Icon
                          aria-hidden="true"
                          className="size-4"
                          style={{
                            color: disciplineColors[training.discipline],
                          }}
                        />
                        {label}
                      </span>
                      {training.intervals.length > 0 && (
                        <span className="type-caption text-muted-foreground">
                          {t('triathlon.journal.intervals', {
                            count: training.intervals.length,
                          })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatTrainingDuration(training.durationSeconds)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {training.distanceMeters === null
                        ? '—'
                        : `${formatNumber(training.distanceMeters / 1000, { maximumFractionDigits: 2 })} km`}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {pace
                        ? `${pace} /${training.discipline === 'swim' ? '100 m' : 'km'}`
                        : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {training.averageHeartRateBpm ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {training.averagePowerWatts ?? '—'}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {training.rpe ?? '—'}
                    </TableCell>
                    <TableCell>
                      {training.context
                        ? t(`triathlon.context.${training.context}`)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
