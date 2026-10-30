import type { ReactNode } from 'react'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DisclosureSummary } from '@/components/ui/disclosure'
import { useI18n } from '@/lib/i18n'
import type {
  ChartRange,
  EfficiencyPlot,
  PerformancePlot,
  ProgressChartPoint,
  WeeklyVolumeChartPoint,
} from './charts/chartTypes'
import { EfficiencyCard } from './charts/EfficiencyCard'
import { PerformancePlots } from './charts/PerformancePlots'
import { ProgressCard } from './charts/ProgressCard'
import { WeeklyVolumeCard } from './charts/WeeklyVolumeCard'

function RangePicker({
  range,
  onRangeChange,
}: {
  range: ChartRange
  onRangeChange: (range: ChartRange) => void
}) {
  const { t } = useI18n()
  const options: ChartRange[] = ['4w', '12w', '6m', '1y', 'all']

  return (
    <SegmentedControl
      aria-label={t('triathlon.charts.range')}
      value={range}
      onValueChange={(value) => onRangeChange(value as ChartRange)}
      options={options.map((value) => ({
        value,
        label: t(`triathlon.charts.range.${value}`),
      }))}
    />
  )
}

function hasPerformanceData(plot: PerformancePlot) {
  return (
    plot.activityPoints.length > 0 ||
    plot.points.some(
      (point) => point.primaryValue !== null || point.secondaryValue !== null,
    )
  )
}

function hasProgressData(points: ProgressChartPoint[]) {
  return points.some(
    (point) => point.swim !== null || point.bike !== null || point.run !== null,
  )
}

export default function TrainingCharts({
  efficiencyPlots,
  performancePlots,
  progressPoints,
  range,
  rangeSummary,
  performanceControls,
  weeklyVolume,
  onRangeChange,
}: {
  efficiencyPlots: EfficiencyPlot[]
  performancePlots: PerformancePlot[]
  progressPoints: ProgressChartPoint[]
  range: ChartRange
  rangeSummary: ReactNode
  performanceControls: ReactNode
  weeklyVolume: WeeklyVolumeChartPoint[]
  onRangeChange: (range: ChartRange) => void
}) {
  const { t } = useI18n()
  const hasProgress = hasProgressData(progressPoints)
  const hasPerformance = performancePlots.some(hasPerformanceData)
  const populatedEfficiency = efficiencyPlots.filter((plot) => plot.points.length > 0)
  const hasVolume = weeklyVolume.some(
    (point) =>
      point.swimHours +
        point.bikeHours +
        point.runHours +
        point.strengthHours +
        point.swimKilometers +
        point.bikeKilometers +
        point.runKilometers >
      0,
  )
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="type-section-title flex min-h-12 items-center">
          {t('triathlon.section.performance')}
        </h2>
        <RangePicker range={range} onRangeChange={onRangeChange} />
      </div>
      {rangeSummary}
      <WeeklyVolumeCard points={weeklyVolume} />
      {(hasVolume || hasPerformance) && (
        <>
          {performanceControls}
          <PerformancePlots plots={performancePlots} />
          <EfficiencyCard
            key={populatedEfficiency.map((plot) => plot.key).join('-')}
            plots={efficiencyPlots}
          />
        </>
      )}
      {hasProgress && (
        <details className="group min-w-0 rounded-lg border bg-card">
          <DisclosureSummary className="p-4">
            {t('triathlon.charts.progress')}
          </DisclosureSummary>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <ProgressCard points={progressPoints} />
          </div>
        </details>
      )}
    </section>
  )
}
