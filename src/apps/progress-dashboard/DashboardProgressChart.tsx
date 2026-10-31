import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import { formatNumber } from '@/apps/progress-dashboard/format'
import { eventIconComponents } from '@/apps/progress-dashboard/eventIcons'
import { useHighlightedPlayer } from '@/apps/progress-dashboard/hooks/useHighlightedPlayer'
import { getPlayerScores, getPlayerStandings } from '@/apps/progress-dashboard/logic'
import {
  getFittedChartPadding,
  getProgressChartLayout,
  getProgressChartModel,
} from '@/apps/progress-dashboard/progressChartModel'
import { useProgressTooltipText } from '@/apps/progress-dashboard/progressTooltipText'
import type {
  ProgressDataset,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Tooltip } from '@/components/ui/tooltip'
import { getReadableTextColor } from '@/lib/theme'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type ChartTip = {
  playerId: string
  x: number
  y: number
  size: number
  // Gesetzt bei einem Ereignispunkt, leer bei der Linie.
  point?: { event: ProgressDataset['events'][number]; value: number }
}

// Zeichnet in echten Pixeln der Containergröße, damit Schrift, Linien und Marker überall gleich groß bleiben.
// Die Höhe kommt aus der Klasse des Containers.
export function DashboardProgressChart({
  className,
  dataset,
  emptyMessage,
  players,
}: {
  className?: string
  dataset: ProgressDataset
  emptyMessage?: string
  players: ProgressPlayer[]
}) {
  const { t, locale } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const [{ height, width }, setSize] = useState({ height: 0, width: 0 })

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
  // Ereignisse werden nur bei neuen Daten sortiert, nicht bei jeder Größenänderung.
  const chartModel = useMemo(
    () => getProgressChartModel(dataset, players),
    [dataset, players],
  )
  const chartData = useMemo(
    () => ({
      ...chartModel,
      ...getProgressChartLayout(chartModel, locale, {
        height: Math.max(height, 1),
        maxTimeTicks: isNarrow ? 5 : 8,
        padding: getFittedChartPadding(width),
        width: Math.max(width, 1),
      }),
    }),
    [chartModel, locale, height, isNarrow, width],
  )
  const padding = getFittedChartPadding(width)
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
  const tooltipText = useProgressTooltipText()
  const standings = useMemo(
    () => getPlayerStandings(getPlayerScores(players, dataset.events), dataset.events),
    [dataset.events, players],
  )
  // Der Tooltip erscheint zusammen mit der Hervorhebung, aber nur mit Maus oder Stift.
  const [tip, setTip] = useState<ChartTip | null>(null)
  const showTip = (event: PointerEvent, next: ChartTip) => {
    if (event.pointerType !== 'touch') setTip(next)
  }
  const hideTip = (playerId: string) =>
    setTip((current) => (current?.playerId === playerId ? null : current))
  const tipPlayer = tip && players.find((player) => player.id === tip.playerId)
  const tipStanding = tip && standings.get(tip.playerId)
  const markerRadius = isNarrow ? 7 : 10
  const iconSize = isNarrow ? 9 : 12
  const lineWidth = isNarrow ? 2.5 : 3
  const plotBottom = height - padding.bottom

  // Das SVG liegt absolut, damit seine Größe nicht auf den gemessenen Container zurückwirkt.
  return (
    <div ref={containerRef} className={cn('relative min-w-0', className)}>
      {width > 0 && !chartData.hasValidEvents && (
        <EmptyState className="absolute inset-0 flex items-center justify-center p-4">
          {emptyMessage ?? t('progress.emptyEvents')}
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
          onClick={clearHighlightedPlayer}
          onPointerLeave={() => {
            clearHoveredPlayer()
            setTip(null)
          }}
        >
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
              onBlur={() => {
                hideHoveredPlayer(player.id)
                hideTip(player.id)
              }}
              onClick={(event) => {
                event.stopPropagation()
                togglePinnedPlayer(player.id)
              }}
              onFocus={() => {
                showHoveredPlayer(player.id)
                const last = chartData.eventPoints.findLast((point) => point.event.playerId === player.id)
                if (last) setTip({ playerId: player.id, x: last.x, y: last.y, size: markerRadius * 2 })
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  togglePinnedPlayer(player.id)
                }
              }}
              onPointerEnter={(event) => {
                showHoveredPlayer(player.id)
                const bounds = containerRef.current?.getBoundingClientRect()
                if (bounds) {
                  showTip(event, {
                    playerId: player.id,
                    x: event.clientX - bounds.left,
                    y: event.clientY - bounds.top,
                    size: 12,
                  })
                }
              }}
              onPointerLeave={() => {
                hideHoveredPlayer(player.id)
                hideTip(player.id)
              }}
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
                onPointerEnter={(event) => {
                  showHoveredPlayer(point.event.playerId)
                  showTip(event, {
                    playerId: point.event.playerId,
                    x: point.x,
                    y: point.y,
                    size: (markerRadius + 2) * 2,
                    point,
                  })
                }}
                onPointerLeave={() => {
                  hideHoveredPlayer(point.event.playerId)
                  hideTip(point.event.playerId)
                }}
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
      {tip && tipPlayer && tipStanding && (
        <Tooltip
          open
          onOpenChange={(open) => !open && setTip(null)}
          swatch={tipPlayer.color}
          title={tipPlayer.name}
          description={
            tip.point
              ? `${tooltipText.event(tip.point.event)} · ${tooltipText.total(tip.point.value)}`
              : `${t('progress.rank', { rank: tipStanding.rank })} · ${tooltipText.standing(tipStanding)}`
          }
        >
          {/* Unsichtbarer Anker am Punkt; der Schlüssel setzt ihn bei jedem Ziel neu. */}
          <span
            key={`${tip.playerId}-${tip.x}-${tip.y}`}
            aria-hidden="true"
            className="pointer-events-none absolute"
            style={{
              height: tip.size,
              left: tip.x - tip.size / 2,
              top: tip.y - tip.size / 2,
              width: tip.size,
            }}
          />
        </Tooltip>
      )}
    </div>
  )
}
