import type {
  ByeScore,
  GameResult,
  HandBrainSide,
  MarioKartRacer,
  Pairing,
  Player,
  PlayerStatus,
  Round,
  StandingRow,
  Tournament,
  TournamentSettings,
} from '@/apps/swiss-tournaments/types'

export type TournamentNoticeCode = 'correction-regenerates-current-draft'

export type TournamentEffect =
  | 'current-draft-regenerated'
  | 'round-completed'
  | 'next-round-created'
  | 'mario-kart-lobby-created'

export type TournamentIssue = {
  code:
    | 'invalid-input'
    | 'invalid-state'
    | 'not-found'
    | 'planning-blocked'
    | 'unsupported-format'
  subject?: 'pairing' | 'player' | 'round'
  reason?: string
}

export type TournamentCommand =
  | {
      type: 'tournament.configure'
      changes: {
        name?: string
        numberOfRounds?: number
        settings?: Partial<TournamentSettings>
      }
    }
  | { type: 'round-bye-score.set'; roundNumber: number; byeScore: ByeScore }
  | { type: 'tournament.reset-progress' }
  | { type: 'player.add'; name: string; rating?: number }
  | {
      type: 'player.update'
      playerId: string
      changes: { name?: string; rating?: number }
    }
  | {
      type: 'player.set-status'
      playerId: string
      status: PlayerStatus
      fromRound?: number
    }
  | { type: 'player.remove'; playerId: string }
  | { type: 'round.plan-next' }
  | { type: 'round.regenerate-latest' }
  | { type: 'round.complete'; roundNumber: number }
  | { type: 'round.reopen-previous' }
  | { type: 'round.delete-latest' }
  | {
      type: 'pairing.pin'
      roundNumber: number
      assignment:
        | {
            kind: 'standard'
            whitePlayerId: string
            blackPlayerId: string
          }
        | {
            kind: 'handAndBrain'
            sides: { white: HandBrainSide; black: HandBrainSide }
          }
    }
  | { type: 'pairing.unpin'; roundNumber: number; pairingId: string }
  | {
      type: 'result.set'
      roundNumber: number
      pairingId: string
      result?: GameResult
    }
  | {
      type: 'result.correct'
      roundNumber: number
      pairingId: string
      result?: GameResult
    }
  | {
      type: 'mario-kart.reserve-next-lobby'
      playerIds: readonly string[] | null
    }
  | {
      type: 'mario-kart.set-racer'
      roundNumber: number
      pairingId: string
      playerId: string
      changes: { placement?: number; event?: boolean }
    }
  | {
      type: 'mario-kart.correct-lobby'
      roundNumber: number
      racers: readonly {
        playerId: string
        placement?: number
        event?: boolean
      }[]
    }

export type TournamentCommandEnvelope = {
  command: TournamentCommand
  acknowledged?: readonly TournamentNoticeCode[]
}

export type TournamentDecision =
  | {
      status: 'changed'
      tournament: Tournament
      effects: readonly TournamentEffect[]
    }
  | { status: 'unchanged'; tournament: Tournament }
  | {
      status: 'confirmation-required'
      tournament: Tournament
      notices: readonly TournamentNoticeCode[]
      retry: TournamentCommandEnvelope
    }
  | {
      status: 'rejected'
      tournament: Tournament
      issues: readonly TournamentIssue[]
    }

export type TournamentProgress = {
  completedUnitCount: number
  completionRoundNumber: number | null
  currentUnitCount: number
  isComplete: boolean
  minimumEditableUnitCount: number
  minimumSavableUnitCount: number
}

export type TournamentPlanningAvailability = {
  canCreate: boolean
  blockedReason?: string
}

export type BeerStandingRow = {
  playerId: string
  beers: number
  rank: number
}

export type InspectedRound = {
  round: Round
  displayLabel: string
  isComplete: boolean
  isLatest: boolean
  isLatestEmptyMarioKartLobby: boolean
}

export type InspectedPairing = {
  pairing: Pairing
  isComplete: boolean
  marioKartRacers: readonly MarioKartRacer[]
  marioKartPlacementErrors: ReadonlyMap<
    string,
    'required' | 'range' | 'duplicate'
  >
  physicalRaceNumberByPlayerId: ReadonlyMap<string, number>
}

export type InspectedPlayer = {
  player: Player
  canRemove: boolean
}

export type TournamentInspection = {
  tournament: Tournament
  standings: readonly StandingRow[]
  beerStandings: readonly BeerStandingRow[]
  standingsCsv: string
  progress: TournamentProgress
  planning: TournamentPlanningAvailability | null
  latestRound: Round | null
  currentDraftRound: Round | null
  canPlanNextRound: boolean
  canRegenerateLatestRound: boolean
  rounds: ReadonlyMap<number, InspectedRound>
  pairings: ReadonlyMap<string, InspectedPairing>
  players: ReadonlyMap<string, InspectedPlayer>
  constraints: {
    marioKartPlacement: { min: 1; max: number; uniqueWithinLobby: true }
  }
}
