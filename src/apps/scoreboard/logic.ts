import type {
  ScoreboardHistoryEntry,
  ScoreboardMode,
  ScoreboardPlayer,
  ScoreboardScoreEvent,
  ScoreboardStanding,
  ScoreboardTarget,
  ScoreboardTeam,
} from '@/apps/scoreboard/types'
import { createRandomId } from '@/apps/shared/utils'
import { getParticipantColorByPosition, normalizeParticipantColor } from '@/lib/theme'

export const scoreboardSchemaVersion = 2 as const

export function sanitizeScoreboardName(value: string, fallback: string) {
  return value.trim() || fallback
}

export function createScoreboardPlayer(
  players: ScoreboardPlayer[],
  createId: () => string = createRandomId,
): ScoreboardPlayer {
  const position = players.reduce((max, player) => Math.max(max, player.position), 0) + 1

  return {
    id: `player-${createId()}`,
    name: `Spieler ${position}`,
    color: getParticipantColorByPosition(position),
    position,
    teamId: null,
  }
}

export function createScoreboardTeam(
  teams: ScoreboardTeam[],
  createId: () => string = createRandomId,
): ScoreboardTeam {
  const position = teams.reduce((max, team) => Math.max(max, team.position), 0) + 1

  return {
    id: `team-${createId()}`,
    name: `Team ${position}`,
    color: getParticipantColorByPosition(position),
    position,
  }
}

export function normalizeScoreboardPlayer(
  player: ScoreboardPlayer,
  index: number,
): ScoreboardPlayer {
  const position = Number.isFinite(Number(player.position))
    ? Math.max(1, Math.trunc(Number(player.position)))
    : index + 1
  const fallbackColor = getParticipantColorByPosition(position)

  return {
    ...player,
    name: sanitizeScoreboardName(player.name ?? '', `Spieler ${position}`),
    color: normalizeParticipantColor(player.color, fallbackColor),
    position,
    teamId: typeof player.teamId === 'string' && player.teamId ? player.teamId : null,
  }
}

export function normalizeScoreboardTeam(team: ScoreboardTeam, index: number): ScoreboardTeam {
  const position = Number.isFinite(Number(team.position))
    ? Math.max(1, Math.trunc(Number(team.position)))
    : index + 1
  const fallbackColor = getParticipantColorByPosition(position)

  return {
    ...team,
    name: sanitizeScoreboardName(team.name ?? '', `Team ${position}`),
    color: normalizeParticipantColor(team.color, fallbackColor),
    position,
  }
}

export function getScoreboardTargets(
  mode: ScoreboardMode,
  players: ScoreboardPlayer[],
  teams: ScoreboardTeam[],
): ScoreboardTarget[] {
  if (mode === 'teams') {
    return [...teams]
      .sort((left, right) => left.position - right.position)
      .map((team) => ({
        id: team.id,
        name: team.name,
        color: team.color,
        position: team.position,
        type: 'team' as const,
        memberIds: players
          .filter((player) => player.teamId === team.id)
          .sort((left, right) => left.position - right.position)
          .map((player) => player.id),
      }))
  }

  return [...players]
    .sort((left, right) => left.position - right.position)
    .map((player) => ({
      id: player.id,
      name: player.name,
      color: player.color,
      position: player.position,
      type: 'player' as const,
      memberIds: [],
    }))
}

export function getScoringEvents(events: ScoreboardScoreEvent[], scoringId: string) {
  return events
    .filter((event) => event.scoringId === scoringId)
    .sort(
      (left, right) =>
        left.createdAtClientMs - right.createdAtClientMs || left.id.localeCompare(right.id),
    )
}

export function getScoreboardStandings(
  targets: ScoreboardTarget[],
  events: ScoreboardScoreEvent[],
): ScoreboardStanding[] {
  const scores = new Map(targets.map((target) => [target.id, 0]))

  events.forEach((event) => {
    if (scores.has(event.targetId)) {
      scores.set(event.targetId, (scores.get(event.targetId) ?? 0) + event.delta)
    }
  })

  const sorted = targets
    .map((target) => ({ target, score: scores.get(target.id) ?? 0 }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.target.position - right.target.position ||
        left.target.name.localeCompare(right.target.name),
    )

  return sorted.map((entry, index) => ({
    ...entry,
    rank: sorted.findIndex((candidate) => candidate.score === entry.score) + 1 || index + 1,
  }))
}

export function getScoreboardHistory(
  events: ScoreboardScoreEvent[],
): ScoreboardHistoryEntry[] {
  const scores = new Map<string, number>()
  const entries = events.map((event) => {
    const resultingScore = (scores.get(event.targetId) ?? 0) + event.delta
    scores.set(event.targetId, resultingScore)

    return { event, resultingScore }
  })

  return entries.reverse()
}

export function isValidScoreDelta(value: number) {
  return Number.isFinite(value) && Number.isInteger(value) && value !== 0
}

export function hasTargetEvents(events: ScoreboardScoreEvent[], targetId: string) {
  return events.some((event) => event.targetId === targetId)
}
