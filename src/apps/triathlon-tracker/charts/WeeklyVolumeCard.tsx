import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type RectangleProps,
} from 'recharts'
import { memo, useState } from 'react'

import { EmptyState } from '@/apps/shared/components/EmptyState'
import {
  trainingColors,
  trainingFillColors,
  trainingIcons,
} from '@/apps/triathlon-tracker/presentation'
import type { TrainingDiscipline } from '@/apps/triathlon-tracker/types'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { evenlySpacedTicks, maxTicksForWidth, niceVolumeTicks } from './chartTicks'
import { AxisBadge, DetailItem, PointDetail } from './chartParts'
import type { WeeklyVolumeChartPoint } from './chartTypes'
import {
  canHover,
  dimmedOpacity,
  disciplineKey,
  gridProps,
  tickStyle,
  useElementWidth,
} from './chartUtils'

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
  discipline: TrainingDiscipline
  /** Icon only on phones; the name stays available to screen readers. */
  compact?: boolean
}) {
  const { t } = useI18n()
  const Icon = trainingIcons[discipline]
  return (
    // Baseline alignment keeps the name level with a larger value next to it;
    // the icon is nudged down to sit centered on the text instead of above it.
    <span className="inline-flex items-baseline gap-1.5">
      <Icon
        aria-hidden="true"
        className="relative top-0.5 size-3.5 shrink-0"
        style={{ color: trainingColors[discipline] }}
      />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>
        {t(disciplineKey(discipline))}
      </span>
    </span>
  )
}

export const WeeklyVolumeCard = memo(function WeeklyVolumeCard({
  points,
}: {
  points: WeeklyVolumeChartPoint[]
}) {
  const { formatDateTime, formatNumber, t } = useI18n()
  const [volumeKind, setVolumeKind] = useState<'duration' | 'distance'>(
    'duration',
  )
  const [focus, setFocus] = useState<TrainingDiscipline | null>(null)
  const [pinnedWeek, setPinnedWeek] = useState<string | null>(null)
  const [hoveredWeek, setHoveredWeek] = useState<string | null>(null)
  const [canvasRef, width] = useElementWidth<HTMLDivElement>()
  const hasVolume = points.some(
    (point) =>
      point.swimHours > 0 ||
      point.bikeHours > 0 ||
      point.runHours > 0 ||
      point.strengthHours > 0 ||
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
        { dataKey: 'strengthHours', discipline: 'strength' },
      ] as const)
    : ([
        { dataKey: 'swimKilometers', discipline: 'swim' },
        { dataKey: 'bikeKilometers', discipline: 'bike' },
        { dataKey: 'runKilometers', discipline: 'run' },
      ] as const)
  const series = allSeries.filter(
    ({ discipline }) => focus === null || focus === discipline,
  )
  // The legend reads top to bottom, so bars stack from its last entry upwards.
  const stack = [...series].reverse()
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
  const accent = focus ? trainingFillColors[focus] : 'var(--foreground)'
  const accentText = focus ? '#fff' : 'var(--background)'
  // Full sport colors; only a pinned week dims the others.
  const barOpacity = (weekStart: string) =>
    pinnedWeek && weekStart !== pinnedWeek ? dimmedOpacity : 1
  // The rounded top belongs to the highest visible segment of each week.
  const topKey = (point: WeeklyVolumeChartPoint) =>
    series.find(({ dataKey }) => point[dataKey] > 0)?.dataKey
  const bottomKey = (point: WeeklyVolumeChartPoint) =>
    stack.find(({ dataKey }) => point[dataKey] > 0)?.dataKey

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
                onValueChange={(value) => {
                  setVolumeKind(value as 'duration' | 'distance')
                  // Strength has no distance, so its focus would hide every bar.
                  if (value === 'distance' && focus === 'strength') setFocus(null)
                }}
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
                  // Recharts stacks bars in registration order, which a filter
                  // change would scramble; remounting keeps the JSX order.
                  key={`${volumeKind}-${focus ?? 'all'}`}
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
                  {stack.map(({ dataKey, discipline }) => (
                    <Bar
                      dataKey={dataKey}
                      maxBarSize={30}
                      isAnimationActive={false}
                      fill={trainingColors[discipline]}
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
                          <g
                            data-volume-segment={discipline}
                            data-volume-week={week}
                            data-volume-top={isTop || undefined}
                          >
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
})
