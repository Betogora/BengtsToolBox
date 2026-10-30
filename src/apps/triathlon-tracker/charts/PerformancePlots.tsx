import {
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { memo, useMemo } from 'react'

import { disciplineColors, disciplineFillColors } from '@/apps/triathlon-tracker/presentation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { EstimateMark } from '../EstimateMark'
import {
  AxisBadge,
  ClickablePoint,
  DetailItem,
  LegendDot,
  LegendLine,
  PointDetail,
} from './chartParts'
import type { PerformancePlot, SelectedPoint } from './chartTypes'
import {
  activityOpacity,
  dimmedOpacity,
  endLabel,
  gridProps,
  lastIndexWhere,
  secondaryOpacity,
  tickStyle,
  usePinnedTimeAxis,
  useValueFormatters,
} from './chartUtils'

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

const PerformancePlotCard = memo(function PerformancePlotCard({
  plot,
}: {
  plot: PerformancePlot
}) {
  const { formatDateTime, t } = useI18n()
  const color = disciplineColors[plot.id]
  const fill = disciplineFillColors[plot.id]
  const { isPace, unitLabel, axisValue, valueWithUnit, modelValue, delta } =
    useValueFormatters(plot)
  // Hovering re-renders the card; the series only follow the plot itself.
  const {
    modelPoints,
    activityPoints,
    observedSpan,
    latestModel,
    lastPrimary,
    lastSecondary,
  } = useMemo(() => {
    const chartPoints = performanceChartPoints(plot)
    const modelPoints = chartPoints.filter((point) => point.pointKind === 'model')
    const observedTimestamps = chartPoints
      .filter(
        (point) =>
          point.primaryValue !== null ||
          point.secondaryValue !== null ||
          point.actualValue !== null,
      )
      .map((point) => point.timestamp)
    return {
      modelPoints,
      activityPoints: chartPoints.filter((point) => point.pointKind === 'actual'),
      observedSpan:
        observedTimestamps.length === 0
          ? null
          : ([
              Math.min(...observedTimestamps),
              Math.max(...observedTimestamps),
            ] as const),
      latestModel: plot.points.findLast(
        (point) => point.primaryDisplayValue !== null,
      ),
      lastPrimary: lastIndexWhere(modelPoints, (point) => point.primaryValue !== null),
      lastSecondary: lastIndexWhere(
        modelPoints,
        (point) => point.secondaryValue !== null,
      ),
    }
  }, [plot])
  const isEmpty = observedSpan === null
  const {
    pinned,
    setPinned,
    hovered,
    setHovered,
    togglePin,
    canvasRef,
    domain,
    ticks,
  } = usePinnedTimeAxis(observedSpan)
  const shortDate = (timestamp: number) =>
    formatDateTime(new Date(timestamp), { day: '2-digit', month: 'short' })
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
})

// Plots without comparable sessions stay visible as empty charts.
export function PerformancePlots({ plots }: { plots: PerformancePlot[] }) {
  return (
    <div className="tri-performance-plots grid gap-3">
      {plots.map((plot) => (
        <PerformancePlotCard key={plot.id} plot={plot} />
      ))}
    </div>
  )
}
