export type SchlagDenRaabPlayerId = 'player-1' | 'player-2'

export type SchlagDenRaabPlayer = {
  id: SchlagDenRaabPlayerId
  name: string
  position: number
}

export type SchlagDenRaabGame = {
  id: string
  position: number
  title: string
  points: number
  winnerId: SchlagDenRaabPlayerId | null
}

export type SchlagDenRaabState = {
  players: SchlagDenRaabPlayer[]
  games: SchlagDenRaabGame[]
  tiebreak: SchlagDenRaabGame | null
  archivedDatasets?: SchlagDenRaabArchivedDataset[]
  updatedBy?: string
}

export type SchlagDenRaabArchivedDataset = {
  id: string
  name: string
  archivedAtClientIso: string
  position: number
  players: SchlagDenRaabPlayer[]
  games: SchlagDenRaabGame[]
  tiebreak: SchlagDenRaabGame | null
}
