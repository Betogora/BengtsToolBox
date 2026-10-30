import { useMemo, useState } from 'react'

import type { ProgressChartData } from '@/apps/progress-dashboard/progressChartModel'
import type { ProgressPlayer } from '@/apps/progress-dashboard/types'

// Hover und Anheften teilen sich beide Diagramme; die aktive Person wird zuletzt gezeichnet.
export function useHighlightedPlayer(
  players: ProgressPlayer[],
  chartData: Pick<ProgressChartData, 'chartSeries' | 'eventPoints'>,
) {
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null)
  const [pinnedPlayerId, setPinnedPlayerId] = useState<string | null>(null)
  const playerIds = useMemo(
    () => new Set(players.map((player) => player.id)),
    [players],
  )
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

  return {
    activePlayerId,
    orderedChartSeries,
    orderedEventPoints,
    pinnedPlayerId,
    showHoveredPlayer: (playerId: string) => setHoveredPlayerId(playerId),
    hideHoveredPlayer: (playerId: string) =>
      setHoveredPlayerId((current) => (current === playerId ? null : current)),
    clearHoveredPlayer: () => setHoveredPlayerId(null),
    togglePinnedPlayer: (playerId: string) =>
      setPinnedPlayerId((current) => (current === playerId ? null : playerId)),
    clearHighlightedPlayer: () => {
      setHoveredPlayerId(null)
      setPinnedPlayerId(null)
    },
  }
}
