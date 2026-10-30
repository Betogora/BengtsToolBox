import { lazy, memo, Suspense, useMemo, useState } from 'react'
import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
} from './domain/dates'
import { getEfficiencyTrend } from './domain/efficiency'
import {
  analyzeBike,
  analyzeRun,
  analyzeSwim,
  calculateDisciplineProgressIndex,
  calculateOverallProgressIndex,
  getDistanceActivityPerformancePoints,
  getPowerActivityPerformancePoints,
} from './domain/performance'
import { summarizeWeeks } from './domain/weeklyStats'
import type {
  ActualTraining,
  BikePerformanceAnalysis,
  CyclingContext,
  Discipline,
  DistancePerformanceAnalysis,
  InsufficientPerformanceAnalysis,
  RunningContext,
  SwimmingContext,
  TrackerSettings,
  TrainingContext,
} from './types'
import { defaultTrainingContexts, trainingContexts } from './types'
import type {
  ChartRange,
  EfficiencyPlot,
  PerformanceActivityPoint,
  PerformanceChartPoint,
  PerformancePlot,
  ProgressChartPoint,
  WeeklyVolumeChartPoint,
} from './charts/chartTypes'
import { IftaSelectTrigger } from '@/components/ui/ifta-field'
import { Select, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
import { formatTrainingDuration } from './presentation'
const TrainingCharts = lazy(() => import('./TrainingCharts'))

type I18n = ReturnType<typeof useI18n>

/** Weekly model estimates of one distance discipline at two race distances. */
type DistanceHistoryPoint = {
  localDate: string
  basis: PerformanceChartPoint['basis']
  primary: number | null
  secondary: number | null
}

type BikeHistoryPoint = {
  localDate: string
  basis: PerformanceChartPoint['basis']
  bike: ReturnType<typeof bikeMetric>
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

function distanceHistory(
  asOfLocalDates: readonly string[],
  analyze: (
    asOfLocalDate: string,
  ) => DistancePerformanceAnalysis | InsufficientPerformanceAnalysis,
  primaryDistanceMeters: number,
  secondaryDistanceMeters: number,
): DistanceHistoryPoint[] {
  return asOfLocalDates.map((localDate) => {
    const analysis = analyze(localDate)
    return analysis.status === 'ready'
      ? {
          localDate,
          basis: analysis.basis,
          primary: estimateAt(analysis, primaryDistanceMeters),
          secondary: estimateAt(analysis, secondaryDistanceMeters),
        }
      : { localDate, basis: null, primary: null, secondary: null }
  })
}

function formatPointLabel(
  formatDateTime: I18n['formatDateTime'],
  localDate: string,
) {
  return formatDateTime(dateAtNoon(localDate), { day: '2-digit', month: 'short' })
}

function toActivityPoint(
  formatDateTime: I18n['formatDateTime'],
  point: { activityId: string; localDate: string },
  value: number,
): PerformanceActivityPoint {
  return {
    activityId: point.activityId,
    localDate: point.localDate,
    label: formatPointLabel(formatDateTime, point.localDate),
    value,
  }
}

function distanceActivityPoints(
  formatDateTime: I18n['formatDateTime'],
  trainings: readonly ActualTraining[],
  options: Parameters<typeof getDistanceActivityPerformancePoints>[1],
) {
  return getDistanceActivityPerformancePoints(trainings, options).map((point) =>
    toActivityPoint(formatDateTime, point, point.speedKilometersPerHour),
  )
}

function distanceModelPoints(
  formatDateTime: I18n['formatDateTime'],
  history: readonly DistanceHistoryPoint[],
  primaryDistanceMeters: number,
  secondaryDistanceMeters: number,
): PerformanceChartPoint[] {
  return history.map((point) => ({
    localDate: point.localDate,
    label: formatPointLabel(formatDateTime, point.localDate),
    basis: point.basis,
    primaryValue: speedAtDistance(primaryDistanceMeters, point.primary),
    secondaryValue: speedAtDistance(secondaryDistanceMeters, point.secondary),
    primaryDisplayValue: point.primary,
    secondaryDisplayValue: point.secondary,
  }))
}

function efficiencyPlot(
  t: I18n['t'],
  trainings: readonly ActualTraining[],
  discipline: Discipline,
  context: TrainingContext,
  isWalk: boolean,
  options: {
    fromLocalDate: string
    asOfLocalDate: string
    restingHeartRateBpm: number | null
  },
): EfficiencyPlot {
  const trend = getEfficiencyTrend(trainings, {
    discipline,
    context,
    fromLocalDate: options.fromLocalDate,
    asOfLocalDate: options.asOfLocalDate,
    isWalk,
    restingHeartRateBpm: options.restingHeartRateBpm,
  })
  // Plots without sessions stay as empty, selectable charts.
  return {
    key: isWalk ? 'walk' : discipline,
    id: discipline,
    title: isWalk
      ? t('triathlon.variant.walk')
      : t(`triathlon.discipline.${discipline}`),
    unitNote: isWalk ? t('triathlon.charts.runningEquivalent') : undefined,
    referenceHeartRateBpm: trend?.referenceHeartRateBpm ?? 0,
    points: trend?.points ?? [],
  }
}

function TrainingStatistics({
  actualTrainings,
  settings,
}: {
  actualTrainings: ActualTraining[]
  settings: TrackerSettings
}) {
  const { formatDateTime, t } = useI18n()
  const today = getCurrentLocalDate()
  const [chartRange, setChartRange] = useState<ChartRange>('all')
  const [runContext, setRunContext] = useState<RunningContext>(
    defaultTrainingContexts.run,
  )
  const [swimContext, setSwimContext] = useState<SwimmingContext>(
    defaultTrainingContexts.swim,
  )
  const [bikeContext, setBikeContext] = useState<CyclingContext>(
    defaultTrainingContexts.bike,
  )
  // Every analysis only reads its own discipline, so each one works on its
  // pre-filtered sessions and a context change recomputes only that one.
  const runTrainings = useMemo(
    () => actualTrainings.filter((training) => training.discipline === 'run'),
    [actualTrainings],
  )
  const swimTrainings = useMemo(
    () => actualTrainings.filter((training) => training.discipline === 'swim'),
    [actualTrainings],
  )
  const bikeTrainings = useMemo(
    () => actualTrainings.filter((training) => training.discipline === 'bike'),
    [actualTrainings],
  )
  const currentBike = useMemo(
    () =>
      analyzeBike(bikeTrainings, {
        asOfLocalDate: today,
        context: bikeContext,
        weightKg: settings.weightKg,
      }),
    [bikeContext, bikeTrainings, settings.weightKg, today],
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
  const historyLocalDates = useMemo(
    () =>
      allWeeklyStats.map(
        (week) => [addDaysToLocalDate(week.weekStart, 6), today].sort()[0],
      ),
    [allWeeklyStats, today],
  )
  const runHistory = useMemo(
    () =>
      distanceHistory(
        historyLocalDates,
        (asOfLocalDate) =>
          analyzeRun(runTrainings, { asOfLocalDate, context: runContext }),
        5_000,
        10_000,
      ),
    [historyLocalDates, runContext, runTrainings],
  )
  const swimHistory = useMemo(
    () =>
      distanceHistory(
        historyLocalDates,
        (asOfLocalDate) =>
          analyzeSwim(swimTrainings, { asOfLocalDate, context: swimContext }),
        750,
        1_500,
      ),
    [historyLocalDates, swimContext, swimTrainings],
  )
  const bikeHistory = useMemo<BikeHistoryPoint[]>(
    () =>
      historyLocalDates.map((localDate) => {
        const analysis = analyzeBike(bikeTrainings, {
          asOfLocalDate: localDate,
          context: bikeContext,
          weightKg: settings.weightKg,
        })
        return {
          localDate,
          basis: analysis.status === 'ready' ? analysis.basis : null,
          bike: bikeMetric(analysis),
        }
      }),
    [bikeContext, bikeTrainings, historyLocalDates, settings.weightKg],
  )
  const visibleRunHistory = useMemo(
    () => runHistory.filter((point) => point.localDate >= startLocalDate),
    [runHistory, startLocalDate],
  )
  const visibleSwimHistory = useMemo(
    () => swimHistory.filter((point) => point.localDate >= startLocalDate),
    [swimHistory, startLocalDate],
  )
  const visibleBikeHistory = useMemo(
    () => bikeHistory.filter((point) => point.localDate >= startLocalDate),
    [bikeHistory, startLocalDate],
  )
  const bikeMetricKind =
    bikeMetric(currentBike)?.kind ??
    bikeHistory.findLast((point) => point.bike !== null)?.bike?.kind ??
    null
  const bikeBaseline =
    bikeHistory.find((point) => point.bike?.kind === bikeMetricKind)?.bike
      ?.primary ?? null
  const runBaseline =
    runHistory.find((point) => point.primary !== null)?.primary ?? null
  const swimBaseline =
    swimHistory.find((point) => point.primary !== null)?.primary ?? null

  const progressPoints = useMemo<ProgressChartPoint[]>(
    () =>
      // All histories share the same weeks, so equal indices align.
      visibleRunHistory.map((runPoint, index) => {
        const swimPoint = visibleSwimHistory[index]
        const bikePoint = visibleBikeHistory[index]
        const run =
          runBaseline === null || runPoint.primary === null
            ? null
            : calculateDisciplineProgressIndex(
                runBaseline,
                runPoint.primary,
                false,
              )
        const swim =
          swimBaseline === null || swimPoint.primary === null
            ? null
            : calculateDisciplineProgressIndex(
                swimBaseline,
                swimPoint.primary,
                false,
              )
        const comparableBike =
          bikePoint.bike?.kind === bikeMetricKind ? bikePoint.bike.primary : null
        const bike =
          bikeBaseline === null || comparableBike === null
            ? null
            : calculateDisciplineProgressIndex(
                bikeBaseline,
                comparableBike,
                bikeMetricKind === 'power',
              )
        return {
          localDate: runPoint.localDate,
          label: formatPointLabel(formatDateTime, runPoint.localDate),
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
      runBaseline,
      swimBaseline,
      visibleBikeHistory,
      visibleRunHistory,
      visibleSwimHistory,
    ],
  )

  const runPlot = useMemo<PerformancePlot>(
    () => ({
      id: 'run',
      title: t('triathlon.discipline.run'),
      primaryLabel: '5 km',
      secondaryLabel: '10 km',
      activityLabel: t('triathlon.charts.trainingPace'),
      modelUnit: 'seconds',
      unit: 'kilometers-per-hour',
      activityPoints: distanceActivityPoints(formatDateTime, runTrainings, {
        discipline: 'run',
        context: runContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      }),
      points: distanceModelPoints(
        formatDateTime,
        visibleRunHistory,
        5_000,
        10_000,
      ),
    }),
    [
      formatDateTime,
      runContext,
      runTrainings,
      startLocalDate,
      t,
      today,
      visibleRunHistory,
    ],
  )
  const swimPlot = useMemo<PerformancePlot>(
    () => ({
      id: 'swim',
      title: t('triathlon.discipline.swim'),
      primaryLabel: '750 m',
      secondaryLabel: '1500 m',
      activityLabel: t('triathlon.charts.trainingPace'),
      modelUnit: 'seconds',
      unit: 'kilometers-per-hour',
      activityPoints: distanceActivityPoints(formatDateTime, swimTrainings, {
        discipline: 'swim',
        context: swimContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      }),
      points: distanceModelPoints(
        formatDateTime,
        visibleSwimHistory,
        750,
        1_500,
      ),
    }),
    [
      formatDateTime,
      startLocalDate,
      swimContext,
      swimTrainings,
      t,
      today,
      visibleSwimHistory,
    ],
  )
  const bikePlot = useMemo<PerformancePlot>(() => {
    const bikePowerActivityPoints = getPowerActivityPerformancePoints(
      bikeTrainings,
      {
        context: bikeContext,
        fromLocalDate: startLocalDate,
        asOfLocalDate: today,
      },
    ).map((point) =>
      toActivityPoint(formatDateTime, point, point.averagePowerWatts),
    )
    const bikePlotKind =
      bikeMetricKind ?? (bikePowerActivityPoints.length > 0 ? 'power' : 'time')

    return {
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
          : distanceActivityPoints(formatDateTime, bikeTrainings, {
              discipline: 'bike',
              context: bikeContext,
              fromLocalDate: startLocalDate,
              asOfLocalDate: today,
            }),
      points: visibleBikeHistory.map((point) => ({
        localDate: point.localDate,
        label: formatPointLabel(formatDateTime, point.localDate),
        basis: point.basis,
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
    }
  }, [
    bikeContext,
    bikeMetricKind,
    bikeTrainings,
    formatDateTime,
    startLocalDate,
    t,
    today,
    visibleBikeHistory,
  ])
  const performancePlots = useMemo(
    () => [runPlot, swimPlot, bikePlot],
    [bikePlot, runPlot, swimPlot],
  )

  const efficiencyOptions = useMemo(
    () => ({
      fromLocalDate: startLocalDate,
      asOfLocalDate: today,
      restingHeartRateBpm: settings.restingHeartRateBpm ?? null,
    }),
    [settings.restingHeartRateBpm, startLocalDate, today],
  )
  const runEfficiency = useMemo(
    () =>
      efficiencyPlot(t, runTrainings, 'run', runContext, false, efficiencyOptions),
    [efficiencyOptions, runContext, runTrainings, t],
  )
  // Inclined walking only exists on the treadmill.
  const walkEfficiency = useMemo(
    () =>
      efficiencyPlot(t, runTrainings, 'run', 'treadmill', true, efficiencyOptions),
    [efficiencyOptions, runTrainings, t],
  )
  const bikeEfficiency = useMemo(
    () =>
      efficiencyPlot(t, bikeTrainings, 'bike', bikeContext, false, efficiencyOptions),
    [bikeContext, bikeTrainings, efficiencyOptions, t],
  )
  const swimEfficiency = useMemo(
    () =>
      efficiencyPlot(t, swimTrainings, 'swim', swimContext, false, efficiencyOptions),
    [efficiencyOptions, swimContext, swimTrainings, t],
  )
  const efficiencyPlots = useMemo(
    () => [runEfficiency, walkEfficiency, bikeEfficiency, swimEfficiency],
    [bikeEfficiency, runEfficiency, swimEfficiency, walkEfficiency],
  )

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
        strengthHours: week.strengthDurationSeconds / 3600,
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
          <dt className="tri-stat-label text-muted-foreground">
            {label}
          </dt>
          <dd className="mt-0.5 text-xl font-[650] tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
  const performanceControls = (
    <div className="grid gap-3 sm:grid-cols-3">
      <Select
        value={swimContext}
        onValueChange={(value) => setSwimContext(value as SwimmingContext)}
      >
        <IftaSelectTrigger label={t('triathlon.discipline.swim')}>
          <SelectValue />
        </IftaSelectTrigger>
        <SelectContent className="triathlon-tracker">
          {trainingContexts.swim.map((context) => (
            <SelectItem key={context} value={context}>
              {t(`triathlon.context.${context}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={bikeContext}
        onValueChange={(value) => setBikeContext(value as CyclingContext)}
      >
        <IftaSelectTrigger label={t('triathlon.discipline.bike')}>
          <SelectValue />
        </IftaSelectTrigger>
        <SelectContent className="triathlon-tracker">
          {trainingContexts.bike.map((context) => (
            <SelectItem key={context} value={context}>
              {t(`triathlon.context.${context}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={runContext}
        onValueChange={(value) => setRunContext(value as RunningContext)}
      >
        <IftaSelectTrigger label={t('triathlon.discipline.run')}>
          <SelectValue />
        </IftaSelectTrigger>
        <SelectContent className="triathlon-tracker">
          {trainingContexts.run.map((context) => (
            <SelectItem key={context} value={context}>
              {t(`triathlon.context.${context}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
        efficiencyPlots={efficiencyPlots}
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

// The tab stays mounted in the background; unrelated page updates (other tabs,
// dialogs) must not redraw every chart.
export default memo(TrainingStatistics)
