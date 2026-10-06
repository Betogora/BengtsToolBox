import { lazy, Suspense, useMemo, useState } from 'react'
import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  analyzeBike,
  analyzeRun,
  analyzeSwim,
  calculateDisciplineProgressIndex,
  calculateOverallProgressIndex,
  getCurrentLocalDate,
  getDistanceActivityPerformancePoints,
  getPowerActivityPerformancePoints,
  summarizeWeeks,
} from './domain'
import type {
  ActualTraining,
  BikePerformanceAnalysis,
  CyclingContext,
  DistancePerformanceAnalysis,
  RunningContext,
  SwimmingContext,
  TrackerSettings,
} from './types'
import { defaultTrainingContexts, trainingContexts } from './types'
import type {
  ChartRange,
  PerformanceActivityPoint,
  PerformancePlot,
  ProgressChartPoint,
  WeeklyVolumeChartPoint,
} from './TrainingCharts'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useI18n } from '@/lib/i18n'
import { formatTrainingDuration } from './presentation'
const TrainingCharts = lazy(() => import('./TrainingCharts'))
type HistoricalAnalysis = {
  localDate: string
  run: ReturnType<typeof analyzeRun>
  swim: ReturnType<typeof analyzeSwim>
  bike: ReturnType<typeof analyzeBike>
}

function dateAtNoon(localDate: string) {
  return new Date(`${localDate}T12:00:00`)
}

function rangeStart(
  range: ChartRange,
  today: string,
  actualTrainings: readonly ActualTraining[],
) {
  if (range === '4w') return addDaysToLocalDate(today, -27)
  if (range === '12w') return addDaysToLocalDate(today, -83)
  if (range === '6m') return addMonthsToLocalDate(today, -6)
  if (range === '1y') return addMonthsToLocalDate(today, -12)
  return actualTrainings.reduce(
    (earliest, training) =>
      training.localDate < earliest ? training.localDate : earliest,
    today,
  )
}

function estimateAt(
  analysis: DistancePerformanceAnalysis,
  targetDistanceMeters: number,
) {
  return (
    analysis.estimates.find(
      (estimate) => estimate.targetDistanceMeters === targetDistanceMeters,
    )?.predictedDurationSeconds ?? null
  )
}

function bikeMetric(analysis: BikePerformanceAnalysis) {
  if (analysis.status !== 'ready') return null
  if (analysis.model === 'critical-power') {
    return {
      kind: 'power' as const,
      primary: analysis.criticalPowerWatts,
      secondary: analysis.criticalPowerWattsPerKg,
    }
  }
  return {
    kind: 'time' as const,
    primary: estimateAt(analysis, 20_000),
    secondary: estimateAt(analysis, 40_000),
  }
}

function speedAtDistance(
  distanceMeters: number,
  durationSeconds: number | null,
) {
  return durationSeconds === null || durationSeconds <= 0
    ? null
    : (distanceMeters / durationSeconds) * 3.6
}

