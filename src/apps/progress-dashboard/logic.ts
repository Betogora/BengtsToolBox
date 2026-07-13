import type {
  PlayerScore,
  ProgressDrinkIcon,
  ProgressEvent,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { createRandomId } from '@/apps/shared/utils'
import { getParticipantColorByPosition } from '@/lib/theme'

export const defaultProgressDrinkIcon: ProgressDrinkIcon = 'beer'

export function createProgressPlayer(
  players: ProgressPlayer[],
  createId: () => string = createRandomId,
): ProgressPlayer {
  const position =
    players.reduce((max, player) => Math.max(max, player.position), 0) + 1

  return {
    id: `person-${createId()}`,
    name: `Person ${position}`,
    position,
    color: getParticipantColorByPosition(position),
    defaultEventIcon: defaultProgressDrinkIcon,
  }
}

export function getPlayerScores(
  players: ProgressPlayer[],
  events: ProgressEvent[],
): PlayerScore[] {
  const scores = new Map(players.map((player) => [player.id, 0]))
  const sortedEvents = [...events].sort(
    (left, right) =>
      Date.parse(left.createdAtClientIso) - Date.parse(right.createdAtClientIso) ||
      left.position - right.position,
  )

  sortedEvents.forEach((event) => {
    if (!scores.has(event.playerId)) {
      return
    }

    const currentScore = scores.get(event.playerId) ?? 0
    scores.set(event.playerId, Math.max(0, currentScore + event.valueDelta))
  })

  return players.map((player) => ({
    player,
    score: scores.get(player.id) ?? 0,
  }))
}
