import { X } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type RectangleProps,
} from 'recharts'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { EmptyState } from '@/apps/shared/components/EmptyState'
import {
  disciplineColors,
  disciplineFillColors,
  disciplineIcons,
} from '@/apps/triathlon-tracker/presentation'
import type { Discipline } from '@/apps/triathlon-tracker/types'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DisclosureSummary } from '@/components/ui/disclosure'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  evenlySpacedTicks,
  evenlySpacedTimestamps,
  maxTicksForWidth,
  niceVolumeTicks,
} from './chartTicks'
import { EstimateMark } from './PersonalBestsPanel'

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

export type EfficiencyChartPoint = {
  activityId: string
  localDate: string
  averageHeartRateBpm: number
  speedMetersPerSecond: number
  normalizedSpeedMetersPerSecond: number
  trendSpeedMetersPerSecond: number
  /** Interval sessions are drawn as rings. */
  source?: 'continuous' | 'intervals'
}

export type EfficiencyPlot = {
  /** Unique per plot; walking shares the running discipline. */
  key: string
  id: Discipline
  title: string
  /** Walks are shown as flat running equivalent. */
  unitNote?: string
  referenceHeartRateBpm: number
  points: EfficiencyChartPoint[]
}

/** A clicked (pinned) or hovered data point, in axis units. */
type SelectedPoint = {
  key: string
  timestamp: number
  value: number
  localDate: string
  seriesLabel: string
  isModel: boolean
  modelDisplayValue?: number | null
  basis?: 'benchmark' | 'training' | null
  heartRateBpm?: number
  actualValue?: number
  actualLabel?: string
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
  borderRadius: 10,
  color: 'var(--popover-foreground)',
  maxWidth: 'min(320px, calc(100vw - 32px))',
  fontSize: 12,
  whiteSpace: 'normal' as const,
  boxShadow: 'var(--shadow-overlay)',
}

const tooltipItemStyle = {
  color: 'var(--popover-foreground)',
  whiteSpace: 'normal' as const,
}

/** Dotted horizontal guides only, like a printed chart. */
const gridProps = {
  stroke: 'var(--border-strong, var(--border))',
  strokeDasharray: '1 5',
  strokeLinecap: 'round' as const,
  vertical: false,
}
const tickStyle = { fill: 'var(--muted-foreground)', fontSize: 11 }
/** Lighter sport tints mark measured history and secondary series. */
const activityOpacity = 0.45
const secondaryOpacity = 0.55
const dimmedOpacity = 0.25
const halfDayMs = 43_200_000
const dayMs = 2 * halfDayMs

function canHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover)').matches === true
  )
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(Math.round(element.getBoundingClientRect().width))
    // Deferring the update to the next frame avoids ResizeObserver loop errors
    // when the re-rendered tick labels change the observed layout again.
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        setWidth(Math.round(entry.contentRect.width)),
      )
    })
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])
  return [ref, width] as const
}

function LegendDot({
  color,
  opacity = 1,
  hollow = false,
}: {
  color: string
  opacity?: number
  hollow?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={
        hollow
          ? { border: `1.5px solid ${color}` }
          : { background: color, opacity }
      }
    />
  )
}

function LegendLine({ color, dash, opacity = 1 }: { color: string; dash: string; opacity?: number }) {
  return (
    <svg aria-hidden="true" className="h-2 w-5 shrink-0" viewBox="0 0 20 8">
      <line x1="0" x2="20" y1="4" y2="4" stroke={color} strokeDasharray={dash} strokeOpacity={opacity} strokeWidth="2" />
    </svg>
  )
}

/** Value badge drawn onto an axis where a crosshair line meets it. */
function AxisBadge({
  viewBox,
  axis,
  text,
  fill,
  textColor = '#fff',
}: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  axis: 'x' | 'y'
  text: string
  fill: string
  textColor?: string
}) {
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined) {
    return null
  }
  const width = text.length * 6.6 + 12
  const height = 18
  const x =
    axis === 'y' ? viewBox.x - width - 4 : viewBox.x - width / 2
  const y =
    axis === 'y'
      ? viewBox.y - height / 2
      : viewBox.y + (viewBox.height ?? 0) + 4
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} />
      <text
        x={x + width / 2}
        y={y + height / 2}
        dy="0.35em"
        fill={textColor}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  )
}