export default function TrainingStatistics({
  actualTrainings,
  settings,
}: {
  actualTrainings: ActualTraining[]
  settings: TrackerSettings
}) {
  const { formatDateTime, t } = useI18n()
  const today = getCurrentLocalDate()
  const [chartRange, setChartRange] = useState<ChartRange>('12w')
  const [runContext, setRunContext] = useState<RunningContext>(
    defaultTrainingContexts.run,
  )
  const [swimContext, setSwimContext] = useState<SwimmingContext>(
    defaultTrainingContexts.swim,
  )
  const [bikeContext, setBikeContext] = useState<CyclingContext>(
    defaultTrainingContexts.bike,
  )
  const currentBike = useMemo(
    () =>
      analyzeBike(actualTrainings, {
        asOfLocalDate: today,
        context: bikeContext,
        weightKg: settings.weightKg,
      }),
    [actualTrainings, bikeContext, settings.weightKg, today],
  )
  const startLocalDate = useMemo(
    () => rangeStart(chartRange, today, actualTrainings),
    [actualTrainings, chartRange, today],
  )
  const firstTrainingLocalDate = useMemo(
    () => rangeStart('all', today, actualTrainings),
    [actualTrainings, today],
  )
  const allWeeklyStats = useMemo(
    () =>
      summarizeWeeks(
        actualTrainings.filter((training) => training.localDate <= today),
        firstTrainingLocalDate,
        today,
      ),
    [actualTrainings, firstTrainingLocalDate, today],
  )
  const weeklyStats = useMemo(
    () =>
      summarizeWeeks(
        actualTrainings.filter(
          (training) =>
            training.localDate >= startLocalDate && training.localDate <= today,
        ),
        startLocalDate,
        today,
      ),
    [actualTrainings, startLocalDate, today],
  )
  const allHistory = useMemo<HistoricalAnalysis[]>(
    () =>
      allWeeklyStats.map((week) => {
        const asOfLocalDate = [
          addDaysToLocalDate(week.weekStart, 6),
          today,
        ].sort()[0]
        return {
          localDate: asOfLocalDate,
          run: analyzeRun(actualTrainings, {
            asOfLocalDate,
            context: runContext,
          }),
          swim: analyzeSwim(actualTrainings, {
            asOfLocalDate,
            context: swimContext,
          }),
          bike: analyzeBike(actualTrainings, {
            asOfLocalDate,
            context: bikeContext,
            weightKg: settings.weightKg,
          }),
        }
      }),
    [
      actualTrainings,
      allWeeklyStats,
      bikeContext,
      runContext,
      settings.weightKg,
      swimContext,
      today,
    ],
  )
  const allHistoricalMetrics = useMemo(
    () =>
      allHistory.map((point) => ({
        localDate: point.localDate,
        runBasis: point.run.status === 'ready' ? point.run.basis : null,
        swimBasis: point.swim.status === 'ready' ? point.swim.basis : null,
        bikeBasis: point.bike.status === 'ready' ? point.bike.basis : null,
        run5k:
          point.run.status === 'ready' ? estimateAt(point.run, 5_000) : null,
        run10k:
          point.run.status === 'ready' ? estimateAt(point.run, 10_000) : null,
        swim750:
          point.swim.status === 'ready' ? estimateAt(point.swim, 750) : null,
        swim1500:
          point.swim.status === 'ready' ? estimateAt(point.swim, 1_500) : null,
        bike: bikeMetric(point.bike),
      })),
    [allHistory],
  )
  const historicalMetrics = useMemo(
    () =>
      allHistoricalMetrics.filter((point) => point.localDate >= startLocalDate),
    [allHistoricalMetrics, startLocalDate],
  )
  const bikeMetricKind =
    bikeMetric(currentBike)?.kind ??
    allHistoricalMetrics.findLast((point) => point.bike !== null)?.bike?.kind ??
    null
  const bikeBaseline =
    allHistoricalMetrics.find((point) => point.bike?.kind === bikeMetricKind)
      ?.bike?.primary ?? null
  const runBaseline =
    allHistoricalMetrics.find((point) => point.run5k !== null)?.run5k ?? null
  const swimBaseline =
    allHistoricalMetrics.find((point) => point.swim750 !== null)?.swim750 ??
    null

  const progressPoints = useMemo<ProgressChartPoint[]>(
    () =>
      historicalMetrics.map((point) => {
        const run =
          runBaseline === null || point.run5k === null
            ? null
            : calculateDisciplineProgressIndex(runBaseline, point.run5k, false)
        const swim =
          swimBaseline === null || point.swim750 === null
            ? null
            : calculateDisciplineProgressIndex(
                swimBaseline,
                point.swim750,
                false,
              )
        const comparableBike =
          point.bike?.kind === bikeMetricKind ? point.bike.primary : null
        const bike =
          bikeBaseline === null || comparableBike === null
            ? null
            : calculateDisciplineProgressIndex(
                bikeBaseline,
                comparableBike,
                bikeMetricKind === 'power',
              )
        return {
          localDate: point.localDate,
          label: formatDateTime(dateAtNoon(point.localDate), {
            day: '2-digit',
            month: 'short',
          }),
          swim,
          bike,
          run,
          overall: calculateOverallProgressIndex({ swim, bike, run }),
        }
      }),
    [
      bikeBaseline,
      bikeMetricKind,
      formatDateTime,
      historicalMetrics,
      runBaseline,
      swimBaseline,
    ],
  )

  const performancePlots = useMemo<PerformancePlot[]>(() => {
    const formatPointLabel = (localDate: string) =>
      formatDateTime(dateAtNoon(localDate), { day: '2-digit', month: 'short' })
    const toActivityPoint = (
      point: { activityId: string; localDate: string },
      value: number,
    ): PerformanceActivityPoint => ({
      activityId: point.activityId,
      localDate: point.localDate,
      label: formatPointLabel(point.localDate),
      value,
    })
    const runActivityPoints = getDistanceActivityPerformancePoints(
      actualTrainings,
      {
        discipline: 'run',
        context: runContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      },
    ).map((point) => toActivityPoint(point, point.speedKilometersPerHour))
    const swimActivityPoints = getDistanceActivityPerformancePoints(
      actualTrainings,
      {
        discipline: 'swim',
        context: swimContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      },
    ).map((point) => toActivityPoint(point, point.speedKilometersPerHour))
    const bikePowerActivityPoints = getPowerActivityPerformancePoints(
      actualTrainings,
      {
        context: bikeContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      },
    ).map((point) => toActivityPoint(point, point.averagePowerWatts))
    const bikeDistanceActivityPoints = getDistanceActivityPerformancePoints(
      actualTrainings,
      {
        discipline: 'bike',
        context: bikeContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      },
    ).map((point) => toActivityPoint(point, point.speedKilometersPerHour))
    const bikePlotKind =
      bikeMetricKind ?? (bikePowerActivityPoints.length > 0 ? 'power' : 'time')

    return [
      {
        id: 'run',
        title: t('triathlon.discipline.run'),
        primaryLabel: '5 km',
        secondaryLabel: '10 km',
        activityLabel: t('triathlon.charts.trainingPace'),
        modelUnit: 'seconds',
        unit: 'kilometers-per-hour',
        activityPoints: runActivityPoints,
        points: historicalMetrics.map((point) => ({
          localDate: point.localDate,
          label: formatPointLabel(point.localDate),
          basis: point.runBasis,
          primaryValue: speedAtDistance(5_000, point.run5k),
          secondaryValue: speedAtDistance(10_000, point.run10k),
          primaryDisplayValue: point.run5k,
          secondaryDisplayValue: point.run10k,
        })),
      },
      {
        id: 'swim',
        title: t('triathlon.discipline.swim'),
        primaryLabel: '750 m',
        secondaryLabel: '1500 m',
        activityLabel: t('triathlon.charts.trainingPace'),
        modelUnit: 'seconds',
        unit: 'kilometers-per-hour',
        activityPoints: swimActivityPoints,
        points: historicalMetrics.map((point) => ({
          localDate: point.localDate,
          label: formatPointLabel(point.localDate),
          basis: point.swimBasis,
          primaryValue: speedAtDistance(750, point.swim750),
          secondaryValue: speedAtDistance(1_500, point.swim1500),
          primaryDisplayValue: point.swim750,
          secondaryDisplayValue: point.swim1500,
        })),
      },
      {
        id: 'bike',
        title: t('triathlon.discipline.bike'),
        primaryLabel:
          bikePlotKind === 'power'
            ? t('triathlon.performance.bikeCp')
            : '20 km',
        secondaryLabel: bikePlotKind === 'time' ? '40 km' : null,
        activityLabel:
          bikePlotKind === 'power'
            ? t('triathlon.charts.trainingPower')
            : t('triathlon.charts.trainingSpeed'),
        modelUnit: bikePlotKind === 'power' ? 'watts' : 'seconds',
        unit: bikePlotKind === 'power' ? 'watts' : 'kilometers-per-hour',
        activityPoints:
          bikePlotKind === 'power'
            ? bikePowerActivityPoints
            : bikeDistanceActivityPoints,
        points: historicalMetrics.map((point) => ({
          localDate: point.localDate,
          label: formatPointLabel(point.localDate),
          basis: point.bikeBasis,
          primaryValue:
            point.bike?.kind !== bikePlotKind
              ? null
              : bikePlotKind === 'power'
                ? point.bike.primary
                : speedAtDistance(20_000, point.bike.primary),
          secondaryValue:
            point.bike?.kind === 'time' && bikePlotKind === 'time'
              ? speedAtDistance(40_000, point.bike.secondary)
              : null,
          primaryDisplayValue:
            point.bike?.kind === bikePlotKind ? point.bike.primary : null,
          secondaryDisplayValue:
            point.bike?.kind === 'time' && bikePlotKind === 'time'
              ? point.bike.secondary
              : null,
        })),
      },
    ]
  }, [
    actualTrainings,
    bikeContext,
    bikeMetricKind,
    formatDateTime,
    historicalMetrics,
    runContext,
    swimContext,
    startLocalDate,
    t,
    today,
  ])

  const weeklyVolume = useMemo<WeeklyVolumeChartPoint[]>(
    () =>
      weeklyStats.map((week) => ({
        weekStart: week.weekStart,
        label: formatDateTime(dateAtNoon(week.weekStart), {
          day: '2-digit',
          month: 'short',
        }),
        swimHours: week.byDiscipline.swim.durationSeconds / 3600,
        bikeHours: week.byDiscipline.bike.durationSeconds / 3600,
        runHours: week.byDiscipline.run.durationSeconds / 3600,
        swimKilometers: week.byDiscipline.swim.distanceMeters / 1000,
        bikeKilometers: week.byDiscipline.bike.distanceMeters / 1000,
        runKilometers: week.byDiscipline.run.distanceMeters / 1000,
      })),
    [formatDateTime, weeklyStats],
  )

  const visibleTrainings = actualTrainings.filter(
    (training) =>
      training.localDate >= startLocalDate && training.localDate <= today,
  )
  const totalDuration = visibleTrainings.reduce(
    (sum, training) => sum + (training.durationSeconds ?? 0),
    0,
  )

  const rangeSummary = (
    <dl className="grid grid-cols-3 divide-x rounded-lg border bg-card py-3">
      {[
        [
          t('triathlon.charts.totalTime'),
          formatTrainingDuration(totalDuration),
        ],
        [t('triathlon.charts.sessions'), visibleTrainings.length],
        [
          t('triathlon.charts.activeWeeks'),
          weeklyStats.filter((week) => week.totalTrainingCount > 0).length,
        ],
      ].map(([label, value]) => (
        <div className="min-w-0 px-3 sm:px-4" key={label}>
          <dt className="type-caption text-muted-foreground">{label}</dt>
          <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
  const performanceControls = (
    <div className="grid gap-3 lg:grid-cols-3">
      <div className="grid min-w-0 gap-1">
        <span className="type-field-label text-muted-foreground">
          {t('triathlon.discipline.swim')}
        </span>
        <SegmentedControl
          className="tri-context-control"
          aria-label={`${t('triathlon.form.context')}: ${t('triathlon.discipline.swim')}`}
          value={swimContext}
          onValueChange={(value) => setSwimContext(value as SwimmingContext)}
          options={trainingContexts.swim.map((context) => ({
            value: context,
            label: t(`triathlon.context.${context}`),
          }))}
        />
      </div>
      <div className="grid min-w-0 gap-1">
        <span className="type-field-label text-muted-foreground">
          {t('triathlon.discipline.bike')}
        </span>
        <SegmentedControl
          className="tri-context-control"
          aria-label={`${t('triathlon.form.context')}: ${t('triathlon.discipline.bike')}`}
          value={bikeContext}
          onValueChange={(value) => setBikeContext(value as CyclingContext)}
          options={trainingContexts.bike.map((context) => ({
            value: context,
            label: t(`triathlon.context.${context}`),
          }))}
        />
      </div>
      <div className="grid min-w-0 gap-1">
        <span className="type-field-label text-muted-foreground">
          {t('triathlon.discipline.run')}
        </span>
        <SegmentedControl
          className="tri-context-control"
          aria-label={`${t('triathlon.form.context')}: ${t('triathlon.discipline.run')}`}
          value={runContext}
          onValueChange={(value) => setRunContext(value as RunningContext)}
          options={trainingContexts.run.map((context) => ({
            value: context,
            label: t(`triathlon.context.${context}`),
          }))}
        />
      </div>
    </div>
  )

  return (
    <Suspense
      fallback={
        <div className="h-64 animate-pulse rounded-lg bg-muted" role="status">
          <span className="sr-only">{t('common.loading')}</span>
        </div>
      }
    >
      <TrainingCharts
        performancePlots={performancePlots}
        progressPoints={progressPoints}
        range={chartRange}
        rangeSummary={rangeSummary}
        performanceControls={performanceControls}
        weeklyVolume={weeklyVolume}
        onRangeChange={setChartRange}
      />
    </Suspense>
  )
}
