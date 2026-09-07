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
import { useState } from 'react'

import { EmptyState } from '@/apps/shared/components/EmptyState'
import { disciplineColors } from '@/apps/triathlon-tracker/presentation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
}

const tooltipItemStyle = { color: 'var(--popover-foreground)' }

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
    <div
      aria-label={t('triathlon.charts.range')}
      className="flex flex-wrap rounded-md border bg-background p-0.5"
      role="group"
    >
      {options.map((option) => (
        <Button
          aria-pressed={range === option}
          key={option}
          size="sm"
          type="button"
          variant={range === option ? 'secondary' : 'ghost'}
          onClick={() => onRangeChange(option)}
        >
          {t(`triathlon.charts.range.${option}`)}
        </Button>
      ))}
    </div>
  )
}

function PerformancePlotCard({ plot }: { plot: PerformancePlot }) {
  const { formatNumber, formatDateTime, t } = useI18n()
  const disciplineColor = disciplineColors[plot.id]
  const visiblePoints = plot.points.filter(
    (point) => point.primaryValue !== null || point.secondaryValue !== null,
  )
  const isPace = plot.id !== 'bike'
  const toAxis = (value: number | null) =>
    value === null
      ? null
      : isPace
        ? (plot.id === 'swim' ? 360 : 3600) / value
        : value
  const chartPoints = [
    ...visiblePoints.map((point) => ({
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

  return (
    <Card className="shadow-none" data-performance-plot={plot.id}>
      <CardHeader className="p-4 pb-2">
        <CardTitle>{plot.title}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {chartPoints.length === 0 ? (
          <EmptyState className="my-2">
            {t('triathlon.performance.notEnough')}
          </EmptyState>
        ) : (
          <>
            <div className="h-72 min-w-0 sm:h-80">
              <ResponsiveContainer height="100%" width="100%">
                <ComposedChart
                  data={chartPoints}
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
                    tickCount={5}
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
                    width={58}
                  />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    formatter={(value, name) => [
                      valueFormatter(Number(value)),
                      String(name),
                    ]}
                    labelFormatter={(_, payload) =>
                      payload[0]?.payload.localDate ?? ''
                    }
                    itemStyle={tooltipItemStyle}
                  />
                  <Legend
                    verticalAlign="top"
                    align="left"
                    iconSize={16}
                    height={36}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Line
                    connectNulls
                    dataKey="primaryValue"
                    dot={{ r: 2.5, fill: 'var(--card)', strokeWidth: 2 }}
                    name={plot.primaryLabel}
                    stroke={disciplineColor}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                    type="linear"
                  />
                  {plot.secondaryLabel && (
                    <Line
                      connectNulls
                      dataKey="secondaryValue"
                      dot={{ r: 3 }}
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
                    dataKey="actualValue"
                    isAnimationActive={false}
                    fill={disciplineColor}
                    legendType="circle"
                    name={plot.activityLabel}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <details className="mt-3 rounded-md border bg-background p-3">
              <summary className="type-action cursor-pointer">
                {t('triathlon.charts.table')}
              </summary>
              <Table containerClassName="mt-3">
                <TableHeader>
                  <TableHead>{t('triathlon.form.date')}</TableHead>
                  <TableHead>{t('triathlon.charts.kind')}</TableHead>
                  <TableHead>{plot.primaryLabel}</TableHead>
                  {plot.secondaryLabel && (
                    <TableHead>{plot.secondaryLabel}</TableHead>
                  )}
                  <TableHead>{plot.activityLabel}</TableHead>
                </TableHeader>
                <TableBody>
                  {chartPoints.map((point) => (
                    <TableRow key={point.rowKey}>
                      <TableCell>{point.localDate}</TableCell>
                      <TableCell>
                        {point.pointKind === 'actual'
                          ? t('triathlon.status.actual')
                          : t('triathlon.charts.model')}
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
            </details>
          </>
        )}
      </CardContent>
    </Card>
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
  return (
    <Tabs
      defaultValue={plots.find(hasPerformanceData)?.id ?? plots[0]?.id}
      className="gap-3"
    >
      <TabsList className="grid h-auto w-full grid-cols-3 sm:max-w-md">
        {plots.map((plot) => (
          <TabsTrigger className="py-2" key={plot.id} value={plot.id}>
            {plot.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {plots.map((plot) => (
        <TabsContent key={plot.id} value={plot.id}>
          <PerformancePlotCard plot={plot} />
        </TabsContent>
      ))}
    </Tabs>
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
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle>{t('triathlon.charts.progress')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="h-56 min-w-0 sm:h-72">
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
        <details className="mt-3 rounded-md border bg-background p-3">
          <summary className="type-action cursor-pointer">
            {t('triathlon.charts.table')}
          </summary>
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
        </details>
      </CardContent>
    </Card>
  )
}

function WeeklyVolumeCard({ points }: { points: WeeklyVolumeChartPoint[] }) {
  const { formatNumber, t } = useI18n()
  const [volumeKind, setVolumeKind] = useState<'duration' | 'distance'>(
    'distance',
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
    <Card data-weekly-volume>
      <CardHeader className="p-4 pb-2">
        <CardTitle>{t('triathlon.charts.weeklyVolume')}</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {!hasVolume ? (
          <EmptyState>{t('triathlon.charts.noVolume')}</EmptyState>
        ) : (
          <>
            <div
              aria-label={t('triathlon.charts.weeklyVolume')}
              className="mb-2 flex w-fit rounded-md border bg-background p-0.5"
              role="group"
            >
              {(['distance', 'duration'] as const).map((kind) => (
                <Button
                  aria-pressed={volumeKind === kind}
                  key={kind}
                  size="sm"
                  type="button"
                  variant={volumeKind === kind ? 'secondary' : 'ghost'}
                  onClick={() => setVolumeKind(kind)}
                >
                  {t(`triathlon.charts.${kind}`)}
                </Button>
              ))}
            </div>
            <div className="h-56 min-w-0 sm:h-72">
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
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    unit={` ${unit}`}
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
                  <Legend
                    verticalAlign="top"
                    align="left"
                    iconType="circle"
                    iconSize={8}
                    height={36}
                    wrapperStyle={{ fontSize: 12 }}
                    formatter={(value) => t(disciplineKey(value))}
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
  weeklyVolume,
  onRangeChange,
}: {
  performancePlots: PerformancePlot[]
  progressPoints: ProgressChartPoint[]
  range: ChartRange
  weeklyVolume: WeeklyVolumeChartPoint[]
  onRangeChange: (range: ChartRange) => void
}) {
  const hasProgress = hasProgressData(progressPoints)
  return (
    <section className="grid gap-4">
      <div className="flex justify-end">
        <RangePicker range={range} onRangeChange={onRangeChange} />
      </div>
      <div
        className={
          hasProgress ? 'grid gap-4 xl:grid-cols-[1.3fr_1fr]' : 'grid gap-4'
        }
      >
        <WeeklyVolumeCard points={weeklyVolume} />
        {hasProgress && <ProgressCard points={progressPoints} />}
      </div>
      <PerformancePlots plots={performancePlots} />
    </section>
  )
}
