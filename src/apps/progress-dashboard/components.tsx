import {
  Beer,
  Check,
  Funnel,
  Martini,
  Minus,
  Plus,
  Trash2,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type {
  PlayerScore,
  ProgressDataset,
  ProgressDrinkIcon,
  ProgressEvent,
  ProgressEventIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import type { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import { formatNumber } from '@/apps/progress-dashboard/format'
import {
  defaultProgressDrinkIcon,
  getDrinkIconEventDelta,
} from '@/apps/progress-dashboard/logic'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DisclosureIndicator } from '@/components/ui/disclosure'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { TimePicker } from '@/components/ui/TimePicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getReadableTextColor } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { isValidLocalDate } from '@/lib/localDates'

const chartWidth = 1040
const chartHeight = 420
const chartPadding = {
  top: 38,
  right: 36,
  bottom: 96,
  left: 128,
}
const mobileSparklineWidth = 240
const mobileSparklineHeight = 56
const mobileSparklinePadding = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
}

const drinkValueOptions = [
  0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
]

const eventIconComponents: Record<ProgressEventIcon, LucideIcon> = {
  plus: Plus,
  minus: Minus,
  wine: Wine,
  beer: Beer,
  schnaps: Martini,
  funnel: Funnel,
}

type ProgressChartSegment = {
  time: number
  value: number
}

type ProgressChartSeries = {
  eventValues: {
    event: ProgressEvent
    time: number
    value: number
  }[]
  player: ProgressPlayer
  score: number
  segments: ProgressChartSegment[]
}

type ProgressChartMobileView = 'stand' | 'verlauf'

type ArchivePlayerSummary = {
  eventCount: number
  firstEventAt: string | null
  lastEventAt: string | null
  player: ProgressPlayer
  score: number
}

function getDrinkValueSelectValue(value: number) {
  const absoluteValue = Math.abs(value)
  const matchingValue = drinkValueOptions.find(
    (option) => Math.abs(option - absoluteValue) < 0.001,
  )

  return String(matchingValue ?? 1)
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString(locale)
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDateTimeLocalValue(value: string, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function getSortedEvents(events: ProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(left.createdAtClientIso) - Date.parse(right.createdAtClientIso) ||
      left.position - right.position,
  )
}

function getEventTable(events: ProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.createdAtClientIso) - Date.parse(left.createdAtClientIso) ||
      right.position - left.position,
  )
}

function formatDateRange(
  startValue: string | null | undefined,
  endValue: string | null | undefined,
  locale: string,
) {
  if (!startValue && !endValue) {
    return '-'
  }

  if (!startValue || startValue === endValue) {
    return formatDateTime(endValue ?? startValue, locale)
  }

  if (!endValue) {
    return formatDateTime(startValue, locale)
  }

  return `${formatDateTime(startValue, locale)} - ${formatDateTime(endValue, locale)}`
}

function getArchivePlayerName(event: ProgressEvent, position: number) {
  return event.playerName.trim() || `Spieler ${position}`
}

function getArchivePlayerColor(event: ProgressEvent) {
  return event.playerColor || '#0d8e90'
}

function getArchivePlayers(dataset: ProgressDataset) {
  const playersById = new Map<string, ProgressPlayer>()

  getSortedEvents(dataset.events).forEach((event) => {
    const existingPlayer = playersById.get(event.playerId)
    const position = existingPlayer?.position ?? playersById.size + 1

    playersById.set(event.playerId, {
      id: event.playerId,
      name: getArchivePlayerName(event, position),
      position,
      color: getArchivePlayerColor(event),
    })
  })

  return [...playersById.values()].sort(
    (left, right) => left.position - right.position,
  )
}

function getArchivePlayerSummaries(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
) {
  const summariesByPlayerId = new Map<string, ArchivePlayerSummary>(
    players.map((player) => [
      player.id,
      {
        eventCount: 0,
        firstEventAt: null,
        lastEventAt: null,
        player,
        score: 0,
      },
    ]),
  )

  getSortedEvents(dataset.events).forEach((event) => {
    const summary = summariesByPlayerId.get(event.playerId)

    if (!summary) {
      return
    }

    summary.eventCount += 1
    summary.firstEventAt = summary.firstEventAt ?? event.createdAtClientIso
    summary.lastEventAt = event.createdAtClientIso
    summary.score = Math.max(0, summary.score + event.valueDelta)
  })

  return [...summariesByPlayerId.values()].sort(
    (left, right) =>
      right.score - left.score ||
      left.player.position - right.player.position,
  )
}

function createStepPath(
  segments: ProgressChartSegment[],
  xScale: (time: number) => number,
  yScale: (value: number) => number,
) {
  return segments
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L'

      return `${command} ${xScale(point.time).toFixed(1)} ${yScale(point.value).toFixed(1)}`
    })
    .join(' ')
}

type ProgressChartLayout = {
  height: number
  maxTimeTicks?: number
  niceTicks?: boolean
  padding: typeof chartPadding
  width: number
}

const niceValueSteps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const niceTimeStepsMinutes = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440]

function getNiceValueAxis(maxValue: number) {
  const step = niceValueSteps.find((entry) => maxValue / entry <= 5) ?? 1000
  const max = Math.max(step, Math.ceil((maxValue * 1.05) / step) * step)

  return {
    max,
    ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step),
  }
}

function getNiceTimeTicks(min: number, max: number, maxTicks: number, locale: string) {
  const spanMinutes = (max - min) / 60_000
  const stepMinutes =
    niceTimeStepsMinutes.find((entry) => spanMinutes / entry <= maxTicks - 1) ?? 1440
  const step = stepMinutes * 60_000
  const first = new Date(min)
  first.setSeconds(0, 0)
  first.setMinutes(Math.ceil(first.getMinutes() / Math.min(stepMinutes, 60)) * Math.min(stepMinutes, 60))
  const ticks: { time: number; label: string }[] = []
  const withDay = spanMinutes > 20 * 60

  for (let time = first.getTime(); time <= max; time += step) {
    ticks.push({
      time,
      label: new Date(time).toLocaleString(locale, {
        ...(withDay ? { weekday: 'short' } : {}),
        hour: '2-digit',
        minute: '2-digit',
      }),
    })
  }

  return ticks
}

