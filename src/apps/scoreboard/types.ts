import type { TeamId } from '@/apps/shared/teams'

export type ScoreboardPlayer = {
  id: string
  name: string
  score: number
  teamId: TeamId | null
  position: number
  updatedBy?: string
  lastUpdatedBy?: string
}

export type ScoreboardEvent = {
  id: string
  playerId: string
  playerName: string
  playerColor: string
  playerTeamId: TeamId | null
  delta: number
  previousScore: number
  nextScore: number
  createdAtClientIso: string
  position: number
  updatedBy?: string
}

export type ScoreboardState = {
  events: ScoreboardEvent[]
  lastScoreEventId: string | null
  updatedBy?: string
}
