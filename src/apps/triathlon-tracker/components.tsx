import { Clock3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'
import { numberFormat } from '@/lib/i18n/formatters'
import { formatTrainingDuration as formatDuration } from './presentation'
import type { WeekStats } from './types'

function formatDistance(meters: number | null, locale: string) {
  if (meters === null) return null
  return `${numberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)} km`
}

export function CurrentWeekSummary({ week }: { week: WeekStats }) {
  const { locale, t } = useI18n()
  const disciplines = (['swim', 'bike', 'run'] as const).map((discipline) => ({
    discipline,
    duration: week.byDiscipline[discipline].durationSeconds,
    distance: week.byDiscipline[discipline].distanceMeters,
    count: week.byDiscipline[discipline].trainingCount,
  }))
  const trainingCountLabel = (count: number) =>
    count === 1
      ? t('triathlon.summary.oneTraining')
      : t('triathlon.summary.trainingCount', { count })

  return (
    <section
      className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3"
      aria-labelledby="current-week-title"
    >
      <div
        className="tri-week-total min-w-0 rounded-lg border bg-card px-4 py-3.5"
        data-week-summary-item
      >
        <h2
          id="current-week-title"
          className="tri-stat-label text-muted-foreground"
        >
          {t('triathlon.summary.thisWeek')}
        </h2>
        <p className="tri-stat-value mt-1">
          {formatDuration(week.totalDurationSeconds)}
        </p>
        <p className="type-caption mt-0.5 text-muted-foreground tabular-nums">
          {trainingCountLabel(week.totalTrainingCount)}
        </p>
      </div>

      {disciplines.map(({ discipline, duration, distance, count }) => (
        <div
          className="min-w-0 rounded-lg border bg-card px-4 py-3.5"
          data-discipline={discipline}
          data-discipline-summary={discipline}
          data-week-summary-item
          key={discipline}
        >
          <p className="tri-stat-label flex items-center gap-2 text-muted-foreground">
            <span aria-hidden="true" className="tri-sport-dot" />
            {t(`triathlon.discipline.${discipline}`)}
          </p>
          <p className="tri-stat-value mt-1">{formatDuration(duration)}</p>
          <p className="type-caption mt-0.5 flex flex-wrap gap-x-1 text-muted-foreground tabular-nums">
            {distance > 0 && (
              <span>{formatDistance(distance, locale)} ·</span>
            )}
            <span>{trainingCountLabel(count)}</span>
          </p>
        </div>
      ))}
    </section>
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
  return (
    <Badge variant="secondary">
      <Clock3 aria-hidden="true" />
      {t('common.syncing')}
    </Badge>
  )
}
