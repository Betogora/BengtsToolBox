import { useMemo } from 'react'

import { formatNumber } from '@/apps/progress-dashboard/format'
import { eventIconComponents } from '@/apps/progress-dashboard/eventIcons'
import { useHighlightedPlayer } from '@/apps/progress-dashboard/hooks/useHighlightedPlayer'
import {
  chartHeight,
  chartPadding,
  chartWidth,
  getPlayerTimelinePath,
  getProgressChartData,
  mobileSparklineHeight,
  mobileSparklinePadding,
  mobileSparklineWidth,
  type ProgressChartData,
  type ProgressChartSegment,
} from '@/apps/progress-dashboard/progressChartModel'
import type {
  PlayerScore,
  ProgressDataset,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getReadableTextColor } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type ProgressChartMobileView = 'stand' | 'verlauf'

function PlayerTimeline({
  ariaLabel,
  chartData,
  className,
  player,
  segments,
}: {
  ariaLabel: string
  chartData: ProgressChartData
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
  chartData: ProgressChartData
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
  chartData: ProgressChartData
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
  const {
    activePlayerId,
    clearHighlightedPlayer,
    clearHoveredPlayer,
    hideHoveredPlayer,
    orderedChartSeries,
    orderedEventPoints,
    pinnedPlayerId,
    showHoveredPlayer,
    togglePinnedPlayer,
  } = useHighlightedPlayer(players, chartData)

  if (!chartData.hasValidEvents) {
    return (
      <EmptyState className="flex aspect-[2.45/1] min-h-0 items-center justify-center bg-card p-4">
        {emptyMessage ?? t('progress.emptyEvents')}
      </EmptyState>
    )
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
            onPointerLeave={clearHoveredPlayer}
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
