export type BuzzerSessionState = {
  isOpen: boolean
  winnerPlayerId: string | null
  roundNumber: number
  playerCount: number
  lastBuzzedAt: string | null
  updatedBy?: string
}

export type BuzzerPlayer = {
  id: string
  position: number
  name: string
  isActive: boolean
  buzzedAt: string | null
  lastUpdatedBy?: string
}
