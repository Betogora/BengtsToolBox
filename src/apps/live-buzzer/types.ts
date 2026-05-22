import type { Timestamp } from 'firebase/firestore'
import type { TeamId } from '@/apps/shared/teams'

export type BuzzerTeamId = TeamId

export type BuzzerTimestamp = Timestamp | string | null

export type BuzzerRoundResult = {
  id: string
  roundNumber: number
  winnerPlayerId: string
  winnerPlayerName: string
  winnerTeamId: BuzzerTeamId | null
  createdAt: string
}

export type BuzzerSessionState = {
  isOpen: boolean
  winnerPlayerId: string | null
  winnerTeamId: BuzzerTeamId | null
  roundNumber: number
  lastBuzzedAt: BuzzerTimestamp
  lastBuzzedAtClientIso: string | null
  history: BuzzerRoundResult[]
  updatedBy?: string
}

export type BuzzerPlayer = {
  id: string
  position: number
  name: string
  teamId: BuzzerTeamId | null
  isActive: boolean
  buzzedAt: BuzzerTimestamp
  buzzedAtClientIso: string | null
  lastUpdatedBy?: string
}
