import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState, type ReactNode } from 'react'

import { EmptyState } from '@/apps/shared/components/EmptyState'
import { disciplineColors } from '@/apps/triathlon-tracker/presentation'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

export type ChartRange = '4w' | '12w' | '6m' | '1y' | 'all'

export type PerformanceChartPoint = {
  localDate: string
  label: string
  basis: 'benchmark' | 'training' | null
  primaryValue: number | null
  secondaryValue: number | null
  primaryDisplayValue: number | null
  secondaryDisplayValue: number | null
}

export type PerformanceActivityPoint = {
  activityId: string
  localDate: string
  label: string
  value: number
}

export type PerformancePlot = {
  id: 'swim' | 'bike' | 'run'
  title: string
  primaryLabel: string
  secondaryLabel: string | null
  activityLabel: string
  modelUnit: 'seconds' | 'watts'
  unit: 'kilometers-per-hour' | 'watts'
  points: PerformanceChartPoint[]
  activityPoints: PerformanceActivityPoint[]
}

export type ProgressChartPoint = {
  localDate: string
  label: string
  swim: number | null
  bike: number | null
  run: number | null
  overall: number | null
}

export type WeeklyVolumeChartPoint = {
  weekStart: string
  label: string
  swimHours: number
  bikeHours: number
  runHours: number
  swimKilometers: number
  bikeKilometers: number
  runKilometers: number
}

