import { Activity, BarChart3 } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  CurrentWeekSummary,
  PerformanceCards,
  SectionHeading,
} from './components'
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
  summarizeWeek,
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
import { defaultTrainingContexts } from './types'
import type {
  ChartRange,
  PerformanceActivityPoint,
  PerformancePlot,
  ProgressChartPoint,
  WeeklyVolumeChartPoint,
} from './TrainingCharts'
import { IftaInput, IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useI18n } from '@/lib/i18n'
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

function formatRaceTime(seconds: number) {
  const rounded = Math.round(seconds)
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainingSeconds = rounded % 60
  return hours > 0
    ? `${hours}:${`${minutes}`.padStart(2, '0')}:${`${remainingSeconds}`.padStart(2, '0')}`
    : `${minutes}:${`${remainingSeconds}`.padStart(2, '0')}`
}

function asDistanceAnalysis(analysis: ReturnType<typeof analyzeRun>) {
  return analysis.status === 'ready' ? analysis : null
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

function WeightInput({
  weightKg,
  onSave,
}: {
  weightKg: number | null
  onSave: (weightKg: number | null) => Promise<unknown>
}) {
  const { t } = useI18n()
  const [value, setValue] = useState(weightKg === null ? '' : `${weightKg}`)
  const [invalid, setInvalid] = useState(false)

  const handleSave = async () => {
    const normalized = value.trim().replace(',', '.')
    const weight = normalized === '' ? null : Number(normalized)
    if (
      (weight !== null && !Number.isFinite(weight)) ||
      (weight !== null && (weight < 20 || weight > 300))
    ) {
      setInvalid(true)
      toast.error(t('triathlon.settings.invalidWeight'))
      return
    }
    setInvalid(false)
    if (weight === weightKg) return

    try {
      await onSave(weight)
      toast.success(t('triathlon.settings.weightSaved'))
    } catch {
      toast.error(t('triathlon.form.saveFailed'))
    }
  }

  return (
    <IftaInput
      aria-invalid={invalid}
      inputMode="decimal"
      label={t('triathlon.settings.weight')}
      max="300"
      min="20"
      step="0.1"
      type="number"
      value={value}
      onBlur={() => void handleSave()}
      onChange={(event) => {
        setValue(event.currentTarget.value)
        setInvalid(false)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}

export default function TrainingStatistics({
  actualTrainings,
  settings,
  onUpdateWeight,
}: {
  actualTrainings: ActualTraining[]
  settings: TrackerSettings
  onUpdateWeight: (weightKg: number | null) => Promise<unknown>
}) {
  const { formatDateTime, formatNumber, t } = useI18n()
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
  const currentWeek = useMemo(
    () => summarizeWeek(actualTrainings, today),
    [actualTrainings, today],
  )
  const currentRun = useMemo(
    () =>
      analyzeRun(actualTrainings, {
        asOfLocalDate: today,
        context: runContext,
      }),
    [actualTrainings, runContext, today],
  )
  const currentSwim = useMemo(
    () =>
      analyzeSwim(actualTrainings, {
        asOfLocalDate: today,
        context: swimContext,
      }),
    [actualTrainings, swimContext, today],
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
  const currentRunReady = asDistanceAnalysis(currentRun)
  const currentSwimReady = asDistanceAnalysis(currentSwim)
  const currentBikeMetric = bikeMetric(currentBike)
  const startLocalDate = useMemo(
    () => rangeStart(chartRange, today, actualTrainings),
    [actualTrainings, chartRange, today],
  )
  const firstTrainingLocalDate = useMemo(
    () => rangeStart('all', today, actualTrainings),
    [actualTrainings, today],
  )
  const allWeeklyStats = useMemo(
    () => summarizeWeeks(actualTrainings, firstTrainingLocalDate, today),
    [actualTrainings, firstTrainingLocalDate, today],
  )
  const weeklyStats = useMemo(
    () =>
      allWeeklyStats.filter(
        (week) => addDaysToLocalDate(week.weekStart, 6) >= startLocalDate,
      ),
    [allWeeklyStats, startLocalDate],
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
  const bikeMetricKind = bikeMetric(currentBike)?.kind ?? null
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
        primaryLabel: t('triathlon.performance.run5k'),
        secondaryLabel: t('triathlon.performance.run10k'),
        activityLabel: t('triathlon.charts.trainingPace'),
        modelUnit: 'seconds',
        unit: 'kilometers-per-hour',
        activityPoints: runActivityPoints,
        points: historicalMetrics.map((point) => ({
          localDate: point.localDate,
          label: formatPointLabel(point.localDate),
          primaryValue: speedAtDistance(5_000, point.run5k),
          secondaryValue: speedAtDistance(10_000, point.run10k),
          primaryDisplayValue: point.run5k,
          secondaryDisplayValue: point.run10k,
        })),
      },
      {
        id: 'swim',
        title: t('triathlon.discipline.swim'),
        primaryLabel: t('triathlon.performance.swim750'),
        secondaryLabel: t('triathlon.performance.swim1500'),
        activityLabel: t('triathlon.charts.trainingPace'),
        modelUnit: 'seconds',
        unit: 'kilometers-per-hour',
        activityPoints: swimActivityPoints,
        points: historicalMetrics.map((point) => ({
          localDate: point.localDate,
          label: formatPointLabel(point.localDate),
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
            : t('triathlon.performance.bike20k'),
        secondaryLabel:
          bikePlotKind === 'time' ? t('triathlon.performance.bike40k') : null,
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

  const currentRun5k = currentRunReady
    ? estimateAt(currentRunReady, 5_000)
    : null
  const currentRun10k = currentRunReady
    ? estimateAt(currentRunReady, 10_000)
    : null
  const currentSwim750 = currentSwimReady
    ? estimateAt(currentSwimReady, 750)
    : null
  const currentSwim1500 = currentSwimReady
    ? estimateAt(currentSwimReady, 1_500)
    : null
  const performanceCards = [
    {
      discipline: 'swim' as const,
      label: t('triathlon.performance.swim750'),
      value: currentSwim750 === null ? null : formatRaceTime(currentSwim750),
      detail:
        currentSwimReady && currentSwim1500 !== null
          ? `${t('triathlon.performance.swim1500')}: ${formatRaceTime(currentSwim1500)} · ${t('triathlon.performance.anchors', { count: currentSwimReady.anchorIds.length })}`
          : currentSwim.status === 'insufficient-data'
            ? t('triathlon.performance.dataProgress', {
                available: currentSwim.availableAnchors,
                required: currentSwim.requiredAnchors,
              })
            : null,
    },
    {
      discipline: 'bike' as const,
      label:
        currentBikeMetric?.kind === 'power'
          ? t('triathlon.performance.bikeCp')
          : t('triathlon.performance.bike20k'),
      value:
        currentBikeMetric?.primary === null || currentBikeMetric === null
          ? null
          : currentBikeMetric.kind === 'power'
            ? `${formatNumber(currentBikeMetric.primary, { maximumFractionDigits: 0 })} W${currentBikeMetric.secondary === null ? '' : ` · ${formatNumber(currentBikeMetric.secondary, { maximumFractionDigits: 2 })} W/kg`}`
            : formatRaceTime(currentBikeMetric.primary),
      detail:
        currentBike.status === 'ready'
          ? [
              currentBikeMetric?.kind === 'time' &&
              currentBikeMetric.secondary !== null
                ? `${t('triathlon.performance.bike40k')}: ${formatRaceTime(currentBikeMetric.secondary)}`
                : null,
              t('triathlon.performance.anchors', {
                count: currentBike.anchorIds.length,
              }),
            ]
              .filter(Boolean)
              .join(' · ')
          : t('triathlon.performance.dataProgress', {
              available: currentBike.availableAnchors,
              required: currentBike.requiredAnchors,
            }),
    },
    {
      discipline: 'run' as const,
      label: t('triathlon.performance.run5k'),
      value: currentRun5k === null ? null : formatRaceTime(currentRun5k),
      detail:
        currentRunReady && currentRun10k !== null
          ? [
              `${t('triathlon.performance.run10k')}: ${formatRaceTime(currentRun10k)}`,
              currentRunReady.supportingTrainingCount === 1
                ? t('triathlon.performance.oneSuitableTraining')
                : t('triathlon.performance.suitableTrainingCount', {
                    count: currentRunReady.supportingTrainingCount,
                  }),
            ].join(' · ')
          : currentRun.status === 'insufficient-data'
            ? t('triathlon.performance.dataProgress', {
                available: currentRun.availableAnchors,
                required: currentRun.requiredAnchors,
              })
            : null,
    },
  ]

  const explainedCards = performanceCards.map((card) => {
    const analysis =
      card.discipline === 'run'
        ? currentRun
        : card.discipline === 'swim'
          ? currentSwim
          : currentBike
    const method =
      analysis.status !== 'ready'
        ? null
        : analysis.model === 'power-law' && analysis.anchorIds.length === 1
          ? t('triathlon.performance.method.riegel')
          : t(`triathlon.performance.method.${analysis.model}`)
    return {
      ...card,
      method:
        analysis.status === 'ready'
          ? `${t(`triathlon.performance.basis.${analysis.basis}`)} · ${method}`
          : null,
    }
  })

  return (
    <div className="grid gap-6">
      <CurrentWeekSummary
        actualCount={currentWeek.totalTrainingCount}
        bikeDistanceMeters={currentWeek.byDiscipline.bike.distanceMeters}
        bikeDurationSeconds={currentWeek.byDiscipline.bike.durationSeconds}
        bikeTrainingCount={currentWeek.byDiscipline.bike.trainingCount}
        runDistanceMeters={currentWeek.byDiscipline.run.distanceMeters}
        runDurationSeconds={currentWeek.byDiscipline.run.durationSeconds}
        runTrainingCount={currentWeek.byDiscipline.run.trainingCount}
        swimDistanceMeters={currentWeek.byDiscipline.swim.distanceMeters}
        swimDurationSeconds={currentWeek.byDiscipline.swim.durationSeconds}
        swimTrainingCount={currentWeek.byDiscipline.swim.trainingCount}
        totalDurationSeconds={currentWeek.totalDurationSeconds}
      />

      <section className="grid gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <SectionHeading
            icon={
              <BarChart3 aria-hidden="true" className="size-5 text-primary" />
            }
          >
            {t('triathlon.section.performance')}
          </SectionHeading>
          <span className="type-caption text-muted-foreground">
            {t('triathlon.performance.window')}
          </span>
          <div className="grid grid-cols-2 gap-2 xl:w-[48rem] xl:grid-cols-4">
            <Select
              value={swimContext}
              onValueChange={(value) =>
                setSwimContext(value as SwimmingContext)
              }
            >
              <IftaSelectTrigger label={t('triathlon.discipline.swim')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                {(['pool-25', 'pool-50', 'open-water'] as const).map(
                  (context) => (
                    <SelectItem key={context} value={context}>
                      {t(`triathlon.context.${context}`)}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
            <Select
              value={bikeContext}
              onValueChange={(value) => setBikeContext(value as CyclingContext)}
            >
              <IftaSelectTrigger label={t('triathlon.discipline.bike')}>
                <SelectValue />
              </IftaSelectTrigger>
              <SelectContent>
                {(['indoor', 'outdoor'] as const).map((context) => (
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
              <SelectContent>
                {(['road', 'track', 'treadmill'] as const).map((context) => (
                  <SelectItem key={context} value={context}>
                    {t(`triathlon.context.${context}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <WeightInput
              key={settings.weightKg ?? 'empty'}
              weightKg={settings.weightKg}
              onSave={(weightKg) => onUpdateWeight(weightKg)}
            />
          </div>
        </div>
        <PerformanceCards cards={explainedCards} />
        <details className="rounded-lg border bg-card p-4">
          <summary className="type-action cursor-pointer">
            {t('triathlon.performance.methodology')}
          </summary>
          <div className="type-ui mt-4 grid gap-3 text-muted-foreground">
            <p>{t('triathlon.performance.explanation.data')}</p>
            <p>
              {t('triathlon.performance.explanation.run')}{' '}
              <a
                className="underline"
                href="https://pubmed.ncbi.nlm.nih.gov/27570626/"
                target="_blank"
                rel="noreferrer"
              >
                Vickers &amp; Vertosick, 2016
              </a>
            </p>
            <p>
              {t('triathlon.performance.explanation.swim')}{' '}
              <a
                className="underline"
                href="https://pubmed.ncbi.nlm.nih.gov/38380294/"
                target="_blank"
                rel="noreferrer"
              >
                Stroke-Specific Swimming Critical Speed Testing, 2024
              </a>
            </p>
            <p>
              {t('triathlon.performance.explanation.bike')}{' '}
              <a
                className="underline"
                href="https://pubmed.ncbi.nlm.nih.gov/34708276/"
                target="_blank"
                rel="noreferrer"
              >
                Power profiling and the power-duration relationship, 2021
              </a>
            </p>
          </div>
        </details>
      </section>

      <section className="grid gap-3">
        <SectionHeading
          icon={<Activity aria-hidden="true" className="size-5 text-primary" />}
        >
          {t('triathlon.section.charts')}
        </SectionHeading>
        <Suspense
          fallback={
            <div
              className="h-72 animate-pulse rounded-lg bg-muted"
              role="status"
            >
              <span className="sr-only">{t('common.loading')}</span>
            </div>
          }
        >
          <TrainingCharts
            performancePlots={performancePlots}
            progressPoints={progressPoints}
            range={chartRange}
            weeklyVolume={weeklyVolume}
            onRangeChange={setChartRange}
          />
        </Suspense>
      </section>
    </div>
  )
}
