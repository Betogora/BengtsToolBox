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
import { useMemo, useState } from 'react'

import { EmptyState } from '@/apps/shared/components/EmptyState'
import { disciplineColors, disciplineFillColors } from '@/apps/triathlon-tracker/presentation'
import type { Discipline } from '@/apps/triathlon-tracker/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import {
  AxisBadge,
  ClickablePoint,
  DetailItem,
  LegendDot,
  LegendLine,
  PointDetail,
} from './chartParts'
import type { EfficiencyPlot, SelectedPoint } from './chartTypes'
import {
  activityOpacity,
  dimmedOpacity,
  endLabel,
  formatClock,
  gridProps,
  tickStyle,
  usePinnedTimeAxis,
  useValueFormatters,
} from './chartUtils'

function efficiencyAxisValue(id: Discipline, metersPerSecond: number) {
  return id === 'bike'
    ? metersPerSecond * 3.6
    : (id === 'swim' ? 100 : 1000) / metersPerSecond
}

export function EfficiencyCard({ plots }: { plots: EfficiencyPlot[] }) {
  const { formatDateTime, t } = useI18n()
  const populated = plots.filter((plot) => plot.points.length > 0)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  // Every plot stays selectable; without sessions it is simply empty.
  const plot =
    plots.find((candidate) => candidate.key === selectedKey) ??
    populated[0] ??
    plots[0]
  // Hovering re-renders the card; the series only follow the selected plot.
  const data = useMemo(
    () =>
      plot
        ? plot.points.map((point) => ({
            ...point,
            timestamp: Date.parse(point.localDate + 'T12:00:00Z'),
            normalizedValue: efficiencyAxisValue(
              plot.id,
              point.normalizedSpeedMetersPerSecond,
            ),
            trendValue: efficiencyAxisValue(plot.id, point.trendSpeedMetersPerSecond),
            actualValue: efficiencyAxisValue(plot.id, point.speedMetersPerSecond),
          }))
        : [],
    [plot],
  )
  type Datum = (typeof data)[number]
  const first = data.at(0)
  const latest = data.at(-1)
  const {
    pinned,
    setPinned,
    hovered,
    setHovered,
    togglePin,
    canvasRef,
    domain,
    ticks,
  } = usePinnedTimeAxis(
    first && latest ? [first.timestamp, latest.timestamp] : null,
  )
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
  const shortDate = (timestamp: number) =>
    formatDateTime(new Date(timestamp), { day: '2-digit', month: 'short' })
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