/** Data point with a generous invisible hit area for touch. */
function ClickablePoint({
  cx,
  cy,
  color,
  radius,
  filled,
  opacity,
  pinned,
  onSelect,
  onHoverChange,
}: {
  cx: number
  cy: number
  color: string
  radius: number
  filled: boolean
  opacity: number
  pinned: boolean
  onSelect: () => void
  onHoverChange: (hovered: boolean) => void
}) {
  return (
    <g
      className="cursor-pointer"
      data-chart-point
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onMouseEnter={() => {
        if (canHover()) onHoverChange(true)
      }}
      onMouseLeave={() => onHoverChange(false)}
    >
      <circle cx={cx} cy={cy} r={11} fill="transparent" />
      {pinned && (
        <circle cx={cx} cy={cy} r={radius + 5} fill={color} fillOpacity={0.2} />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={pinned ? radius + 1.5 : radius}
        fill={filled || pinned ? color : 'var(--card)'}
        fillOpacity={filled && !pinned ? opacity : 1}
        stroke={color}
        strokeOpacity={pinned ? 1 : Math.min(1, opacity * 2)}
        strokeWidth={filled && !pinned ? 0 : 2}
      />
    </g>
  )
}

/** Direct series label at the end of a line instead of a legend box. */
function endLabel(lastIndex: number, text: string, color: string, opacity = 1) {
  return function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
    const x = Number(props.x)
    const y = Number(props.y)
    if (props.index !== lastIndex || !Number.isFinite(x) || !Number.isFinite(y)) {
      return <g key={`end-${props.index}`} />
    }
    return (
      <text
        key={`end-${props.index}`}
        x={x + 8}
        y={y}
        dy="0.35em"
        fill={color}
        fillOpacity={opacity}
        fontSize={11}
        fontWeight={600}
      >
        {text}
      </text>
    )
  }
}

function lastIndexWhere<T>(items: readonly T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }
  return -1
}

