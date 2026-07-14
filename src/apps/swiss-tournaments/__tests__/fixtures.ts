import type {
  GameResult,
  MarioKartRacer,
  Pairing,
  Player,
  Round,
  Tournament,
  TournamentFormat,
} from '@/apps/swiss-tournaments/types'
import {
  tournamentDomain,
  type TournamentCommand,
} from '@/apps/swiss-tournaments/domain/tournamentDomain'

export function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    rating: 2000 - index * 50,
    initialSeed: index + 1,
    status: 'active',
    addedInRound: 1,
  }))
}

export function makeTournament(
  format: TournamentFormat = 'swiss',
  playerCount = 4,
  overrides: Partial<Tournament> = {},
): Tournament {
  return {
    id: `tournament-${format}`,
    name: `${format} test`,
    format,
    numberOfRounds:
      format === 'roundRobin'
        ? playerCount <= 1
          ? 1
          : playerCount % 2 === 0
            ? playerCount - 1
            : playerCount
        : 3,
    currentRound: 0,
    players: makePlayers(playerCount),
    rounds: [],
    settings: {
      initialSeedingMode: 'rating',
      byeScore: format === 'marioKart' ? 0.5 : 1,
      byePolicy: 'protectLateEntrants',
      roundRobinCycles: 1,
    },
    position: 0,
    createdAtClientIso: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

export function makeStandardPairing(
  id: string,
  roundNumber: number,
  whitePlayerId: string,
  blackPlayerId: string,
  result?: GameResult,
): Pairing {
  return {
    id,
    roundNumber,
    boardNumber: 1,
    kind: 'standard',
    whitePlayerId,
    blackPlayerId,
    result,
    isManual: false,
    isBye: false,
  }
}

export function makeMarioKartPairing(
  id: string,
  roundNumber: number,
  racers: MarioKartRacer[],
  cycleNumber = roundNumber,
): Pairing {
  return {
    id,
    roundNumber,
    boardNumber: 1,
    kind: 'marioKart',
    marioKartCycleNumber: cycleNumber,
    marioKartCycleLobbyNumber: 1,
    marioKartRacers: racers,
    isManual: false,
    isBye: false,
  }
}

export function makeRound(
  roundNumber: number,
  pairings: Pairing[],
  status: Round['status'] = 'completed',
): Round {
  return {
    id: `round-${roundNumber}`,
    roundNumber,
    pairings,
    status,
  }
}

export function pairingKey(pairing: Pairing) {
  return [pairing.whitePlayerId, pairing.blackPlayerId].sort().join('::')
}

export function applyTournamentCommand(
  tournament: Tournament,
  command: TournamentCommand,
) {
  const decision = tournamentDomain.transition(tournament, { command })
  const applied =
    decision.status === 'confirmation-required'
      ? tournamentDomain.transition(tournament, decision.retry)
      : decision

  if (applied.status !== 'changed') {
    throw new Error(`Turnieraktion wurde nicht angewendet: ${applied.status}`)
  }

  return applied.tournament
}

export function planNextTournamentRound(tournament: Tournament) {
  return applyTournamentCommand(tournament, { type: 'round.plan-next' })
}

export function planNextTournamentPairings(tournament: Tournament) {
  return planNextTournamentRound(tournament).rounds.at(-1)?.pairings ?? []
}
