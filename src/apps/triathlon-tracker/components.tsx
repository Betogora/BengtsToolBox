import { Clock3 } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { AppPageStatus } from '@/apps/shared/components/AppPageHeader'
import { useI18n } from '@/lib/i18n'
import { numberFormat } from '@/lib/i18n/formatters'
import { cn } from '@/lib/utils'
import { formatTrainingDuration as formatDuration } from './presentation'
import type { WeekStats } from './types'

function formatDistance(meters: number | null, locale: string) {
  if (meters === null) return null
  return `${numberFormat(locale, { maximumFractionDigits: 2 }).format(meters / 1000)} km`
}

// Kennzahlenband: eine Fläche, Haarlinien als Teiler, Werte auf der Metrik-Skala.
export function StatBand({
  children,
  className,
  ...props
}: ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'grid gap-px overflow-hidden rounded-lg border bg-border shadow-xs',
        className,
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function StatBandItem({
  children,
  className,
  label,
  sub,
  ...props
}: Omit<ComponentProps<'div'>, 'children'> & {
  children: ReactNode
  label: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className={cn('min-w-0 bg-card px-4 py-3', className)} {...props}>
      <div className="type-caption flex items-center gap-1.5 text-muted-foreground">{label}</div>
      <div className="type-metric-sm mt-0.5">{children}</div>
      {sub && (
        <div className="type-caption mt-0.5 flex flex-wrap gap-x-1 text-muted-foreground tabular-nums">
          {sub}
        </div>
      )}
    </div>
  )
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
    <StatBand className="grid-cols-2 sm:grid-cols-4" aria-labelledby="current-week-title">
      <StatBandItem
        data-week-summary-item
        label={<h2 id="current-week-title">{t('triathlon.summary.thisWeek')}</h2>}
        sub={trainingCountLabel(week.totalTrainingCount)}
      >
        {formatDuration(week.totalDurationSeconds)}
      </StatBandItem>

      {disciplines.map(({ discipline, duration, distance, count }) => (
        <StatBandItem
          data-discipline={discipline}
          data-discipline-summary={discipline}
          data-week-summary-item
          key={discipline}
          label={
            <>
              <span aria-hidden="true" className="tri-sport-dot" />
              {t(`triathlon.discipline.${discipline}`)}
            </>
          }
          sub={
            <>
              {distance > 0 && <span>{formatDistance(distance, locale)} ·</span>}
              <span>{trainingCountLabel(count)}</span>
            </>
          }
        >
          {formatDuration(duration)}
        </StatBandItem>
      ))}
    </StatBand>
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
    <AppPageStatus Icon={Clock3}>
      <span role="status">{t('common.syncing')}</span>
    </AppPageStatus>
  )
}