function PointDetail({
  color,
  children,
  onClose,
}: {
  color?: string
  children: ReactNode
  onClose?: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className="tri-point-detail mt-2 flex min-h-11 items-center gap-3 rounded-md border bg-muted/40 py-1.5 pl-3 pr-1.5"
      data-point-detail
    >
      {color && <LegendDot color={color} />}
      <div className="type-caption flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-0.5 tabular-nums">
        {children}
      </div>
      {onClose && (
        <Button
          aria-label={t('triathlon.charts.unpin')}
          className="size-8 shrink-0 text-muted-foreground"
          size="icon"
          variant="ghost"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

function DetailItem({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      {label && <span className="inline-flex items-baseline text-muted-foreground">{label}</span>}
      <span className="font-semibold text-foreground">{children}</span>
    </span>
  )
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

type PerformanceChartDatum = ReturnType<typeof performanceChartPoints>[number]

function useValueFormatters(plot: Pick<PerformancePlot, 'id' | 'modelUnit' | 'unit'>) {
  const { formatNumber } = useI18n()
  const isPace = plot.id !== 'bike'
  const unitLabel = isPace
    ? plot.id === 'swim'
      ? '100 m'
      : 'km'
    : plot.unit === 'watts'
      ? 'W'
      : 'km/h'
  const axisValue = (value: number) =>
    isPace
      ? formatClock(value)
      : formatNumber(value, {
          maximumFractionDigits: plot.unit === 'watts' ? 0 : 1,
        })
  const valueWithUnit = (value: number) =>
    isPace ? `${formatClock(value)} /${unitLabel}` : `${axisValue(value)} ${unitLabel}`
  const modelValue = (value: number) =>
    plot.modelUnit === 'seconds'
      ? formatClock(value)
      : `${formatNumber(value, { maximumFractionDigits: 0 })} W`
  const difference = (value: number, reference: number) => {
    const change = value - reference
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±'
    return `${sign}${valueWithUnit(Math.abs(change))}`
  }
  const delta = (value: number, reference: number) => {
    const change = value - reference
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±'
    const percent = formatNumber(Math.abs((value / reference - 1) * 100), {
      maximumFractionDigits: 1,
    })
    return `${difference(value, reference)} (${sign}${percent} %)`
  }
  return { isPace, unitLabel, axisValue, valueWithUnit, modelValue, difference, delta }
}

function PerformancePlotCard({ plot }: { plot: PerformancePlot }) {
  const { formatDateTime, t } = useI18n()
  const color = disciplineColors[plot.id]
  const fill = disciplineFillColors[plot.id]
  const { isPace, unitLabel, axisValue, valueWithUnit, modelValue, delta } =
    useValueFormatters(plot)
  const chartPoints = performanceChartPoints(plot)
  const modelPoints = chartPoints.filter((point) => point.pointKind === 'model')
  const activityPoints = chartPoints.filter((point) => point.pointKind === 'actual')
  const [pinned, setPinned] = useState<SelectedPoint | null>(null)
  const [hovered, setHovered] = useState<SelectedPoint | null>(null)
  const [canvasRef, width] = useElementWidth<HTMLDivElement>()
  const shortDate = (timestamp: number) =>
    formatDateTime(new Date(timestamp), { day: '2-digit', month: 'short' })

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
  const isEmpty = observedTimestamps.length === 0
  // An empty plot spans the last four weeks so its date axis stays readable.
  const emptyEnd = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`)
  const domain: [number, number] = isEmpty
    ? [emptyEnd - 27 * dayMs - halfDayMs, emptyEnd + halfDayMs]
    : [
        Math.min(...observedTimestamps) - halfDayMs,
        Math.max(...observedTimestamps) + halfDayMs,
      ]
  const ticks = evenlySpacedTimestamps(
    domain[0] + halfDayMs,
    domain[1] - halfDayMs,
    Math.min(5, maxTicksForWidth(width - 60, 84)),
  )
  const lastPrimary = lastIndexWhere(modelPoints, (point) => point.primaryValue !== null)
  const lastSecondary = lastIndexWhere(modelPoints, (point) => point.secondaryValue !== null)
  const togglePin = (point: SelectedPoint) =>
    setPinned((current) => (current?.key === point.key ? null : point))
  const pointOpacity = (key: string, base: number) =>
    pinned && pinned.key !== key ? Math.min(base, dimmedOpacity) : base

  const renderModelDot =
    (series: 'primary' | 'secondary') =>
    (props: { cx?: number; cy?: number; index?: number; payload?: PerformanceChartDatum }) => {
      const { cx, cy, index, payload } = props
      const value = series === 'primary' ? payload?.primaryValue : payload?.secondaryValue
      if (cx == null || cy == null || payload == null || value == null) {
        return <g key={`${series}-${index}`} />
      }
      const point: SelectedPoint = {
        key: `${series}-${payload.rowKey}`,
        timestamp: payload.timestamp,
        value,
        localDate: payload.localDate,
        seriesLabel:
          series === 'primary' ? plot.primaryLabel : (plot.secondaryLabel ?? ''),
        isModel: true,
        modelDisplayValue:
          series === 'primary'
            ? payload.primaryDisplayValue
            : payload.secondaryDisplayValue,
        basis: payload.basis,
      }
      return (
        <ClickablePoint
          key={`${series}-${index}`}
          cx={cx}
          cy={cy}
          color={color}
          radius={series === 'primary' ? 2.5 : 2}
          filled={false}
          opacity={pointOpacity(point.key, series === 'primary' ? 1 : secondaryOpacity)}
          pinned={pinned?.key === point.key}
          onSelect={() => togglePin(point)}
          onHoverChange={(isHovered) => setHovered(isHovered ? point : null)}
        />
      )
    }
  const renderActivity = (props: unknown) => {
    const { cx, cy, payload } = props as {
      cx?: number
      cy?: number
      payload?: PerformanceChartDatum
    }
    if (cx == null || cy == null || payload?.actualValue == null) return <g />
    const point: SelectedPoint = {
      key: payload.rowKey,
      timestamp: payload.timestamp,
      value: payload.actualValue,
      localDate: payload.localDate,
      seriesLabel: plot.activityLabel,
      isModel: false,
    }
    return (
      <ClickablePoint
        cx={cx}
        cy={cy}
        color={color}
        radius={4}
        filled
        opacity={pointOpacity(point.key, activityOpacity)}
        pinned={pinned?.key === point.key}
        onSelect={() => togglePin(point)}
        onHoverChange={(isHovered) => setHovered(isHovered ? point : null)}
      />
    )
  }
  const shown = hovered ?? pinned
  const lineOpacity = pinned ? 0.35 : 1

  return (
    <Card
      className="tri-performance-card min-w-0 shadow-none"
      data-performance-plot={plot.id}
      data-discipline={plot.id}
    >
      <CardHeader className="tri-performance-heading p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <LegendDot color={color} />
            {plot.title}
          </CardTitle>
          <span className="type-caption text-muted-foreground">
            {isPace ? `min/${unitLabel}` : unitLabel}
          </span>
        </div>
        {latestModel && latestModel.primaryDisplayValue !== null && (
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="tri-plot-value">
                {modelValue(latestModel.primaryDisplayValue)}
                <EstimateMark />
              </p>
              <p className="type-caption mt-1 text-muted-foreground">
                {plot.primaryLabel}
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
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 pt-3 text-xs text-muted-foreground min-[900px]:pt-0">
          <span className="flex items-center gap-1.5">
            <LegendDot color={color} opacity={activityOpacity} />
            {plot.activityLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <LegendLine color={color} dash="6 4" />
            {t('triathlon.charts.estimated')}*
          </span>
        </div>
        <div className="tri-plot-canvas h-56 min-w-0 sm:h-64" ref={canvasRef}>
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart
              data={modelPoints}
              margin={{ bottom: 6, left: 4, right: 52, top: 12 }}
              onClick={() => setPinned(null)}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={domain}
                allowDataOverflow
                ticks={ticks}
                interval={0}
                tickFormatter={(value) => shortDate(Number(value))}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={tickStyle}
              />
              <YAxis
                domain={isEmpty ? [0, 3] : ['auto', 'auto']}
                reversed={isPace}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={isEmpty ? false : tickStyle}
                tickFormatter={(value: number) => axisValue(value)}
                width={46}
                tickCount={4}
              />
              {hovered && hovered.key !== pinned?.key && (
                <ReferenceLine
                  x={hovered.timestamp}
                  stroke="var(--muted-foreground)"
                  strokeDasharray="2 4"
                  ifOverflow="hidden"
                />
              )}
              {pinned && (
                <ReferenceLine
                  x={pinned.timestamp}
                  stroke={color}
                  strokeDasharray="3 3"
                  ifOverflow="hidden"
                  label={<AxisBadge axis="x" fill={fill} text={shortDate(pinned.timestamp)} />}
                />
              )}
              {pinned && (
                <ReferenceLine
                  y={pinned.value}
                  stroke={color}
                  strokeDasharray="3 3"
                  ifOverflow="hidden"
                  label={<AxisBadge axis="y" fill={fill} text={axisValue(pinned.value)} />}
                />
              )}
              {/* Model estimates are dashed; measured sessions are dots. */}
              <Line
                connectNulls={false}
                dataKey="primaryValue"
                dot={renderModelDot('primary')}
                activeDot={false}
                name={plot.primaryLabel}
                stroke={color}
                strokeDasharray="6 4"
                strokeOpacity={lineOpacity}
                strokeWidth={2.5}
                isAnimationActive={false}
                type="linear"
                label={endLabel(lastPrimary, plot.primaryLabel, color, lineOpacity)}
              />
              {plot.secondaryLabel && (
                <Line
                  connectNulls={false}
                  dataKey="secondaryValue"
                  dot={renderModelDot('secondary')}
                  activeDot={false}
                  name={plot.secondaryLabel}
                  stroke={color}
                  strokeDasharray="3 4"
                  strokeOpacity={secondaryOpacity * lineOpacity}
                  strokeWidth={2}
                  isAnimationActive={false}
                  type="linear"
                  label={endLabel(
                    lastSecondary,
                    plot.secondaryLabel,
                    color,
                    secondaryOpacity * lineOpacity,
                  )}
                />
              )}
              <Scatter
                data={activityPoints}
                dataKey="actualValue"
                isAnimationActive={false}
                fill={color}
                name={plot.activityLabel}
                shape={renderActivity}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {shown && (
          <PointDetail
            color={color}
            onClose={pinned ? () => setPinned(null) : undefined}
          >
            <DetailItem>
              {formatDateTime(new Date(shown.timestamp), {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </DetailItem>
            {shown.isModel && shown.modelDisplayValue != null ? (
              <DetailItem label={shown.seriesLabel}>
                {modelValue(shown.modelDisplayValue)}
                <EstimateMark />
              </DetailItem>
            ) : (
              <DetailItem label={shown.seriesLabel}>
                {valueWithUnit(shown.value)}
              </DetailItem>
            )}
            {shown.isModel && (
              <DetailItem>{valueWithUnit(shown.value)}</DetailItem>
            )}
            {shown.basis && (
              <span className="text-muted-foreground">
                {t(`triathlon.performance.basis.${shown.basis}`)}
              </span>
            )}
            {pinned && shown.key !== pinned.key && (
              <DetailItem label={t('triathlon.charts.vsPinned')}>
                {delta(shown.value, pinned.value)}
              </DetailItem>
            )}
          </PointDetail>
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

// Plots without comparable sessions stay visible as empty charts.
function PerformancePlots({ plots }: { plots: PerformancePlot[] }) {
  return (
    <div className="tri-performance-plots grid gap-3">
      {plots.map((plot) => (
        <PerformancePlotCard key={plot.id} plot={plot} />
      ))}
    </div>
  )
}

function efficiencyAxisValue(id: Discipline, metersPerSecond: number) {
  return id === 'bike'
    ? metersPerSecond * 3.6
    : (id === 'swim' ? 100 : 1000) / metersPerSecond
}

function EfficiencyCard({ plots }: { plots: EfficiencyPlot[] }) {
  const { formatDateTime, t } = useI18n()
  const populated = plots.filter((plot) => plot.points.length > 0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // Every plot stays selectable; without sessions it is simply empty.
  const plot =
    plots.find((candidate) => candidate.key === selectedKey) ??
    populated[0] ??
    plots[0]
  const [pinned, setPinned] = useState<SelectedPoint | null>(null)
  const [hovered, setHovered] = useState<SelectedPoint | null>(null)
  const [canvasRef, width] = useElementWidth<HTMLDivElement>()
  const formatters = useValueFormatters({
    id: plot?.id ?? 'run',
    modelUnit: 'seconds',
    unit: 'kilometers-per-hour',
  })

  if (!plot) {
    return (
      <Card className="min-w-0 shadow-none" data-efficiency-plot>
        <CardHeader className="p-4 pb-2">
          <CardTitle>{t('triathlon.charts.efficiency')}</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          <EmptyState>{t('triathlon.charts.noEfficiency')}</EmptyState>
        </CardContent>
      </Card>
    )
  }

  const color = disciplineColors[plot.id]
  const fill = disciplineFillColors[plot.id]
  const data = plot.points.map((point) => ({
    ...point,
    timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
    normalizedValue: efficiencyAxisValue(plot.id, point.normalizedSpeedMetersPerSecond),
    trendValue: efficiencyAxisValue(plot.id, point.trendSpeedMetersPerSecond),
    actualValue: efficiencyAxisValue(plot.id, point.speedMetersPerSecond),
  }))
  type Datum = (typeof data)[number]
  const first = data.at(0)
  const latest = data.at(-1)
  // An empty plot spans the last four weeks so its date axis stays readable.
  const emptyEnd = Date.parse(`${new Date().toISOString().slice(0, 10)}T12:00:00Z`)
  const startTimestamp = first?.timestamp ?? emptyEnd - 27 * dayMs
  const endTimestamp = latest?.timestamp ?? emptyEnd
  const domain: [number, number] = [
    startTimestamp - halfDayMs,
    endTimestamp + halfDayMs,
  ]
  const ticks = evenlySpacedTimestamps(
    startTimestamp,
    endTimestamp,
    Math.min(5, maxTicksForWidth(width - 60, 84)),
  )
  const shortDate = (timestamp: number) =>
    formatDateTime(new Date(timestamp), { day: '2-digit', month: 'short' })
  const togglePin = (point: SelectedPoint) =>
    setPinned((current) => (current?.key === point.key ? null : point))
  const renderSession = (props: unknown) => {
    const { cx, cy, payload } = props as { cx?: number; cy?: number; payload?: Datum }
    if (cx == null || cy == null || !payload) return <g />
    const point: SelectedPoint = {
      key: payload.activityId,
      timestamp: payload.timestamp,
      value: payload.normalizedValue,
      localDate: payload.localDate,
      seriesLabel: t('triathlon.charts.efficiencyAt', {
        bpm: plot.referenceHeartRateBpm,
      }),
      isModel: false,
      heartRateBpm: payload.averageHeartRateBpm,
      actualValue: payload.actualValue,
      actualLabel:
        payload.source === 'intervals'
          ? t('triathlon.charts.efficiencyIntervals')
          : undefined,
    }
    return (
      <ClickablePoint
        cx={cx}
        cy={cy}
        color={color}
        radius={4}
        filled={payload.source !== 'intervals'}
        opacity={pinned && pinned.key !== point.key ? dimmedOpacity : activityOpacity}
        pinned={pinned?.key === point.key}
        onSelect={() => togglePin(point)}
        onHoverChange={(isHovered) => setHovered(isHovered ? point : null)}
      />
    )
  }
  const shown = hovered ?? pinned

  return (
    <Card
      className="tri-performance-card min-w-0 shadow-none"
      data-efficiency-plot={plot.key}
      data-discipline={plot.id}
    >
      <CardHeader className="tri-performance-heading p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <LegendDot color={color} />
            {t('triathlon.charts.efficiency')}
          </CardTitle>
          <span className="type-caption text-muted-foreground">
            {formatters.isPace ? `min/${formatters.unitLabel}` : formatters.unitLabel}
            {plot.unitNote && ` · ${plot.unitNote}`}
          </span>
        </div>
        {first && latest && (
        <div className="mt-3">
          <p className="tri-plot-value">
            {formatters.isPace
              ? formatClock(latest.trendValue)
              : formatters.axisValue(latest.trendValue)}
          </p>
          <p className="type-caption mt-1 text-muted-foreground">
            {t('triathlon.charts.efficiencyAt', { bpm: plot.referenceHeartRateBpm })}
            {data.length > 1 && (
              <>
                {' · '}
                <span className="font-semibold text-foreground">
                  {formatters.difference(latest.trendValue, first.trendValue)}
                </span>{' '}
                {t('triathlon.charts.since', { date: shortDate(first.timestamp) })}
              </>
            )}
          </p>
        </div>
        )}
      </CardHeader>
      <CardContent className="tri-performance-content p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 pt-3 min-[900px]:pt-0">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <LegendDot color={color} opacity={activityOpacity} />
              {t('triathlon.charts.efficiencySession')}
            </span>
            {data.some((point) => point.source === 'intervals') && (
              <span className="flex items-center gap-1.5">
                <LegendDot color={color} hollow />
                {t('triathlon.charts.efficiencyIntervals')}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <LegendLine color={color} dash="0" />
              {t('triathlon.charts.efficiencyTrend')}
            </span>
          </div>
          {plots.length > 1 && (
            <SegmentedControl
              aria-label={t('triathlon.form.discipline')}
              className="w-fit [&>.selection-item]:flex-auto"
              value={plot.key}
              onValueChange={(value) => {
                setSelectedKey(value)
                setPinned(null)
                setHovered(null)
              }}
              options={plots.map((candidate) => ({
                value: candidate.key,
                label: candidate.title,
              }))}
            />
          )}
        </div>
        <div className="tri-plot-canvas h-56 min-w-0 sm:h-64" ref={canvasRef}>
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart
              data={data}
              margin={{ bottom: 6, left: 4, right: 52, top: 12 }}
              onClick={() => setPinned(null)}
            >
              <CartesianGrid {...gridProps} />
              <XAxis
                type="number"
                dataKey="timestamp"
                domain={domain}
                allowDataOverflow
                ticks={ticks}
                interval={0}
                tickFormatter={(value) => shortDate(Number(value))}
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                tick={tickStyle}
              />
              <YAxis
                domain={data.length === 0 ? [0, 3] : ['auto', 'auto']}
                reversed={formatters.isPace}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                tick={data.length === 0 ? false : tickStyle}
                tickFormatter={(value: number) => formatters.axisValue(value)}
                width={46}
                tickCount={4}
              />
              {pinned && (
                <ReferenceLine
                  x={pinned.timestamp}
                  stroke={color}
                  strokeDasharray="3 3"
                  ifOverflow="hidden"
                  label={<AxisBadge axis="x" fill={fill} text={shortDate(pinned.timestamp)} />}
                />
              )}
              {pinned && (
                <ReferenceLine
                  y={pinned.value}
                  stroke={color}
                  strokeDasharray="3 3"
                  ifOverflow="hidden"
                  label={<AxisBadge axis="y" fill={fill} text={formatters.axisValue(pinned.value)} />}
                />
              )}
              <Line
                dataKey="trendValue"
                dot={false}
                activeDot={false}
                name={t('triathlon.charts.efficiencyTrend')}
                stroke={color}
                strokeOpacity={pinned ? 0.4 : 1}
                strokeWidth={2.5}
                isAnimationActive={false}
                type="monotone"
                label={endLabel(
                  data.length - 1,
                  t('triathlon.charts.trend'),
                  color,
                  pinned ? 0.4 : 1,
                )}
              />
              <Scatter
                dataKey="normalizedValue"
                isAnimationActive={false}
                fill={color}
                name={t('triathlon.charts.efficiencySession')}
                shape={renderSession}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {shown && (
          <PointDetail color={color} onClose={pinned ? () => setPinned(null) : undefined}>
            <DetailItem>
              {formatDateTime(new Date(shown.timestamp), {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </DetailItem>
            <DetailItem label={shown.seriesLabel}>
              {formatters.valueWithUnit(shown.value)}
            </DetailItem>
            {shown.actualValue !== undefined && (
              <DetailItem label={shown.actualLabel ?? t('triathlon.charts.actualPace')}>
                {formatters.valueWithUnit(shown.actualValue)} ·{' '}
                {shown.heartRateBpm} bpm
              </DetailItem>
            )}
            {pinned && shown.key !== pinned.key && (
              <DetailItem label={t('triathlon.charts.vsPinned')}>
                {formatters.delta(shown.value, pinned.value)}
              </DetailItem>
            )}
          </PointDetail>
        )}
      </CardContent>
    </Card>
  )
}

function hasProgressData(points: ProgressChartPoint[]) {
  return points.some(
    (point) => point.swim !== null || point.bike !== null || point.run !== null,
  )
}

const progressSeries = ['swim', 'bike', 'run', 'overall'] as const
type ProgressSeries = (typeof progressSeries)[number]

function ProgressCard({ points }: { points: ProgressChartPoint[] }) {
  const { formatNumber, formatDateTime, t } = useI18n()
  const [focus, setFocus] = useState<ProgressSeries | null>(null)
  const seriesLabel = (series: ProgressSeries) =>
    series === 'overall' ? t('triathlon.charts.overall') : t(disciplineKey(series))
  const seriesColor = (series: ProgressSeries) =>
    series === 'overall' ? 'var(--foreground)' : disciplineColors[series]
  const data = points.map((point) => ({
    ...point,
    timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
  }))
  return (
    <div>
      <p className="type-caption mb-3 text-muted-foreground">
        {t('triathlon.charts.indexBasis')}
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label={t('triathlon.charts.progress')}>
        {progressSeries.map((series) => (
          <button
            key={series}
            type="button"
            aria-pressed={focus === series}
            className={cn(
              'type-caption flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground transition-opacity hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
              focus === series && 'bg-muted text-foreground',
              focus !== null && focus !== series && 'opacity-45',
            )}
            onClick={() => setFocus((current) => (current === series ? null : series))}
          >
            <LegendDot color={seriesColor(series)} />
            {seriesLabel(series)}
          </button>
        ))}
      </div>
      <div className="h-56 min-w-0 sm:h-64">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={data} margin={{ bottom: 4, left: 4, right: 12, top: 12 }}>
            <CartesianGrid {...gridProps} />
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
              tick={tickStyle}
            />
            <YAxis
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={tickStyle}
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
                seriesLabel(name as ProgressSeries),
              ]}
              labelFormatter={(_, payload) =>
                payload[0]?.payload.localDate ?? ''
              }
              itemStyle={tooltipItemStyle}
            />
            {progressSeries
              .filter((series) => focus === null || focus === series)
              .map((series) => (
                <Line
                  key={series}
                  connectNulls={false}
                  dataKey={series}
                  name={series}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                  stroke={seriesColor(series)}
                  strokeDasharray={series === 'overall' ? '5 4' : undefined}
                  strokeWidth={2}
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * Outer edges of one stacked segment, so the segments of a pinned week share
 * a single outline around the whole column instead of one per segment.
 */
function ColumnOutline({
  x,
  y,
  width,
  height,
  top,
  bottom,
}: {
  x: number
  y: number
  width: number
  height: number
  top: boolean
  bottom: boolean
}) {
  if (!(width > 0) || !(height > 0)) return null
  const r = top ? Math.min(6, width / 2, height) : 0
  const right = x + width
  const base = y + height
  const path = top
    ? `M ${x} ${base} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${right - r} ${y} Q ${right} ${y} ${right} ${y + r} L ${right} ${base}`
    : `M ${x} ${y} L ${x} ${base} M ${right} ${y} L ${right} ${base}`
  return (
    <path
      d={bottom ? `${path} ${top ? `L ${x} ${base}` : `M ${x} ${base} L ${right} ${base}`}` : path}
      fill="none"
      stroke="var(--foreground)"
      strokeWidth={1.5}
      strokeLinejoin="round"
      pointerEvents="none"
    />
  )
}

/** Discipline name with its icon in the sport color. */
function DisciplineLabel({
  discipline,
  compact = false,
}: {
  discipline: Discipline
  /** Icon only on phones; the name stays available to screen readers. */
  compact?: boolean
}) {
  const { t } = useI18n()
  const Icon = disciplineIcons[discipline]
  return (
    // Baseline alignment keeps the name level with a larger value next to it;
    // the icon is nudged down to sit centered on the text instead of above it.
    <span className="inline-flex items-baseline gap-1.5">
      <Icon
        aria-hidden="true"
        className="relative top-0.5 size-3.5 shrink-0"
        style={{ color: disciplineColors[discipline] }}
      />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>
        {t(disciplineKey(discipline))}
      </span>
    </span>
  )
}

function WeeklyVolumeCard({ points }: { points: WeeklyVolumeChartPoint[] }) {
  const { formatDateTime, formatNumber, t } = useI18n()
  const [volumeKind, setVolumeKind] = useState<'duration' | 'distance'>(
    'duration',
  )
  const [focus, setFocus] = useState<Discipline | null>(null)
  const [pinnedWeek, setPinnedWeek] = useState<string | null>(null)
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null)
  const [canvasRef, width] = useElementWidth<HTMLDivElement>()
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
  const allSeries = isDuration
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
  const series = allSeries.filter(
    ({ discipline }) => focus === null || focus === discipline,
  )
  const totalOf = (point: WeeklyVolumeChartPoint) =>
    series.reduce((sum, { dataKey }) => sum + point[dataKey], 0)
  const formatVolume = (value: number) =>
    `${formatNumber(value, { maximumFractionDigits: 1 })} ${unit}`
  const weekLabel = (weekStart: string) =>
    formatDateTime(new Date(`${weekStart}T12:00:00`), {
      day: '2-digit',
      month: 'short',
    })
  const ticks = evenlySpacedTicks(
    points.map((point) => point.weekStart),
    maxTicksForWidth(width - 56, 64),
  )
  const pinnedPoint = points.find((point) => point.weekStart === pinnedWeek)
  const volumeTicks = niceVolumeTicks(Math.max(0, ...points.map(totalOf)))
  const shownPoint = points.find(
    (point) => point.weekStart === (hoveredWeek ?? pinnedWeek),
  )
  const accent = focus ? disciplineFillColors[focus] : 'var(--foreground)'
  const accentText = focus ? '#fff' : 'var(--background)'
  // Full sport colors; only a pinned week dims the others.
  const barOpacity = (weekStart: string) =>
    pinnedWeek && weekStart !== pinnedWeek ? dimmedOpacity : 1
  // The rounded top belongs to the highest visible segment of each week.
  const topKey = (point: WeeklyVolumeChartPoint) =>
    [...series].reverse().find(({ dataKey }) => point[dataKey] > 0)?.dataKey
  const bottomKey = (point: WeeklyVolumeChartPoint) =>
    series.find(({ dataKey }) => point[dataKey] > 0)?.dataKey

  return (
    <Card className="min-w-0 shadow-none" data-weekly-volume>
      <CardHeader className="p-4 pb-2">
        {/* Title, unit switch and discipline legend share one row. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <CardTitle>{t('triathlon.charts.weeklyVolume')}</CardTitle>
            {hasVolume && (
              <SegmentedControl
                aria-label={t('triathlon.charts.weeklyVolume')}
                className="w-fit"
                value={volumeKind}
                onValueChange={(value) =>
                  setVolumeKind(value as 'duration' | 'distance')
                }
                options={(['duration', 'distance'] as const).map((value) => ({
                  value,
                  label: t(`triathlon.charts.${value}`),
                }))}
              />
            )}
          </div>
          {hasVolume && (
            <div
              className="tri-volume-legend -mx-1.5 flex flex-wrap gap-0.5"
              role="group"
              aria-label={t('triathlon.form.discipline')}
            >
              {allSeries.map(({ dataKey, discipline }) => (
                <button
                  key={discipline}
                  type="button"
                  aria-pressed={focus === discipline}
                  data-volume-filter={discipline}
                  title={t('triathlon.charts.showOnly', {
                    sport: t(disciplineKey(discipline)),
                  })}
                  className={cn(
                    'flex items-baseline gap-1.5 rounded-md px-1.5 py-1 transition-opacity hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
                    focus === discipline && 'bg-muted',
                    focus !== null && focus !== discipline && 'opacity-45',
                  )}
                  onClick={() => {
                    setFocus((current) => (current === discipline ? null : discipline))
                  }}
                >
                  <span className="text-xs text-muted-foreground">
                    <DisciplineLabel discipline={discipline} compact />
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
                    {formatVolume(
                      points.reduce((sum, point) => sum + point[dataKey], 0),
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        {!hasVolume ? (
          <EmptyState>{t('triathlon.charts.noVolume')}</EmptyState>
        ) : (
          <>
            <div className="h-48 min-w-0 sm:h-56" ref={canvasRef}>
              <ResponsiveContainer height="100%" width="100%">
                <BarChart
                  data={points}
                  barCategoryGap="28%"
                  margin={{ bottom: 6, left: 4, right: 12, top: 12 }}
                  onClick={(state) => {
                    const week =
                      typeof state.activeLabel === 'string' ? state.activeLabel : null
                    if (week)
                      setPinnedWeek((current) => (current === week ? null : week))
                  }}
                  onMouseMove={(state) => {
                    if (!canHover()) return
                    setHoveredWeek(
                      typeof state.activeLabel === 'string' ? state.activeLabel : null,
                    )
                  }}
                  onMouseLeave={() => setHoveredWeek(null)}
                >
                  <CartesianGrid {...gridProps} />
                  <XAxis
                    dataKey="weekStart"
                    ticks={ticks}
                    interval={0}
                    tickFormatter={(value) => weekLabel(String(value))}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={10}
                    tick={tickStyle}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    domain={[0, volumeTicks[volumeTicks.length - 1]]}
                    ticks={volumeTicks}
                    tick={tickStyle}
                    label={{
                      value: unit,
                      position: 'insideTopLeft',
                      offset: -3,
                      fill: 'var(--muted-foreground)',
                      fontSize: 11,
                    }}
                    width={isDuration ? 40 : 48}
                  />
                  <Tooltip content={() => null} cursor={false} />
                  {pinnedPoint && (
                    <ReferenceLine
                      y={totalOf(pinnedPoint)}
                      stroke={accent}
                      strokeDasharray="3 3"
                      ifOverflow="extendDomain"
                      label={
                        <AxisBadge
                          axis="y"
                          fill={accent}
                          textColor={accentText}
                          text={formatNumber(totalOf(pinnedPoint), {
                            maximumFractionDigits: 1,
                          })}
                        />
                      }
                    />
                  )}
                  {series.map(({ dataKey, discipline }) => (
                    <Bar
                      dataKey={dataKey}
                      maxBarSize={30}
                      isAnimationActive={false}
                      fill={disciplineColors[discipline]}
                      key={dataKey}
                      name={dataKey}
                      className="cursor-pointer"
                      stackId={volumeKind}
                      shape={(props: unknown) => {
                        const bar = props as RectangleProps & {
                          payload: WeeklyVolumeChartPoint
                        }
                        const week = bar.payload.weekStart
                        const isTop = topKey(bar.payload) === dataKey
                        return (
                          <g>
                            <Rectangle
                              {...bar}
                              fillOpacity={barOpacity(week)}
                              radius={isTop ? [6, 6, 0, 0] : 0}
                              stroke="none"
                            />
                            {week === pinnedWeek && (
                              <ColumnOutline
                                x={Number(bar.x)}
                                y={Number(bar.y)}
                                width={Number(bar.width)}
                                height={Number(bar.height)}
                                top={isTop}
                                bottom={bottomKey(bar.payload) === dataKey}
                              />
                            )}
                          </g>
                        )
                      }}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {shownPoint && (
              <PointDetail
                onClose={pinnedWeek ? () => setPinnedWeek(null) : undefined}
              >
                <DetailItem>
                  {t('triathlon.charts.week', {
                    date: formatDateTime(new Date(`${shownPoint.weekStart}T12:00:00`), {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    }),
                  })}
                </DetailItem>
                {series.map(({ dataKey, discipline }) => (
                  <DetailItem
                    key={dataKey}
                    label={<DisciplineLabel discipline={discipline} />}
                  >
                    {formatVolume(shownPoint[dataKey])}
                  </DetailItem>
                ))}
                {series.length > 1 && (
                  <DetailItem label={t('triathlon.charts.total')}>
                    {formatVolume(totalOf(shownPoint))}
                  </DetailItem>
                )}
                {pinnedPoint && shownPoint.weekStart !== pinnedPoint.weekStart && (
                  <DetailItem label={t('triathlon.charts.vsPinned')}>
                    {(() => {
                      const difference = totalOf(shownPoint) - totalOf(pinnedPoint)
                      const sign = difference > 0 ? '+' : difference < 0 ? '−' : '±'
                      return `${sign}${formatVolume(Math.abs(difference))}`
                    })()}
                  </DetailItem>
                )}
              </PointDetail>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