function formatClock(value: number) {
  const rounded = Math.max(0, Math.round(value))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60
  return hours > 0
    ? `${hours}:${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`
    : `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

function disciplineKey(value: unknown) {
  const normalized = String(value).replace(/Hours|Kilometers/, '')
  if (normalized === 'swim') return 'triathlon.discipline.swim' as const
  if (normalized === 'bike') return 'triathlon.discipline.bike' as const
  return 'triathlon.discipline.run' as const
}

const tooltipContentStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  color: 'var(--popover-foreground)',
  maxWidth: 'min(320px, calc(100vw - 32px))',
  fontSize: 12,
  whiteSpace: 'normal' as const,
  boxShadow: '0 8px 24px #1b2d3b18',
}

const tooltipItemStyle = {
  color: 'var(--popover-foreground)',
  whiteSpace: 'normal' as const,
}

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

function performanceChartPoints(plot: PerformancePlot) {
  const isPace = plot.id !== 'bike'
  const toAxis = (value: number | null) =>
    value === null
      ? null
      : isPace
        ? (plot.id === 'swim' ? 360 : 3600) / value
        : value
  return [
    ...plot.points.map((point) => ({
      ...point,
      timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
      primaryValue: toAxis(point.primaryValue),
      secondaryValue: toAxis(point.secondaryValue),
      actualValue: null as number | null,
      pointKind: 'model' as const,
      rowKey: `model-${point.localDate}`,
    })),
    ...plot.activityPoints.map((point) => ({
      ...point,
      timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
      actualValue: toAxis(point.value),
      pointKind: 'actual' as const,
      basis: null,
      primaryValue: null,
      secondaryValue: null,
      primaryDisplayValue: null,
      secondaryDisplayValue: null,
      rowKey: `actual-${point.activityId}-${point.localDate}`,
    })),
  ].sort(
    (left, right) =>
      left.localDate.localeCompare(right.localDate) ||
      left.pointKind.localeCompare(right.pointKind),
  )
}

function PerformancePlotCard({ plot }: { plot: PerformancePlot }) {
  const { formatNumber, formatDateTime, t } = useI18n()
  const disciplineColor = disciplineColors[plot.id]
  const isPace = plot.id !== 'bike'
  const chartPoints = performanceChartPoints(plot)
  const valueFormatter = (value: number) =>
    isPace
      ? `${formatClock(value)} min/${plot.id === 'swim' ? '100 m' : 'km'}`
      : plot.unit === 'watts'
        ? `${formatNumber(value, { maximumFractionDigits: 0 })} W`
        : `${formatNumber(value, { maximumFractionDigits: 1 })} km/h`
  const modelValueFormatter = (value: number) =>
    plot.modelUnit === 'seconds'
      ? formatClock(value)
      : `${formatNumber(value, { maximumFractionDigits: 0 })} W`

  const latestModel = plot.points.findLast(
    (point) => point.primaryDisplayValue !== null,
  )
  const observedTimestamps = chartPoints
    .filter(
      (point) =>
        point.primaryValue !== null ||
        point.secondaryValue !== null ||
        point.actualValue !== null,
    )
    .map((point) => point.timestamp)

  return (
    <Card
      className="tri-performance-card min-w-0 shadow-none"
      data-performance-plot={plot.id}
      data-discipline={plot.id}
    >
      <CardHeader className="tri-performance-heading p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ background: disciplineColor }}
            />
            {plot.title}
          </CardTitle>
          <span className="type-caption text-muted-foreground">
            {isPace
              ? plot.id === 'swim'
                ? 'min/100 m'
                : 'min/km'
              : plot.unit === 'watts'
                ? 'W'
                : 'km/h'}
          </span>
        </div>
        {latestModel && latestModel.primaryDisplayValue !== null && (
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="tri-plot-value tabular-nums">
                {modelValueFormatter(latestModel.primaryDisplayValue)}
              </p>
              <p className="mt-1 text-xs">
                {t('triathlon.charts.estimated')} · {plot.primaryLabel}
              </p>
            </div>
            <time
              className="text-xs text-muted-foreground"
              dateTime={latestModel.localDate}
            >
              {formatDateTime(new Date(latestModel.localDate + 'T12:00:00Z'), {
                day: '2-digit',
                month: 'short',
              })}
            </time>
          </div>
        )}
      </CardHeader>
      <CardContent className="tri-performance-content p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="tri-chart-legend mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full"
              style={{ background: 'var(--foreground)', opacity: 0.65 }}
            />
            {plot.activityLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="w-4 border-t-2"
              style={{ borderColor: disciplineColor }}
            />
            {t('triathlon.charts.estimated')} {plot.primaryLabel}
          </span>
          {plot.secondaryLabel && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="w-4 border-t-2 border-dashed"
                style={{ borderColor: disciplineColor }}
              />
              {plot.secondaryLabel}
            </span>
          )}
        </div>
        <div className="tri-plot-canvas h-56 min-w-0 sm:h-64">
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart
              data={chartPoints.filter((point) => point.pointKind === 'model')}
              margin={{ bottom: 4, left: 4, right: 12, top: 12 }}
            >
              <CartesianGrid
                stroke="var(--border)"
                strokeOpacity={0.6}
                strokeDasharray="0"
                vertical={false}
              />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={[
                  Math.min(...observedTimestamps) - 43200000,
                  Math.max(...observedTimestamps) + 43200000,
                ]}
                allowDataOverflow
                tickCount={3}
                minTickGap={40}
                tickFormatter={(value) =>
                  formatDateTime(new Date(Number(value)), {
                    day: '2-digit',
                    month: 'short',
                  })
                }
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                reversed={isPace}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                tickFormatter={(value: number) =>
                  isPace
                    ? formatClock(value)
                    : formatNumber(value, { maximumFractionDigits: 0 })
                }
                width={46}
                tickCount={4}
              />
              <Tooltip
                contentStyle={tooltipContentStyle}
                formatter={(value, name, item) => [
                  item.dataKey === 'timestamp'
                    ? formatDateTime(new Date(Number(value)), {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : valueFormatter(Number(value)),
                  item.dataKey === 'timestamp'
                    ? t('triathlon.form.date')
                    : item.payload?.basis
                      ? `${String(name)} · ${t(`triathlon.performance.basis.${item.payload.basis as 'benchmark' | 'training'}`)}`
                      : String(name),
                ]}
                labelFormatter={(_, payload) =>
                  payload[0]?.payload.localDate ?? ''
                }
                itemStyle={tooltipItemStyle}
              />
              <Line
                connectNulls={false}
                dataKey="primaryValue"
                dot={{ r: 2.5, fill: 'white', strokeWidth: 2 }}
                activeDot={{ r: 4, fill: 'white', strokeWidth: 2 }}
                name={plot.primaryLabel}
                stroke={disciplineColor}
                strokeWidth={3}
                isAnimationActive={false}
                type="linear"
              />
              {plot.secondaryLabel && (
                <Line
                  connectNulls={false}
                  dataKey="secondaryValue"
                  dot={{ r: 2.5, fill: 'white', strokeWidth: 2 }}
                  name={plot.secondaryLabel}
                  stroke={disciplineColor}
                  strokeDasharray="5 4"
                  strokeOpacity={0.8}
                  strokeWidth={2}
                  isAnimationActive={false}
                  type="linear"
                />
              )}
              <Scatter
                data={chartPoints.filter(
                  (point) => point.pointKind === 'actual',
                )}
                dataKey="actualValue"
                isAnimationActive={false}
                fill="var(--foreground)"
                fillOpacity={0.65}
                legendType="circle"
                name={plot.activityLabel}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceDataTable({ plot }: { plot: PerformancePlot }) {
  const { formatNumber, t } = useI18n()
  const chartPoints = performanceChartPoints(plot)
  const valueFormatter = (value: number) =>
    plot.id !== 'bike'
      ? `${formatClock(value)} min/${plot.id === 'swim' ? '100 m' : 'km'}`
      : plot.unit === 'watts'
        ? `${formatNumber(value, { maximumFractionDigits: 0 })} W`
        : `${formatNumber(value, { maximumFractionDigits: 1 })} km/h`
  const modelValueFormatter = (value: number) =>
    plot.modelUnit === 'seconds'
      ? formatClock(value)
      : `${formatNumber(value, { maximumFractionDigits: 0 })} W`
  return (
    <section
      className="min-w-0"
      data-performance-table={plot.id}
      aria-labelledby={`triathlon-data-${plot.id}`}
    >
      <h3 className="type-card-title" id={`triathlon-data-${plot.id}`}>
        {plot.title}
      </h3>
      <Table containerClassName="mt-3">
        <TableHeader>
          <TableHead>{t('triathlon.form.date')}</TableHead>
          <TableHead>{t('triathlon.charts.kind')}</TableHead>
          <TableHead>{plot.primaryLabel}</TableHead>
          {plot.secondaryLabel && <TableHead>{plot.secondaryLabel}</TableHead>}
          <TableHead>{plot.activityLabel}</TableHead>
        </TableHeader>
        <TableBody>
          {chartPoints
            .filter(
              (point) =>
                point.pointKind === 'actual' ||
                point.primaryValue !== null ||
                point.secondaryValue !== null,
            )
            .map((point) => (
              <TableRow key={point.rowKey}>
                <TableCell>{point.localDate}</TableCell>
                <TableCell>
                  {point.pointKind === 'actual'
                    ? t('triathlon.status.actual')
                    : `${t('triathlon.charts.model')} · ${t(`triathlon.performance.basis.${point.basis ?? 'training'}`)}`}
                </TableCell>
                <TableCell>
                  {point.primaryDisplayValue === null
                    ? '–'
                    : modelValueFormatter(point.primaryDisplayValue)}
                </TableCell>
                {plot.secondaryLabel && (
                  <TableCell>
                    {point.secondaryDisplayValue === null
                      ? '–'
                      : modelValueFormatter(point.secondaryDisplayValue)}
                  </TableCell>
                )}
                <TableCell>
                  {point.actualValue === null
                    ? '–'
                    : valueFormatter(point.actualValue)}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </section>
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

function PerformancePlots({ plots }: { plots: PerformancePlot[] }) {
  const { t } = useI18n()
  const populated = plots.filter(hasPerformanceData)
  if (populated.length === 0) {
    return (
      <EmptyState className="rounded-lg border bg-card p-6">
        {t('triathlon.charts.noPerformance')}
      </EmptyState>
    )
  }
  return (
    <div className="grid gap-3">
      <div className="tri-performance-plots grid gap-3">
        {populated.map((plot) => (
          <PerformancePlotCard key={plot.id} plot={plot} />
        ))}
      </div>
      {plots
        .filter((plot) => !hasPerformanceData(plot))
        .map((plot) => (
          <p className="type-caption text-muted-foreground" key={plot.id}>
            {t('triathlon.charts.noSportData', { sport: plot.title })}
          </p>
        ))}
    </div>
  )
}

function hasProgressData(points: ProgressChartPoint[]) {
  return points.some(
    (point) => point.swim !== null || point.bike !== null || point.run !== null,
  )
}

function ProgressCard({ points }: { points: ProgressChartPoint[] }) {
  const { formatNumber, formatDateTime, t } = useI18n()
  return (
    <div>
      <p className="type-caption mb-3 text-muted-foreground">
        {t('triathlon.charts.indexBasis')}
      </p>
      <div className="h-56 min-w-0 sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart
            data={points.map((point) => ({
              ...point,
              timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
            }))}
            margin={{ bottom: 4, left: 4, right: 12, top: 12 }}
          >
            <CartesianGrid
              stroke="var(--border)"
              strokeOpacity={0.6}
              strokeDasharray="2 6"
              vertical={false}
            />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={['dataMin - 43200000', 'dataMax + 43200000']}
              tickCount={4}
              minTickGap={32}
              tickFormatter={(value) =>
                formatDateTime(new Date(Number(value)), {
                  day: '2-digit',
                  month: 'short',
                })
              }
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
            />
            <YAxis
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              width={44}
            />
            <ReferenceLine
              y={100}
              stroke="var(--muted-foreground)"
              strokeDasharray="4 4"
            />
            <Tooltip
              contentStyle={tooltipContentStyle}
              formatter={(value, name) => [
                formatNumber(Number(value), { maximumFractionDigits: 1 }),
                name === 'overall'
                  ? t('triathlon.charts.overall')
                  : t(disciplineKey(name)),
              ]}
              labelFormatter={(_, payload) =>
                payload[0]?.payload.localDate ?? ''
              }
              itemStyle={tooltipItemStyle}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="circle"
              iconSize={8}
              height={36}
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) =>
                value === 'overall'
                  ? t('triathlon.charts.overall')
                  : t(disciplineKey(value))
              }
            />
            <Line
              connectNulls={false}
              dataKey="swim"
              dot={{ r: 2 }}
              isAnimationActive={false}
              stroke={disciplineColors.swim}
              strokeWidth={2}
            />
            <Line
              connectNulls={false}
              dataKey="bike"
              dot={{ r: 2 }}
              isAnimationActive={false}
              stroke={disciplineColors.bike}
              strokeWidth={2}
            />
            <Line
              connectNulls={false}
              dataKey="run"
              dot={{ r: 2 }}
              isAnimationActive={false}
              stroke={disciplineColors.run}
              strokeWidth={2}
            />
            <Line
              connectNulls={false}
              dataKey="overall"
              dot={{ r: 2 }}
              isAnimationActive={false}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ProgressDataTable({ points }: { points: ProgressChartPoint[] }) {
  const { formatNumber, t } = useI18n()
  return (
    <section className="min-w-0" aria-labelledby="triathlon-data-index">
      <h3 className="type-card-title" id="triathlon-data-index">
        {t('triathlon.charts.progress')}
      </h3>
      <Table containerClassName="mt-3">
        <TableHeader>
          <TableHead>{t('triathlon.form.date')}</TableHead>
          <TableHead>{t('triathlon.discipline.swim')}</TableHead>
          <TableHead>{t('triathlon.discipline.bike')}</TableHead>
          <TableHead>{t('triathlon.discipline.run')}</TableHead>
          <TableHead>{t('triathlon.charts.overall')}</TableHead>
        </TableHeader>
        <TableBody>
          {points.map((point) => (
            <TableRow key={point.localDate}>
              <TableCell>{point.localDate}</TableCell>
              {[point.swim, point.bike, point.run, point.overall].map(
                (value, index) => (
                  <TableCell key={index}>
                    {value === null
                      ? '–'
                      : formatNumber(value, { maximumFractionDigits: 1 })}
                  </TableCell>
                ),
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function WeeklyVolumeCard({ points }: { points: WeeklyVolumeChartPoint[] }) {
  const { formatNumber, t } = useI18n()
  const [volumeKind, setVolumeKind] = useState<'duration' | 'distance'>(
    'duration',
  )
  const hasVolume = points.some(
    (point) =>
      point.swimHours > 0 ||
      point.bikeHours > 0 ||
      point.runHours > 0 ||
      point.swimKilometers > 0 ||
      point.bikeKilometers > 0 ||
      point.runKilometers > 0,
  )
  const isDuration = volumeKind === 'duration'
  const unit = isDuration ? 'h' : 'km'
  const series = isDuration
    ? ([
        { dataKey: 'swimHours', discipline: 'swim' },
        { dataKey: 'bikeHours', discipline: 'bike' },
        { dataKey: 'runHours', discipline: 'run' },
      ] as const)
    : ([
        { dataKey: 'swimKilometers', discipline: 'swim' },
        { dataKey: 'bikeKilometers', discipline: 'bike' },
        { dataKey: 'runKilometers', discipline: 'run' },
      ] as const)
  return (
    <Card className="tri-volume-card min-w-0 shadow-none" data-weekly-volume>
      <CardHeader className="p-4 pb-2">
        <CardTitle>{t('triathlon.charts.weeklyVolume')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {!hasVolume ? (
          <EmptyState>{t('triathlon.charts.noVolume')}</EmptyState>
        ) : (
          <>
            <SegmentedControl
              aria-label={t('triathlon.charts.weeklyVolume')}
              className="mb-2 w-fit"
              value={volumeKind}
              onValueChange={(value) => setVolumeKind(value as 'duration' | 'distance')}
              options={(['duration', 'distance'] as const).map((value) => ({
                value,
                label: t(`triathlon.charts.${value}`),
              }))}
            />
            <dl className="tri-volume-legend mb-4 flex flex-wrap gap-x-6 gap-y-2">
              {series.map(({ dataKey, discipline }) => (
                <div className="flex items-baseline gap-2" key={discipline}>
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span
                      className="size-2 rounded-sm"
                      aria-hidden="true"
                      style={{ background: disciplineColors[discipline] }}
                    />
                    {t(disciplineKey(discipline))}
                  </dt>
                  <dd className="text-sm font-semibold tabular-nums">
                    {formatNumber(
                      points.reduce((sum, point) => sum + point[dataKey], 0),
                      { maximumFractionDigits: 1 },
                    )}{' '}
                    {unit}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="h-48 min-w-0 sm:h-56">
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={points}
                  barCategoryGap="25%"
                  margin={{ bottom: 4, left: 4, right: 12, top: 12 }}
                >
                  <CartesianGrid
                    stroke="var(--border)"
                    strokeOpacity={0.6}
                    strokeDasharray="2 6"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    minTickGap={28}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickCount={4}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    label={{
                      value: unit,
                      position: 'insideTopLeft',
                      offset: -3,
                      fill: 'var(--muted-foreground)',
                      fontSize: 11,
                    }}
                    width={isDuration ? 40 : 48}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value, name) => [
                      `${formatNumber(Number(value), { maximumFractionDigits: 1 })} ${unit}`,
                      t(disciplineKey(name)),
                    ]}
                    labelFormatter={(_, payload) =>
                      payload[0]?.payload.weekStart ?? ''
                    }
                    itemStyle={tooltipItemStyle}
                  />
                  {series.map(({ dataKey, discipline }, index) => (
                    <Bar
                      dataKey={dataKey}
                      maxBarSize={38}
                      isAnimationActive={false}
                      fill={disciplineColors[discipline]}
                      key={dataKey}
                      name={dataKey}
                      radius={
                        index === series.length - 1 ? [3, 3, 0, 0] : undefined
                      }
                      stackId={volumeKind}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default function TrainingCharts({
  performancePlots,
  progressPoints,
  range,
  rangeSummary,
  performanceControls,
  weeklyVolume,
  onRangeChange,
}: {
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
  const hasVolume = weeklyVolume.some(
    (point) =>
      point.swimHours +
        point.bikeHours +
        point.runHours +
        point.swimKilometers +
        point.bikeKilometers +
        point.runKilometers >
      0,
  )
  return (
    <section className="grid gap-4">
      <div className="flex justify-end">
        <RangePicker range={range} onRangeChange={onRangeChange} />
      </div>
      {rangeSummary}
      <WeeklyVolumeCard points={weeklyVolume} />
      {(hasVolume || hasPerformance) && (
        <>
          {performanceControls}
          {hasPerformance && (
            <p className="type-caption text-muted-foreground">
              {t('triathlon.charts.rawComparison')}
            </p>
          )}
          <PerformancePlots plots={performancePlots} />
        </>
      )}
      {hasProgress && (
        <details className="min-w-0 rounded-lg border bg-card">
          <summary className="type-action cursor-pointer p-4">
            {t('triathlon.charts.progress')}
          </summary>
          <div className="px-3 pb-3 sm:px-4 sm:pb-4">
            <ProgressCard points={progressPoints} />
          </div>
        </details>
      )}
      {(hasPerformance || hasProgress) && (
        <details
          className="min-w-0 rounded-lg border bg-card p-4"
          data-chart-tables
        >
          <summary className="type-action cursor-pointer">
            {t('triathlon.charts.table')}
          </summary>
          <div className="mt-4 grid gap-5">
            {performancePlots.filter(hasPerformanceData).map((plot) => (
              <PerformanceDataTable key={plot.id} plot={plot} />
            ))}
            {hasProgress && <ProgressDataTable points={progressPoints} />}
          </div>
        </details>
      )}
    </section>
  )
}
