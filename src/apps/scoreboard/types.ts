export type ScoreboardMode = 'individual' | 'teams'

export type ScoreboardPlayer = {
  id: string
  name: string
  color: string
  position: number
  teamId: string | null
  lastUpdatedBy?: string
}

export type ScoreboardTeam = {
  id: string
  name: string
  color: string
  position: number
  lastUpdatedBy?: string
}

export type ScoreboardScoringStatus = 'active' | 'archived'

export type ScoreboardScoring = {
  id: string
  name: string
  mode: ScoreboardMode
  status: ScoreboardScoringStatus
  position: number
  createdAtClientIso: string
  archivedAtClientIso: string | null
  playerSnapshot: ScoreboardPlayer[]
  teamSnapshot: ScoreboardTeam[]
  lastUpdatedBy?: string
}

export type ScoreTargetType = 'player' | 'team'

export type ScoreboardScoreEvent = {
  id: string
  scoringId: string
  targetType: ScoreTargetType
  targetId: string
  targetName: string
  targetColor: string
  delta: number
  createdAtClientIso: string
  createdAtClientMs: number
  lastUpdatedBy?: string
}

export type ScoreboardState = {
  schemaVersion: 2
  activeScoringId: string
  updatedBy?: string
}

export type ScoreboardTarget = {
  id: string
  name: string
  color: string
  position: number
  type: ScoreTargetType
  memberIds: string[]
}

export type ScoreboardStanding = {
  target: ScoreboardTarget
  score: number
  rank: number
}

export type ScoreboardHistoryEntry = {
  event: ScoreboardScoreEvent
  resultingScore: number
}
