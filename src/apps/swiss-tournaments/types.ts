export type PlayerStatus = 'active' | 'inactive' | 'withdrawn'

export type InitialPlayerStatus = Extract<PlayerStatus, 'active' | 'inactive'>

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

export type TournamentFormat = 'swiss' | 'roundRobin' | 'handAndBrain' | 'marioKart'

export type PairingKind = 'standard' | 'handAndBrain' | 'single' | 'marioKart'

export type PairingWarning = {
  id: string
  severity: 'hard' | 'soft'
  message: string
}

export type HandBrainSide = {
  handPlayerId: string
  brainPlayerId: string
}

export type MarioKartRacerRole = 'scoring' | 'extra'

export type MarioKartRacer = {
  playerId: string
  role: MarioKartRacerRole
  placement?: number
  ingamePoints?: number
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
  roundRobinCycles?: number
  roundByeScores?: Record<number, ByeScore>
}

export type Pairing = {
  id: string
  roundNumber: number
  boardNumber: number
  kind?: PairingKind
  whitePlayerId?: string
  blackPlayerId?: string
  handBrainSides?: {
    white: HandBrainSide
    black: HandBrainSide
  }
  marioKartRacers?: MarioKartRacer[]
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
  receivedSingleGames: number
  marioKartWins: number
  marioKartIngamePoints: number
  marioKartAveragePlacement: number | null
  marioKartExtraRides: number
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
  status?: InitialPlayerStatus
}

export type CreateTournamentInput = {
  name: string
  format: TournamentFormat
  numberOfRounds: number
  players: PlayerInput[]
  initialSeedingMode: SeedingMode
  byeScore: ByeScore
  roundRobinCycles?: number
}

export type PlayerScoreSummary = {
  points: number
  wins: number
  opponentGroups: string[][]
  defeatedOpponentGroups: string[][]
  drawnOpponentGroups: string[][]
  colors: Color[]
  roles: Array<'hand' | 'brain' | '-'>
  byes: number
  singleGames: number
  marioKartIngamePoints: number
  marioKartPlacements: number[]
  marioKartExtraRides: number
}