function getProgressChartData(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
  locale: string,
  layout: ProgressChartLayout = {
    height: chartHeight,
    padding: chartPadding,
    width: chartWidth,
  },
) {
  const { height, padding: chartPadding, width: chartWidth } = layout
  const sortedEvents = getSortedEvents(dataset.events)
  const validEventTimes = sortedEvents
    .map((event) => Date.parse(event.createdAtClientIso))
    .filter(Number.isFinite)
  const hasValidEvents = validEventTimes.length > 0
  const datasetStartTime = Date.parse(dataset.createdAtClientIso)
  const fallbackTime = Number.isFinite(datasetStartTime) ? datasetStartTime : 0
  const minTime = hasValidEvents ? Math.min(...validEventTimes) : fallbackTime
  const maxTime = hasValidEvents ? Math.max(...validEventTimes) : fallbackTime
  const xDomainMin = minTime === maxTime ? minTime - 60_000 : minTime
  const xDomainMax = minTime === maxTime ? maxTime + 60_000 : maxTime
  const eventsByPlayerId = new Map<string, ProgressEvent[]>()

  sortedEvents.forEach((event) => {
    const playerEvents = eventsByPlayerId.get(event.playerId)

    if (playerEvents) {
      playerEvents.push(event)
    } else {
      eventsByPlayerId.set(event.playerId, [event])
    }
  })

  const series: ProgressChartSeries[] = players.map((player) => {
    const playerEvents = eventsByPlayerId.get(player.id) ?? []
    let score = 0
    const eventValues: ProgressChartSeries['eventValues'] = []
    const segments: ProgressChartSegment[] = [
      { time: xDomainMin, value: 0 },
    ]

    playerEvents.forEach((event) => {
      const time = Date.parse(event.createdAtClientIso)

      if (!Number.isFinite(time)) {
        return
      }

      segments.push({ time, value: score })
      score = Math.max(0, score + event.valueDelta)
      segments.push({ time, value: score })
      eventValues.push({ event, time, value: score })
    })

    segments.push({ time: xDomainMax, value: score })

    return {
      eventValues,
      player,
      score,
      segments,
    }
  })
  const maxValue = Math.max(
    1,
    ...series.map((entry) => entry.score),
    ...series.flatMap((entry) =>
      entry.eventValues.map((eventValue) => eventValue.value),
    ),
  )
  const niceValueAxis = layout.niceTicks ? getNiceValueAxis(maxValue) : null
  const yDomainMax = niceValueAxis?.max ?? Math.max(1, Math.ceil(maxValue * 1.12))
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = height - chartPadding.top - chartPadding.bottom
  const plotCenterX = chartPadding.left + plotWidth / 2
  const plotCenterY = chartPadding.top + plotHeight / 2
  const xScale = (time: number) =>
    chartPadding.left +
    ((time - xDomainMin) / (xDomainMax - xDomainMin || 1)) * plotWidth
  const yScale = (value: number) =>
    chartPadding.top + plotHeight - (value / yDomainMax) * plotHeight
  const yTicks =
    niceValueAxis?.ticks ??
    Array.from({ length: 5 }, (_, index) => (yDomainMax / 4) * index)
  const xTicks = layout.niceTicks
    ? getNiceTimeTicks(xDomainMin, xDomainMax, layout.maxTimeTicks ?? 5, locale)
    : Array.from({ length: 5 }, (_, index) => {
    const time = xDomainMin + ((xDomainMax - xDomainMin) / 4) * index

    return {
      time,
      label: new Date(time).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })
  const chartSeries = series.flatMap(({ player, segments }) => {
    if (segments.length < 2) {
      return []
    }

    return [
      {
        player,
        path: createStepPath(segments, xScale, yScale),
      },
    ]
  })
  const eventPoints = series.flatMap((entry) =>
    entry.eventValues.map((eventValue) => ({
      event: eventValue.event,
      x: xScale(eventValue.time),
      y: yScale(eventValue.value),
    })),
  )
  const rankedSeries = [...series].sort(
    (left, right) =>
      right.score - left.score ||
      left.player.position - right.player.position,
  )
  const rankedScores: PlayerScore[] = rankedSeries.map(({ player, score }) => ({
    player,
    score,
  }))

  return {
    chartSeries,
    eventPoints,
    hasValidEvents,
    maxValue,
    plotCenterX,
    plotCenterY,
    rankedScores,
    rankedSeries,
    xDomainMax,
    xDomainMin,
    xScale,
    xTicks,
    yScale,
    yTicks,
    yDomainMax,
  }
}

function getPlayerTimelinePath(
  segments: ProgressChartSegment[],
  chartData: ReturnType<typeof getProgressChartData>,
) {
  const plotWidth =
    mobileSparklineWidth - mobileSparklinePadding.left - mobileSparklinePadding.right
  const plotHeight =
    mobileSparklineHeight - mobileSparklinePadding.top - mobileSparklinePadding.bottom
  const xScale = (time: number) =>
    mobileSparklinePadding.left +
    ((time - chartData.xDomainMin) /
      (chartData.xDomainMax - chartData.xDomainMin || 1)) *
      plotWidth
  const yScale = (value: number) =>
    mobileSparklinePadding.top +
    plotHeight -
    (value / chartData.yDomainMax) * plotHeight

  return createStepPath(segments, xScale, yScale)
}

function PlayerTimeline({
  ariaLabel,
  chartData,
  className,
  player,
  segments,
}: {
  ariaLabel: string
  chartData: ReturnType<typeof getProgressChartData>
  className?: string
  player: ProgressPlayer
  segments: ProgressChartSegment[]
}) {
  const path = getPlayerTimelinePath(segments, chartData)

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${mobileSparklineWidth} ${mobileSparklineHeight}`}
      className={cn('block w-full overflow-visible', className)}
      preserveAspectRatio="none"
    >
      <rect
        width={mobileSparklineWidth}
        height={mobileSparklineHeight}
        fill="var(--card)"
        rx="6"
      />
      <line
        x1={mobileSparklinePadding.left}
        x2={mobileSparklineWidth - mobileSparklinePadding.right}
        y1={mobileSparklineHeight - mobileSparklinePadding.bottom}
        y2={mobileSparklineHeight - mobileSparklinePadding.bottom}
        stroke="var(--muted)"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={path}
        fill="none"
        stroke={player.color}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MobileScoreBars({
  maxValue,
  scores,
  unit,
}: {
  maxValue: number
  scores: PlayerScore[]
  unit: string
}) {
  const { t } = useI18n()

  if (scores.length === 0) {
    return (
      <EmptyState className="p-4">
        {t('progress.emptyPlayers')}
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-2">
      {scores.map(({ player, score }, index) => {
        const percentage = score > 0 ? Math.max(4, (score / maxValue) * 100) : 0

        return (
          <div
            key={player.id}
            className="rounded-md border bg-background p-3"
            style={{ backgroundColor: `color-mix(in srgb, ${player.color} 12%, var(--card))` }}
            aria-label={`${player.name}: ${formatNumber(score)} ${unit}`.trim()}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="type-action w-6 shrink-0 tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                <span className="type-action min-w-0 truncate">
                  {player.name}
                </span>
              </div>
              <div className="shrink-0 text-right">
                <div className="type-metric-sm">
                  {formatNumber(score)}
                </div>
                {unit.trim() && (
                  <div className="type-caption max-w-24 truncate text-muted-foreground">
                    {unit}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  backgroundColor: player.color,
                  width: `${percentage}%`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MobilePlayerTimelines({
  chartData,
  unit,
}: {
  chartData: ReturnType<typeof getProgressChartData>
  unit: string
}) {
  const { t } = useI18n()

  if (chartData.rankedSeries.length === 0) {
    return (
      <EmptyState className="p-4">
        {t('progress.emptyPlayers')}
      </EmptyState>
    )
  }

  return (
    <div className="grid gap-2">
      {chartData.rankedSeries.map(({ player, score, segments }) => (
        <div
          key={player.id}
          className="rounded-md border bg-background p-3"
          style={{ backgroundColor: `color-mix(in srgb, ${player.color} 12%, var(--card))` }}
        >
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              <span className="type-action min-w-0 truncate">
                {player.name}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <div className="type-action tabular-nums">
                {formatNumber(score)}
              </div>
              {unit.trim() && (
                <div className="type-caption max-w-24 truncate text-muted-foreground">
                  {unit}
                </div>
              )}
            </div>
          </div>
          <PlayerTimeline
            ariaLabel={t('progress.timelineAria', { name: player.name })}
            chartData={chartData}
            className="mt-3 h-14"
            player={player}
            segments={segments}
          />
        </div>
      ))}
    </div>
  )
}

function MobileProgressChart({
  chartData,
  dataset,
  defaultView = 'stand',
}: {
  chartData: ReturnType<typeof getProgressChartData>
  defaultView?: ProgressChartMobileView
  dataset: ProgressDataset
}) {
  const { t } = useI18n()

  return (
    <div className="rounded-lg border bg-card p-3 md:hidden">
      <Tabs defaultValue={defaultView} className="gap-3">
        <TabsList className="grid h-10 w-full grid-cols-2 border bg-muted/70">
          <TabsTrigger value="stand">{t('progress.tab.score')}</TabsTrigger>
          <TabsTrigger value="verlauf">{t('progress.tab.history')}</TabsTrigger>
        </TabsList>
        <TabsContent value="stand">
          <MobileScoreBars
            maxValue={chartData.maxValue}
            scores={chartData.rankedScores}
            unit={dataset.unit}
          />
        </TabsContent>
        <TabsContent value="verlauf">
          <MobilePlayerTimelines chartData={chartData} unit={dataset.unit} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ProgressChart({
  dataset,
  emptyMessage,
  mobileDefaultView = 'stand',
  players,
}: {
  dataset: ProgressDataset
  emptyMessage?: string
  mobileDefaultView?: ProgressChartMobileView
  players: ProgressPlayer[]
}) {
  const { t, locale } = useI18n()
  const chartData = useMemo(
    () => getProgressChartData(dataset, players, locale),
    [dataset, players, locale],
  )
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null)
  const [pinnedPlayerId, setPinnedPlayerId] = useState<string | null>(null)
  const playerIds = useMemo(
    () => new Set(players.map((player) => player.id)),
    [players],
  )
  const activePlayerId =
    (hoveredPlayerId && playerIds.has(hoveredPlayerId) ? hoveredPlayerId : null) ??
    (pinnedPlayerId && playerIds.has(pinnedPlayerId) ? pinnedPlayerId : null)

  if (!chartData.hasValidEvents) {
    return (
      <EmptyState className="flex aspect-[2.45/1] min-h-0 items-center justify-center bg-card p-4">
        {emptyMessage ?? t('progress.emptyEvents')}
      </EmptyState>
    )
  }

  const orderedChartSeries = activePlayerId
    ? [
        ...chartData.chartSeries.filter(({ player }) => player.id !== activePlayerId),
        ...chartData.chartSeries.filter(({ player }) => player.id === activePlayerId),
      ]
    : chartData.chartSeries
  const orderedEventPoints = activePlayerId
    ? [
        ...chartData.eventPoints.filter(
          (point) => point.event.playerId !== activePlayerId,
        ),
        ...chartData.eventPoints.filter(
          (point) => point.event.playerId === activePlayerId,
        ),
      ]
    : chartData.eventPoints
  const showHoveredPlayer = (playerId: string) => {
    setHoveredPlayerId(playerId)
  }
  const hideHoveredPlayer = (playerId: string) => {
    setHoveredPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : currentPlayerId,
    )
  }
  const togglePinnedPlayer = (playerId: string) => {
    setPinnedPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : playerId,
    )
  }
  const clearHighlightedPlayer = () => {
    setHoveredPlayerId(null)
    setPinnedPlayerId(null)
  }

  return (
    <>
      <MobileProgressChart
        chartData={chartData}
        defaultView={mobileDefaultView}
        dataset={dataset}
      />
        <div className="hidden overflow-hidden rounded-lg border bg-card p-3 md:block">
          <svg
            role="group"
            aria-label={dataset.chartTitle}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="block h-auto w-full"
            onClick={clearHighlightedPlayer}
            onPointerLeave={() => setHoveredPlayerId(null)}
          >
            <rect width={chartWidth} height={chartHeight} fill="var(--card)" rx="8" />
        {chartData.yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={chartData.yScale(tick)}
              y2={chartData.yScale(tick)}
              stroke="var(--border)"
            />
            <text
              x={chartPadding.left - 14}
              y={chartData.yScale(tick) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--muted-foreground)"
            >
              {formatNumber(tick)}
            </text>
          </g>
        ))}
        {chartData.xTicks.map((tick, index) => (
          <g
            key={`x-${tick.time}`}
          >
            <line
              x1={chartData.xScale(tick.time)}
              x2={chartData.xScale(tick.time)}
              y1={chartPadding.top}
              y2={chartHeight - chartPadding.bottom}
              stroke="var(--muted)"
            />
            <text
              x={chartData.xScale(tick.time)}
              y={chartHeight - 60}
              textAnchor={index === 0 ? 'start' : index === chartData.xTicks.length - 1 ? 'end' : 'middle'}
              fontSize="12"
              fill="var(--muted-foreground)"
            >
              {tick.label}
            </text>
          </g>
        ))}
        <line
          x1={chartPadding.left}
          x2={chartPadding.left}
          y1={chartPadding.top}
          y2={chartHeight - chartPadding.bottom}
          stroke="var(--brand-surface)"
        />
        <line
          x1={chartPadding.left}
          x2={chartWidth - chartPadding.right}
          y1={chartHeight - chartPadding.bottom}
          y2={chartHeight - chartPadding.bottom}
          stroke="var(--brand-surface)"
        />
        <text
          x={24}
          y={chartData.plotCenterY}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(-90 24 ${chartData.plotCenterY})`}
          fontSize="17"
          fill="var(--foreground)"
        >
          {dataset.unit}
        </text>
        <text
          x={chartData.plotCenterX}
          y={chartHeight - 5}
          textAnchor="middle"
          fontSize="17"
          fill="var(--foreground)"
        >
          Zeit
        </text>
        {orderedChartSeries.map(({ player, path }) => {
          const isActive = activePlayerId === player.id
          const isDimmed = activePlayerId !== null && !isActive

          return (
            <g key={player.id}>
              {isActive && (
                <path
                  d={path}
                  fill="none"
                  opacity="0.95"
                  pointerEvents="none"
                  stroke="var(--card)"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth="12"
                />
              )}
              <path
                d={path}
                fill="none"
                opacity={isDimmed ? '0.22' : '1'}
                pointerEvents="none"
                stroke={player.color}
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={isActive ? '6' : '4'}
                style={{
                  filter: isActive
                    ? 'drop-shadow(0 3px 5px rgb(15 23 42 / 0.24))'
                    : undefined,
                  transition:
                    'opacity 150ms ease, stroke-width 150ms ease, filter 150ms ease',
                }}
              />
            </g>
          )
        })}
        {orderedChartSeries.map(({ player, path }) => (
          <path
            key={`${player.id}-hit-area`}
            d={path}
            role="button"
            aria-label={`${player.name} Zeitreihe hervorheben`}
            aria-pressed={pinnedPlayerId === player.id}
            className="cursor-pointer outline-none"
            fill="none"
            focusable="true"
            opacity="0"
            pointerEvents="stroke"
            stroke="transparent"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeWidth="18"
            tabIndex={0}
            onBlur={() => hideHoveredPlayer(player.id)}
            onClick={(event) => {
              event.stopPropagation()
              togglePinnedPlayer(player.id)
            }}
            onFocus={() => showHoveredPlayer(player.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                togglePinnedPlayer(player.id)
              }
            }}
            onPointerEnter={() => showHoveredPlayer(player.id)}
            onPointerLeave={() => hideHoveredPlayer(player.id)}
          />
        ))}
        {orderedEventPoints.map((point) => {
          const Icon = eventIconComponents[point.event.icon]
          const isActive = activePlayerId === point.event.playerId
          const isDimmed = activePlayerId !== null && !isActive
          const markerIconColor = getReadableTextColor(point.event.playerColor)

          return (
            <g
              key={point.event.id}
              className="cursor-pointer"
              opacity={isDimmed ? '0.28' : '1'}
              style={{
                filter: isActive
                  ? 'drop-shadow(0 3px 5px rgb(15 23 42 / 0.2))'
                  : undefined,
                transition: 'opacity 150ms ease, filter 150ms ease',
              }}
              onClick={(event) => {
                event.stopPropagation()
                togglePinnedPlayer(point.event.playerId)
              }}
              onPointerEnter={() => showHoveredPlayer(point.event.playerId)}
              onPointerLeave={() => hideHoveredPlayer(point.event.playerId)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? '13' : '11'}
                fill={point.event.playerColor}
              />
              <Icon
                x={point.x - 6.5}
                y={point.y - 6.5}
                width="13"
                height="13"
                color={markerIconColor}
                strokeWidth="2.4"
              />
            </g>
          )
        })}
          </svg>
        </div>
    </>
  )
}

