export type PlayerStatus = 'active' | 'inactive' | 'withdrawn'

export type Color = 'W' | 'B' | '-'

export type GameResult =
  | '1-0'
  | '0-1'
  | '0.5-0.5'
  | 'bye-1'
  | 'bye-0.5'
  | 'bye-0'
  | 'forfeit-1-0'
  | 'forfeit-0-1'

export type SeedingMode = 'rating' | 'random'

export type ByeScore = 1 | 0.5 | 0

export type ByePolicy = 'protectLateEntrants' | 'lowestScore'

export type RoundStatus = 'draft' | 'completed'

export type TournamentArchiveReason = 'newTournament' | 'reset'

export type TournamentFormat = 'swiss' | 'roundRobin'

export type PairingWarning = {
  id: string
  severity: 'hard' | 'soft'
  message: string
}

export type Player = {
  id: string
  name: string
  rating?: number
  initialSeed: number
  status: PlayerStatus
  addedInRound: number
  statusOverrides?: Record<number, PlayerStatus>
}

export type TournamentSettings = {
  initialSeedingMode: SeedingMode
  byeScore: ByeScore
  byePolicy: ByePolicy
  roundByeScores?: Record<number, ByeScore>
}

export type Pairing = {
  id: string
  roundNumber: number
  boardNumber: number
  whitePlayerId?: string
  blackPlayerId?: string
  result?: GameResult
  isManual: boolean
  isBye: boolean
  byePlayerId?: string
  warnings?: PairingWarning[]
}

export type Round = {
  id: string
  roundNumber: number
  pairings: Pairing[]
  status: RoundStatus
}

export type Tournament = {
  id: string
  name: string
  format?: TournamentFormat
  numberOfRounds: number
  currentRound: number
  players: Player[]
  rounds: Round[]
  settings: TournamentSettings
  position: number
  createdAtClientIso: string
  isArchived?: boolean
  archivedAtClientIso?: string
  archiveReason?: TournamentArchiveReason
  updatedBy?: string
}

export type StandingRow = {
  playerId: string
  rank: number
  playerName: string
  rating?: number
  points: number
  buchholz: number
  sonnebornBerger: number
  wins: number
  directEncounterScore: number | null
  initialSeed: number
  colorHistory: Color[]
  roundHistory: StandingRoundCell[]
  receivedByes: number
  status: PlayerStatus
}

export type StandingRoundCell = {
  roundNumber: number
  label: string
  title: string
  color: Color
  outcome: 'win' | 'draw' | 'loss' | 'bye' | 'open'
}

export type SwissTournamentsState = {
  activeTournamentId: string | null
  updatedBy?: string
}

export type PlayerInput = {
  name: string
  rating?: number
}

export type CreateTournamentInput = {
  name: string
  numberOfRounds: number
  players: PlayerInput[]
  initialSeedingMode: SeedingMode
  byeScore: ByeScore
}

export type PlayerScoreSummary = {
  points: number
  wins: number
  opponents: string[]
  defeatedOpponents: string[]
  drawnOpponents: string[]
  colors: Color[]
  byes: number
}
