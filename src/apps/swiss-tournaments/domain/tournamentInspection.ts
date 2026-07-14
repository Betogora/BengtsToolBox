import { isPairingComplete } from './pairingSupport'
import {
  canRemovePlayerFromTournament,
  getCurrentDraftRound,
  getNextAllowedRoundNumber,
} from './tournamentState'
import {
  getRoundDisplayLabel,
  recalculateStandings,
  standingsToCsv,
} from './tournamentStandings'
import {
  createMarioKartBeerStandingRows,
  createMarioKartPhysicalRaceNumberLookup,
  getMarioKartPlacementErrors,
  getMarioKartPlanningAvailability,
  getMarioKartRacers,
  isLatestEmptyMarioKartLobby,
  MARIO_KART_MAX_PLACEMENT,
} from '@/apps/swiss-tournaments/marioKart'
import { getTournamentProgress } from './tournamentProgress'
import type { Tournament } from '@/apps/swiss-tournaments/types'
import type {
  InspectedPairing,
  InspectedPlayer,
  InspectedRound,
  TournamentInspection,
} from './tournamentDomainTypes'

export function normalizeTournament(tournament: Tournament): Tournament {
  const players = [...(tournament.players ?? [])].sort(
    (left, right) => left.initialSeed - right.initialSeed,
  )
  const playerIds = new Set(players.map((player) => player.id))
  const reservationPlayerIds = [
    ...new Set(tournament.marioKartLobbyReservation?.playerIds ?? []),
  ].filter((playerId) => playerIds.has(playerId))
  const normalized: Tournament = {
    ...tournament,
    format: tournament.format ?? 'swiss',
    players,
    rounds: [...(tournament.rounds ?? [])]
      .map((round) => ({
        ...round,
        status:
          (round.status as string) === 'published'
            ? ('draft' as const)
            : round.status,
      }))
      .sort((left, right) => left.roundNumber - right.roundNumber),
    settings: {
      initialSeedingMode: tournament.settings?.initialSeedingMode ?? 'rating',
      byeScore: tournament.settings?.byeScore ?? 1,
      byePolicy: tournament.settings?.byePolicy ?? 'protectLateEntrants',
      roundRobinCycles: tournament.settings?.roundRobinCycles ?? 1,
      roundByeScores: tournament.settings?.roundByeScores ?? {},
    },
  }

  if (
    normalized.format === 'marioKart' &&
    reservationPlayerIds.length >= 2 &&
    reservationPlayerIds.length <= 4
  ) {
    normalized.marioKartLobbyReservation = { playerIds: reservationPlayerIds }
  } else {
    delete normalized.marioKartLobbyReservation
  }

  return normalized
}

export function inspectTournament(value: Tournament): TournamentInspection {
  const tournament = normalizeTournament(value)
  const standings = recalculateStandings(tournament)
  const progress = getTournamentProgress(tournament)
  const sortedRounds = [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
  const latestRound = sortedRounds.at(-1) ?? null
  const currentDraftRound = getCurrentDraftRound(tournament)
  const planning =
    tournament.format === 'marioKart'
      ? getMarioKartPlanningAvailability(tournament)
      : null
  const rounds = new Map<number, InspectedRound>()
  const pairings = new Map<string, InspectedPairing>()
  const players = new Map<string, InspectedPlayer>()
  const marioKartPhysicalRaceNumber =
    tournament.format === 'marioKart'
      ? createMarioKartPhysicalRaceNumberLookup(tournament)
      : () => 0

  sortedRounds.forEach((round) => {
    const roundComplete =
      round.status === 'completed' ||
      (round.pairings.length > 0 && round.pairings.every(isPairingComplete))

    rounds.set(round.roundNumber, {
      round,
      displayLabel: getRoundDisplayLabel(tournament, round.roundNumber),
      isComplete: roundComplete,
      isLatest: round.roundNumber === latestRound?.roundNumber,
      isLatestEmptyMarioKartLobby:
        tournament.format === 'marioKart' &&
        isLatestEmptyMarioKartLobby(tournament, round.roundNumber),
    })

    round.pairings.forEach((pairing) => {
      const marioKartRacers = getMarioKartRacers(pairing)

      pairings.set(pairing.id, {
        pairing,
        isComplete: isPairingComplete(pairing),
        marioKartRacers,
        marioKartPlacementErrors: getMarioKartPlacementErrors(pairing),
        physicalRaceNumberByPlayerId: new Map(
          marioKartRacers.map((racer) => [
            racer.playerId,
            marioKartPhysicalRaceNumber(
              pairing.roundNumber,
              racer.playerId,
            ),
          ]),
        ),
      })
    })
  })

  tournament.players.forEach((player) => {
    players.set(player.id, {
      player,
      canRemove: canRemovePlayerFromTournament(tournament, player.id),
    })
  })

  const nextRoundNumber = getNextAllowedRoundNumber(tournament)
  const canPlanNextRound = (() => {
    if (tournament.format === 'marioKart') {
      return Boolean(planning?.canCreate)
    }

    if (!latestRound) {
      return nextRoundNumber !== null
    }

    if (latestRound.status === 'completed') {
      return !currentDraftRound && nextRoundNumber !== null
    }

    return (
      latestRound.status === 'draft' &&
      latestRound.pairings.length > 0 &&
      latestRound.pairings.every(isPairingComplete)
    )
  })()

  return {
    tournament,
    standings,
    beerStandings:
      tournament.format === 'marioKart'
        ? createMarioKartBeerStandingRows(tournament)
        : [],
    standingsCsv: standingsToCsv(standings, tournament.format),
    progress,
    planning,
    latestRound,
    currentDraftRound,
    canPlanNextRound,
    canRegenerateLatestRound: Boolean(currentDraftRound),
    rounds,
    pairings,
    players,
    constraints: {
      marioKartPlacement: {
        min: 1,
        max: MARIO_KART_MAX_PLACEMENT,
        uniqueWithinLobby: true,
      },
    },
  }
}