function getFittedChartPadding(width: number) {
  return { top: 28, right: 12, bottom: 32, left: width >= 560 ? 44 : 32 }
}

// Zeichnet in echten Pixeln der Containergröße, damit Schrift, Linien und Marker überall gleich groß bleiben.
// Die Höhe kommt aus der Klasse des Containers.
export function DashboardProgressChart({
  className,
  dataset,
  players,
}: {
  className?: string
  dataset: ProgressDataset
  players: ProgressPlayer[]
}) {
  const { t, locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [{ height, width }, setSize] = useState({ height: 0, width: 0 })
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null)
  const [pinnedPlayerId, setPinnedPlayerId] = useState<string | null>(null)

  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const update = () => {
      const bounds = element.getBoundingClientRect()
      const next = { height: Math.round(bounds.height), width: Math.round(bounds.width) }
      setSize((current) =>
        current.height === next.height && current.width === next.width ? current : next,
      )
    }
    update()
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    })
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  const isNarrow = width < 560
  const chartData = useMemo(
    () =>
      getProgressChartData(dataset, players, locale, {
        height: Math.max(height, 1),
        maxTimeTicks: isNarrow ? 5 : 8,
        niceTicks: true,
        padding: getFittedChartPadding(width),
        width: Math.max(width, 1),
      }),
    [dataset, players, locale, height, isNarrow, width],
  )
  const padding = getFittedChartPadding(width)
  const playerIds = new Set(players.map((player) => player.id))
  const activePlayerId =
    (hoveredPlayerId && playerIds.has(hoveredPlayerId) ? hoveredPlayerId : null) ??
    (pinnedPlayerId && playerIds.has(pinnedPlayerId) ? pinnedPlayerId : null)
  const orderedChartSeries = activePlayerId
    ? [
        ...chartData.chartSeries.filter(({ player }) => player.id !== activePlayerId),
        ...chartData.chartSeries.filter(({ player }) => player.id === activePlayerId),
      ]
    : chartData.chartSeries
  const orderedEventPoints = activePlayerId
    ? [
        ...chartData.eventPoints.filter((point) => point.event.playerId !== activePlayerId),
        ...chartData.eventPoints.filter((point) => point.event.playerId === activePlayerId),
      ]
    : chartData.eventPoints
  const markerRadius = isNarrow ? 7 : 10
  const iconSize = isNarrow ? 9 : 12
  const lineWidth = isNarrow ? 2.5 : 3
  const togglePinnedPlayer = (playerId: string) =>
    setPinnedPlayerId((current) => (current === playerId ? null : playerId))
  const hideHoveredPlayer = (playerId: string) =>
    setHoveredPlayerId((current) => (current === playerId ? null : current))
  const plotBottom = height - padding.bottom

  // Das SVG liegt absolut, damit seine Größe nicht auf den gemessenen Container zurückwirkt.
  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      {width > 0 && !chartData.hasValidEvents && (
        <EmptyState className="absolute inset-0 flex items-center justify-center p-4">
          {t('progress.emptyEvents')}
        </EmptyState>
      )}
      {width > 0 && chartData.hasValidEvents && (
        <svg
          role="group"
          aria-label={dataset.chartTitle}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="absolute inset-0 block overflow-visible"
          onClick={() => {
            setHoveredPlayerId(null)
            setPinnedPlayerId(null)
          }}
          onPointerLeave={() => setHoveredPlayerId(null)}
        >
          <text
            x={0}
            y={12}
            className="type-caption"
            fill="var(--muted-foreground)"
          >
            {dataset.unit}
          </text>
          {chartData.yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={chartData.yScale(tick)}
                y2={chartData.yScale(tick)}
                stroke="var(--border)"
                strokeDasharray={tick === 0 ? undefined : '3 4'}
              />
              <text
                x={padding.left - 8}
                y={chartData.yScale(tick)}
                dominantBaseline="middle"
                textAnchor="end"
                className="type-caption tabular-nums"
                fill="var(--muted-foreground)"
              >
                {formatNumber(tick)}
              </text>
            </g>
          ))}
          {chartData.xTicks.map((tick) => (
            <g key={`x-${tick.time}`}>
              <line
                x1={chartData.xScale(tick.time)}
                x2={chartData.xScale(tick.time)}
                y1={plotBottom}
                y2={plotBottom + 4}
                stroke="var(--border)"
              />
              <text
                x={chartData.xScale(tick.time)}
                y={plotBottom + 20}
                textAnchor="middle"
                className="type-caption tabular-nums"
                fill="var(--muted-foreground)"
              >
                {tick.label}
              </text>
            </g>
          ))}
          {orderedChartSeries.map(({ player, path }) => {
            const isActive = activePlayerId === player.id
            const isDimmed = activePlayerId !== null && !isActive

            return (
              <g key={player.id}>
                {isActive && (
                  <path
                    d={path}
                    fill="none"
                    pointerEvents="none"
                    stroke="var(--card)"
                    strokeLinejoin="round"
                    strokeWidth={lineWidth + 5}
                  />
                )}
                <path
                  d={path}
                  fill="none"
                  opacity={isDimmed ? 0.22 : 1}
                  pointerEvents="none"
                  stroke={player.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={isActive ? lineWidth + 1.5 : lineWidth}
                  style={{ transition: 'opacity 150ms ease, stroke-width 150ms ease' }}
                />
              </g>
            )
          })}
          {orderedChartSeries.map(({ player, path }) => (
            <path
              key={`${player.id}-hit-area`}
              d={path}
              role="button"
              aria-label={`${player.name} Zeitreihe hervorheben`}
              aria-pressed={pinnedPlayerId === player.id}
              className="cursor-pointer outline-none"
              fill="none"
              focusable="true"
              opacity="0"
              pointerEvents="stroke"
              stroke="transparent"
              strokeWidth="18"
              tabIndex={0}
              onBlur={() => hideHoveredPlayer(player.id)}
              onClick={(event) => {
                event.stopPropagation()
                togglePinnedPlayer(player.id)
              }}
              onFocus={() => setHoveredPlayerId(player.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  togglePinnedPlayer(player.id)
                }
              }}
              onPointerEnter={() => setHoveredPlayerId(player.id)}
              onPointerLeave={() => hideHoveredPlayer(player.id)}
            />
          ))}
          {orderedEventPoints.map((point) => {
            const Icon = eventIconComponents[point.event.icon]
            const isActive = activePlayerId === point.event.playerId
            const isDimmed = activePlayerId !== null && !isActive
            const radius = isActive ? markerRadius + 2 : markerRadius

            return (
              <g
                key={point.event.id}
                className="cursor-pointer"
                opacity={isDimmed ? 0.28 : 1}
                onClick={(event) => {
                  event.stopPropagation()
                  togglePinnedPlayer(point.event.playerId)
                }}
                onPointerEnter={() => setHoveredPlayerId(point.event.playerId)}
                onPointerLeave={() => hideHoveredPlayer(point.event.playerId)}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={radius}
                  fill={point.event.playerColor}
                  stroke="var(--card)"
                  strokeWidth="2"
                />
                <Icon
                  x={point.x - iconSize / 2}
                  y={point.y - iconSize / 2}
                  width={iconSize}
                  height={iconSize}
                  color={getReadableTextColor(point.event.playerColor)}
                  strokeWidth="2.4"
                />
              </g>
            )
          })}
        </svg>
      )}
    </div>
  )
}

