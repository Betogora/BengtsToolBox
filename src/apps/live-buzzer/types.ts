import type { Timestamp } from 'firebase/firestore'

export type BuzzerTeamId = 'blue' | 'yellow' | 'red'

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
  roundId?: string | null
  buzzes?: BuzzerBuzz[] | Record<string, BuzzerBuzz>
  firstReceivedAtMs?: number | null
  clockSyncId?: string | null
  clockSyncRequestedAtMs?: number | null
  isOpen: boolean
  winnerPlayerId: string | null
  winnerTeamId: BuzzerTeamId | null
  roundNumber: number
  lastBuzzedAt: BuzzerTimestamp
  lastBuzzedAtClientIso: string | null
  history: BuzzerRoundResult[]
  updatedBy?: string
}

export type BuzzerBuzz = {
  roundId?: string
  playerId: string
  playerName: string
  teamId: BuzzerTeamId | null
  pressedAtMs: number
  uncertaintyMs: number
  receivedAtMs: number
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
  ownerUid?: string
  joinedAtMs?: number
  clockSyncId?: string | null
  clockSyncedAtMs?: number | null
}