const entryAmountPresets = [0.25, 0.5, 1, 2, 3]

// Ein Dialog für alle Eintragungen: wer, was, wie viel.
export function ProgressEntryDialog({
  drinkIcons,
  onOpenChange,
  onSave,
  open,
  players,
}: {
  drinkIcons: { id: ProgressDrinkIcon; label: string }[]
  onOpenChange: (open: boolean) => void
  onSave: (player: ProgressPlayer, icon: ProgressDrinkIcon, amount: number) => void
  open: boolean
  players: ProgressPlayer[]
}) {
  const { t } = useI18n()
  // Bewusst ohne Vorauswahl, damit kein Eintrag beim falschen Spieler landet.
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [icon, setIcon] = useState<ProgressDrinkIcon>(defaultProgressDrinkIcon)
  const [amount, setAmount] = useState(getDrinkIconEventDelta(defaultProgressDrinkIcon))
  const player = players.find((entry) => entry.id === playerId)
  const drinkLabel = drinkIcons.find((entry) => entry.id === icon)?.label ?? ''
  const selectPlayer = (next: ProgressPlayer) => {
    setPlayerId(next.id)
    const nextIcon = next.defaultEventIcon ?? defaultProgressDrinkIcon
    setIcon(nextIcon)
    setAmount(getDrinkIconEventDelta(nextIcon))
  }
  const presetValue = entryAmountPresets.includes(amount) ? String(amount) : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-5 overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle>{t('progress.entry.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('progress.entry.description')}
          </DialogDescription>
        </DialogHeader>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.player')}</legend>
          <div role="radiogroup" aria-label={t('progress.entry.player')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {players.map((entry) => {
              const isSelected = entry.id === playerId

              return (
                <button
                  key={entry.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={cn(
                    'type-action flex min-h-11 min-w-0 items-center gap-2 rounded-md border bg-card px-3 text-left transition-colors',
                    !isSelected && 'hover:bg-muted',
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: `color-mix(in srgb, ${entry.color} 10%, var(--card))`,
                          borderColor: entry.color,
                          boxShadow: `inset 0 0 0 1px ${entry.color}`,
                        }
                      : undefined
                  }
                  onClick={() => selectPlayer(entry)}
                >
                  <span
                    className="grid size-4 shrink-0 place-items-center rounded-full"
                    style={{ backgroundColor: entry.color, color: getReadableTextColor(entry.color) }}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 truncate">{entry.name}</span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.drink')}</legend>
          <SegmentedControl
            aria-label={t('progress.entry.drink')}
            style={{ width: '100%' }}
            variant="icon-tabs"
            value={icon}
            options={drinkIcons.map((entry) => ({
              value: entry.id,
              label: entry.label,
              icon: eventIconComponents[entry.id],
            }))}
            onValueChange={(value) => {
              const nextIcon = value as ProgressDrinkIcon
              setIcon(nextIcon)
              setAmount(getDrinkIconEventDelta(nextIcon))
            }}
          />
        </fieldset>

        <fieldset className="grid min-w-0 gap-2">
          <legend className="type-label mb-2 text-muted-foreground">{t('progress.entry.amount')}</legend>
          <div className="grid gap-3 min-[400px]:grid-cols-[minmax(0,1fr)_auto] min-[400px]:items-center">
            <SegmentedControl
              aria-label={t('progress.entry.amount')}
              style={{ width: '100%' }}
              value={presetValue}
              options={entryAmountPresets.map((preset) => ({
                value: String(preset),
                label: preset === 0.25 ? '¼' : preset === 0.5 ? '½' : String(preset),
              }))}
              onValueChange={(value) => setAmount(Number(value))}
            />
            <div className="flex items-center justify-center gap-1">
              <Button
                aria-label={t('progress.entry.less')}
                disabled={amount <= 0.25}
                size="icon"
                variant="outline"
                onClick={() => setAmount((value) => Math.max(0.25, value - (value > 1 ? 1 : 0.25)))}
              >
                <Minus />
              </Button>
              <span className="type-metric-sm w-12 text-center tabular-nums" aria-live="polite">
                {formatNumber(amount)}
              </span>
              <Button
                aria-label={t('progress.entry.more')}
                size="icon"
                variant="outline"
                onClick={() => setAmount((value) => value + (value >= 1 ? 1 : 0.25))}
              >
                <Plus />
              </Button>
            </div>
          </div>
        </fieldset>

        <Button
          className="h-11 w-full"
          disabled={!player}
          onClick={() => {
            if (!player) return
            onSave(player, icon, amount)
            onOpenChange(false)
          }}
        >
          {player ? (
            <>
              <span
                className="size-2.5 shrink-0 rounded-full ring-2 ring-primary-foreground/80"
                style={{ backgroundColor: player.color }}
              />
              <span className="min-w-0 truncate">
                {t('progress.entry.save', {
                  amount: formatNumber(amount),
                  drink: drinkLabel,
                  name: player.name,
                })}
              </span>
            </>
          ) : (
            t('progress.entry.choosePlayer')
          )}
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// Spieler verwalten: Name, Farbe, Löschen, Hinzufügen und Einheit.
export function PlayerSetupList({
  onAdd,
  onColorChange,
  onNameChange,
  onRemove,
  playerScores,
  unitInput,
}: {
  onAdd: () => void
  onColorChange: (playerId: string, color: string) => void
  onNameChange: (playerId: string, name: string) => void
  onRemove: (playerId: string) => void
  playerScores: PlayerScore[]
  unitInput: ReactNode
}) {
  const { t } = useI18n()

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2 md:grid-cols-2">
        {playerScores.map(({ player }) => (
          <li
            key={player.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2 pl-3"
            style={{ backgroundColor: `color-mix(in srgb, ${player.color} 10%, var(--card))` }}
          >
            <ColorPicker
              ariaLabel={t('progress.chooseColorAria', { name: player.name })}
              value={player.color}
              onValueCommit={(color) => onColorChange(player.id, color)}
            />
            <InlineTextEdit
              ariaLabel={t('progress.playerNameAria', { name: player.name })}
              className="type-action py-1"
              fallback={`Person ${player.position}`}
              inputClassName="type-action h-11"
              value={player.name}
              onSave={(value) => onNameChange(player.id, value)}
            />
            <ConfirmButton
              mode="popover"
              title={t('progress.playerDeleteTitle')}
              description={t('progress.playerDeleteDescription', { name: player.name })}
              onConfirm={() => onRemove(player.id)}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11 text-muted-foreground hover:text-destructive"
                  aria-label={t('shared.playerCard.removeAria', { name: player.name })}
                >
                  <Trash2 />
                </Button>
              }
            />
          </li>
        ))}
      </ul>
      <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,18rem)] sm:items-center sm:justify-between">
        <Button variant="outline" className="h-11" onClick={onAdd}>
          <Plus />
          {t('progress.addPlayer')}
        </Button>
        {unitInput}
      </div>
    </div>
  )
}

function ProgressEventDateTime({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState(toDateTimeLocalValue(value))
  const [previousValue, setPreviousValue] = useState(value)
  if (previousValue !== value) {
    setPreviousValue(value)
    setDraft(toDateTimeLocalValue(value))
  }
  const date = draft.split('T')[0]
  const time = draft.split('T')[1] ?? ''
  const update = (nextDate: string, nextTime: string) => {
    const next = `${nextDate}T${nextTime}`
    setDraft(next)
    if (isValidLocalDate(nextDate) && /^([01]\d|2[0-3]):[0-5]\d$/.test(nextTime)) {
      onValueChange(fromDateTimeLocalValue(next, value))
    }
  }

  return (
    <div className="grid min-w-0 gap-2 min-[24rem]:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:min-w-[16.5rem]">
      <DatePicker
        required
        label={t('ui.picker.date')}
        value={date}
        onValueChange={(next) => update(next, time)}
      />
      <TimePicker
        required
        label={t('ui.picker.time')}
        value={time}
        onValueChange={(next) => update(date, next)}
      />
    </div>
  )
}

export function EventTable({
  dataset,
  icons,
  onDeleteEvent,
  onUpdateEvent,
}: {
  dataset: ProgressDataset
  icons: ReturnType<typeof useProgressDashboard>['progressEventIcons']
  onDeleteEvent: (eventId: string) => void
  onUpdateEvent: (
    eventId: string,
    partialValue: Partial<
      Pick<ProgressEvent, 'createdAtClientIso' | 'icon' | 'valueDelta'>
    >,
  ) => void
}) {
  const { t } = useI18n()
  const events = getEventTable(dataset.events)

  if (events.length === 0) {
    return (
      <EmptyState>
        {t('progress.emptyEvents')}
      </EmptyState>
    )
  }

  const renderDateInput = (event: ProgressEvent) => (
    <ProgressEventDateTime
      value={event.createdAtClientIso}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          createdAtClientIso: value,
        })
      }
    />
  )
  const renderPlayerLabel = (event: ProgressEvent) => (
    <div className="type-label flex min-w-0 items-center gap-2">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: event.playerColor }}
      />
      <span className="min-w-0 break-words">{event.playerName}</span>
    </div>
  )
  const renderValueControls = (event: ProgressEvent) => (
    <div className="flex gap-2">
      <Select
        value={event.valueDelta < 0 ? '-' : '+'}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (value === '-' ? -1 : 1) * Math.abs(event.valueDelta || 1),
          })
        }
      >
        <SelectTrigger
          aria-label={`${t('progress.eventSign')}: ${event.playerName}`}
          className="w-20"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="+">+</SelectItem>
          <SelectItem value="-">-</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={getDrinkValueSelectValue(event.valueDelta)}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (event.valueDelta < 0 ? -1 : 1) * Number(value),
          })
        }
      >
        <SelectTrigger
          aria-label={`${t('progress.eventValue')}: ${event.playerName}`}
          className="w-28"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {drinkValueOptions.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {formatNumber(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  const renderIconSelect = (event: ProgressEvent) => (
    <Select
      value={event.icon}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          icon: value as ProgressEventIcon,
        })
      }
    >
      <SelectTrigger aria-label={`Icon: ${event.playerName}`} className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {icons.map((icon) => (
          <SelectItem key={icon.id} value={icon.id}>
            <span className="flex items-center gap-2">
              {(() => {
                const Icon = eventIconComponents[icon.id]

                return <Icon className="size-4" />
              })()}
              {icon.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const renderDeleteButton = (event: ProgressEvent) => (
    <ConfirmButton
      mode="popover"
      title={t('common.event.delete')}
      description={t('common.event.deleteDescription')}
      onConfirm={() => onDeleteEvent(event.id)}
      trigger={
        <Button variant="destructive" size="icon" aria-label={t('common.event.delete')}>
          <Trash2 className="size-4" />
        </Button>
      }
    />
  )

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {events.map((event) => (
          <div
            key={event.id}
            className="type-ui rounded-md border bg-card p-3"
            style={{ backgroundColor: `color-mix(in srgb, ${event.playerColor} 12%, var(--card))` }}
          >
            <div className="flex items-start justify-between gap-3">
              {renderPlayerLabel(event)}
              {renderDeleteButton(event)}
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                {renderDateInput(event)}
              </div>
              <div className="grid gap-3 min-[26rem]:grid-cols-2">
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    {t('progress.eventValue')}
                  </div>
                  {renderValueControls(event)}
                </div>
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    Icon
                  </div>
                  {renderIconSelect(event)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Table className="min-w-[760px]" containerClassName="hidden md:block">
        <TableHeader>
            <TableHead>{t('progress.time')}</TableHead>
            <TableHead>{t('common.player')}</TableHead>
            <TableHead>{t('progress.eventValue')}</TableHead>
            <TableHead>Icon</TableHead>
            <TableHead className="text-right">{t('decisionWheel.action')}</TableHead>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                {renderDateInput(event)}
              </TableCell>
              <TableCell>
                <div className="type-label flex items-center gap-2">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: event.playerColor }}
                  />
                  {event.playerName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Select
                    value={event.valueDelta < 0 ? '-' : '+'}
                    onValueChange={(value) =>
                      onUpdateEvent(event.id, {
                        valueDelta:
                          (value === '-' ? -1 : 1) * Math.abs(event.valueDelta || 1),
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`${t('progress.eventSign')}: ${event.playerName}`}
                      className="w-20"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+">+</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={getDrinkValueSelectValue(event.valueDelta)}
                    onValueChange={(value) =>
                      onUpdateEvent(event.id, {
                        valueDelta:
                          (event.valueDelta < 0 ? -1 : 1) * Number(value),
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`${t('progress.eventValue')}: ${event.playerName}`}
                      className="w-28"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {drinkValueOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {formatNumber(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={event.icon}
                  onValueChange={(value) =>
                    onUpdateEvent(event.id, {
                      icon: value as ProgressEventIcon,
                    })
                  }
                >
                  <SelectTrigger aria-label={`Icon: ${event.playerName}`} className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {icons.map((icon) => (
                      <SelectItem key={icon.id} value={icon.id}>
                        <span className="flex items-center gap-2">
                          {(() => {
                            const Icon = eventIconComponents[icon.id]

                            return <Icon className="size-4" />
                          })()}
                          {icon.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <ConfirmButton
                  mode="popover"
                  title={t('common.event.delete')}
                  description={t('common.event.deleteDescription')}
                  onConfirm={() => onDeleteEvent(event.id)}
                  trigger={
                    <Button variant="destructive" size="icon" aria-label={t('common.event.delete')}>
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}

export function ArchiveDatasetCard({
  dataset,
  onDelete,
  onRename,
}: {
  dataset: ProgressDataset
  onDelete: (datasetId: string) => void
  onRename: (datasetId: string, name: string) => void
}) {
  const { t, locale } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const eventCount = dataset.events.length

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-1 py-2 pr-2 pl-3">
        <div className="min-w-0 flex-1">
          <InlineTextEdit
            ariaLabel={t('progress.archiveName')}
            className="type-action"
            fallback={t('common.archivedDataset')}
            value={dataset.name}
            onSave={(value) => onRename(dataset.id, value)}
          />
          <div className="type-caption flex flex-wrap gap-x-1.5 text-muted-foreground">
            <span className="whitespace-nowrap">
              {formatDateTime(dataset.archivedAtClientIso, locale)}
            </span>
            <span className="whitespace-nowrap">
              <span aria-hidden="true">· </span>
              {t('progress.eventCount', { count: formatNumber(eventCount) })}
            </span>
          </div>
        </div>
        <button
          className="grid size-11 shrink-0 place-items-center rounded-md text-primary transition-colors hover:bg-muted sm:size-9"
          aria-expanded={isOpen}
          aria-label={`${dataset.name || t('common.archivedDataset')} ${
            isOpen ? t('common.collapse') : t('common.expand')
          }`}
          onClick={() => setIsOpen((current) => !current)}
        >
          <DisclosureIndicator isOpen={isOpen} />
        </button>
        <ConfirmButton
          mode="popover"
          title={t('common.dataset.delete')}
          description={t('common.dataset.deleteArchivedDescription')}
          onConfirm={() => onDelete(dataset.id)}
          trigger={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground hover:text-destructive sm:size-9"
              aria-label={t('common.archive.delete')}
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
      </div>
      {isOpen && <ArchiveDatasetDetails dataset={dataset} />}
    </div>
  )
}

function ArchiveDatasetDetails({ dataset }: { dataset: ProgressDataset }) {
  const { t, locale } = useI18n()
  const events = useMemo(() => getSortedEvents(dataset.events), [dataset.events])
  const archivePlayers = useMemo(() => getArchivePlayers(dataset), [dataset])
  const playerSummaries = useMemo(
    () => getArchivePlayerSummaries(dataset, archivePlayers),
    [archivePlayers, dataset],
  )
  const firstEventAt = events[0]?.createdAtClientIso ?? null
  const lastEventAt = events.at(-1)?.createdAtClientIso ?? null
  const totalScore = playerSummaries.reduce(
    (sum, summary) => sum + summary.score,
    0,
  )
  const unitLabel = dataset.unit.trim()

  if (events.length === 0) {
    return (
      <div className="border-t p-3 sm:p-4">
        <EmptyState className="p-4">
          {t('progress.emptyArchivedDataset')}
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="grid gap-3 border-t p-3 sm:p-4">
      <ProgressChart
        dataset={dataset}
        emptyMessage={t('progress.emptyArchivedUsableEvents')}
        mobileDefaultView="verlauf"
        players={archivePlayers}
      />

      <div className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-3">
        <div className="min-w-0">
          <div className="type-caption text-muted-foreground">
            {t('progress.timeRange')}
          </div>
          <div className="type-label mt-1 truncate">
            {formatDateRange(firstEventAt, lastEventAt, locale)}
          </div>
        </div>
        <div>
          <div className="type-caption text-muted-foreground">
            {t('progress.events')}
          </div>
          <div className="type-label mt-1 tabular-nums">
            {formatNumber(events.length)}
          </div>
        </div>
        <div>
          <div className="type-caption text-muted-foreground">
            {t('progress.totalScore')}
          </div>
          <div className="type-label mt-1 tabular-nums">
            {formatNumber(totalScore)}
            {unitLabel ? ` ${unitLabel}` : ''}
          </div>
        </div>
      </div>

      {playerSummaries.length === 0 ? (
        <EmptyState className="p-4">
          {t('progress.emptyArchivedPlayers')}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-md border bg-background">
          {playerSummaries.map((summary, index) => (
            <div
              key={summary.player.id}
              className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b px-3 py-2 last:border-b-0"
            >
              <span className="type-caption text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: summary.player.color }}
                  />
                  <span className="type-label min-w-0 truncate">
                    {summary.player.name}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    {formatNumber(summary.eventCount)}
                  </Badge>
                </div>
                <div className="type-caption mt-0.5 truncate text-muted-foreground">
                  {formatDateRange(summary.firstEventAt, summary.lastEventAt, locale)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="type-action tabular-nums">
                  {formatNumber(summary.score)}
                </div>
                {unitLabel && (
                  <div className="type-caption max-w-24 truncate text-muted-foreground">
                    {unitLabel}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
