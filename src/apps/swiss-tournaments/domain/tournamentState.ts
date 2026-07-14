import type { GameResult, Pairing, Player, PlayerStatus, Round, Tournament } from '@/apps/swiss-tournaments/types'
import { getMarioKartEntryCycle, getMarioKartPlanningAvailability, getMarioKartRacers as marioKartRacers, setMarioKartPlayerStatus, updateMarioKartRacer } from '@/apps/swiss-tournaments/marioKart'
import { assignColors, blackSidePlayerIds, getPlayerStatusForRound, getSummaryBeforeRound, makeId, marioKartScoringPlayerIds, pairingKind, pairingPlayerIds, sameStringSet, validatePairing, whiteSidePlayerIds } from './pairingSupport'
import { generatePairings } from './pairingGeneration'

export function updateResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
): Tournament {
  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]

  if (
    !latestRound ||
    latestRound.roundNumber !== roundNumber ||
    latestRound.status !== 'draft'
  ) {
    return tournament
  }

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((pairing) => {
              if (pairing.id !== pairingId) {
                return pairing
              }

              if (result) {
                return { ...pairing, result }
              }

              const pairingWithoutResult = { ...pairing }
              delete pairingWithoutResult.result
              return pairingWithoutResult
            }),
          }
        : round,
    ),
  }
}

export function correctResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
): Tournament {
  let didChange = false
  const nextTournament = {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((pairing) => {
              if (pairing.id !== pairingId || pairing.isBye) {
                return pairing
              }

              if (pairing.result === result) {
                return pairing
              }

              didChange = true

              if (result) {
                return { ...pairing, result }
              }

              const pairingWithoutResult = { ...pairing }
              delete pairingWithoutResult.result
              return pairingWithoutResult
            }),
          }
        : round,
    ),
  }

  return didChange ? regenerateCurrentDraftRoundIfUnscored(nextTournament) : tournament
}

export function updateMarioKartResult(
  tournament: Tournament,
  roundNumber: number,
  _pairingId: string,
  playerId: string,
  partial: { placement?: number; event?: boolean },
): Tournament {
  return updateMarioKartRacer(
    tournament,
    roundNumber,
    playerId,
    partial,
  )
}

function getLatestRound(tournament: Tournament) {
  return [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]
}

function hasGameResult(pairing: Pairing) {
  if (pairing.kind === 'marioKart') {
    return marioKartRacers(pairing).some(
      (racer) =>
        racer.placement ||
        racer.event,
    )
  }

  if (pairing.isBye) {
    return false
  }

  return !pairing.isBye && Boolean(pairing.result)
}

function canRegenerateUnscoredDraftRound(tournament: Tournament, round: Round) {
  const latestRound = getLatestRound(tournament)

  return (
    round.status === 'draft' &&
    round.pairings.length > 0 &&
    round.roundNumber === latestRound?.roundNumber &&
    !round.pairings.some(hasGameResult)
  )
}

export function willResultCorrectionRegenerateCurrentDraftRound(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
) {
  const pairing = tournament.rounds
    .find((round) => round.roundNumber === roundNumber)
    ?.pairings.find((entry) => entry.id === pairingId)

  if (!pairing || pairing.isBye || pairing.result === result) {
    return false
  }

  const draftRound = getCurrentDraftRound(tournament)

  return Boolean(
    draftRound && canRegenerateUnscoredDraftRound(tournament, draftRound),
  )
}

function isValidManualPairingForRound(
  tournament: Tournament,
  pairing: Pairing,
  roundNumber: number,
) {
  return pairingPlayerIds(pairing).every((playerId) => {
    const player = tournament.players.find((entry) => entry.id === playerId)

    return (
      player &&
      player.addedInRound <= roundNumber &&
      getPlayerStatusForRound(player, roundNumber) === 'active'
    )
  })
}

export function canRemovePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
) {
  return !tournament.rounds.some((round) => {
    const playerUsedInRound = round.pairings.some((pairing) =>
      pairingPlayerIds(pairing).includes(playerId),
    )

    return playerUsedInRound && !canRegenerateUnscoredDraftRound(tournament, round)
  })
}

export function regenerateCurrentDraftRoundIfUnscored(
  tournament: Tournament,
): Tournament {
  const existing = getCurrentDraftRound(tournament)

  if (!existing || !canRegenerateUnscoredDraftRound(tournament, existing)) {
    return tournament
  }

  const fixedPairings = existing.pairings.filter(
    (pairing) =>
      pairing.isManual &&
      isValidManualPairingForRound(tournament, pairing, existing.roundNumber),
  )

  return upsertRound(tournament, existing.roundNumber, fixedPairings)
}

export function setPlayerStatus(
  tournament: Tournament,
  playerId: string,
  status: PlayerStatus,
  fromRound?: number,
): Tournament {
  if (tournament.format === 'marioKart') {
    return setMarioKartPlayerStatus(tournament, playerId, status)
  }

  let didChange = false
  const nextTournament = {
    ...tournament,
    players: tournament.players.map((player) => {
      if (player.id !== playerId) {
        return player
      }

      if (fromRound && fromRound > tournament.currentRound) {
        if (player.statusOverrides?.[fromRound] === status) {
          return player
        }

        didChange = true
        return {
          ...player,
          statusOverrides: {
            ...player.statusOverrides,
            [fromRound]: status,
          },
        }
      }

      if (player.status === status) {
        return player
      }

      didChange = true
      return { ...player, status }
    }),
  }

  return didChange ? regenerateCurrentDraftRoundIfUnscored(nextTournament) : tournament
}

export function addPlayerAfterStart(
  tournament: Tournament,
  name: string,
  rating?: number,
): Tournament {
  const nextSeed =
    tournament.players.reduce((max, player) => Math.max(max, player.initialSeed), 0) + 1
  const nextRound =
    tournament.rounds.find((round) => round.status === 'draft')?.roundNumber ??
    (tournament.format === 'roundRobin'
      ? tournament.currentRound + 1 || 1
      : tournament.format === 'marioKart'
        ? tournament.currentRound + 1 || 1
        : Math.min(tournament.numberOfRounds, tournament.currentRound + 1 || 1))
  const player: Player = {
    id: makeId('player'),
    name: name.trim() || `Spieler ${nextSeed}`,
    initialSeed: nextSeed,
    status: 'active',
    addedInRound: nextRound,
  }

  if (tournament.format === 'marioKart') {
    player.marioKartEligibleFromCycle = getMarioKartEntryCycle(tournament)
    player.marioKartSkippedCycleNumbers = Array.from(
      { length: player.marioKartEligibleFromCycle - 1 },
      (_, index) => index + 1,
    )
  }

  if (typeof rating === 'number' && Number.isFinite(rating)) {
    player.rating = Math.round(rating)
  }

  const nextTournament = {
    ...tournament,
    players: [...tournament.players, player],
  }

  return tournament.format === 'marioKart'
    ? nextTournament
    : regenerateCurrentDraftRoundIfUnscored(nextTournament)
}

export function removePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
): Tournament {
  if (!canRemovePlayerFromTournament(tournament, playerId)) {
    return tournament
  }

  const remainingReservationPlayerIds =
    tournament.marioKartLobbyReservation?.playerIds.filter(
      (entry) => entry !== playerId,
    ) ?? []
  const nextTournament = {
    ...tournament,
    players: tournament.players.filter((player) => player.id !== playerId),
  }

  if (remainingReservationPlayerIds.length >= 2) {
    nextTournament.marioKartLobbyReservation = {
      playerIds: remainingReservationPlayerIds,
    }
  } else {
    delete nextTournament.marioKartLobbyReservation
  }

  return regenerateCurrentDraftRoundIfUnscored(nextTournament)
}

export function resetTournamentProgress(tournament: Tournament): Tournament {
  const resetTournament: Tournament = {
    ...tournament,
    currentRound: 0,
    players: tournament.players.map((player) => ({
      ...player,
      status: 'active',
      addedInRound: 1,
      statusOverrides: undefined,
      marioKartEligibleFromCycle:
        tournament.format === 'marioKart' ? 1 : player.marioKartEligibleFromCycle,
      marioKartSkippedCycleNumbers:
        tournament.format === 'marioKart'
          ? []
          : player.marioKartSkippedCycleNumbers,
    })),
    rounds: [],
  }


  delete resetTournament.marioKartLobbyReservation
  return resetTournament
}

export function reopenPreviousRound(tournament: Tournament): Tournament {
  const sortedRounds = [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
  const latestRound = sortedRounds[sortedRounds.length - 1]
  const previousRound = sortedRounds[sortedRounds.length - 2]

  if (!latestRound || !previousRound || previousRound.status !== 'completed') {
    return tournament
  }

  return {
    ...tournament,
    currentRound: previousRound.roundNumber,
    rounds: sortedRounds
      .filter((round) => round.roundNumber !== latestRound.roundNumber)
      .map((round) =>
        round.roundNumber === previousRound.roundNumber
          ? { ...round, status: 'draft' as const }
          : round,
      ),
  }
}

export function deleteLatestRound(tournament: Tournament): Tournament {
  const sortedRounds = [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
  const latestRound = sortedRounds[sortedRounds.length - 1]
  const previousRound = sortedRounds[sortedRounds.length - 2]

  if (!latestRound) {
    return tournament
  }

  return {
    ...tournament,
    currentRound: previousRound?.roundNumber ?? 0,
    rounds: sortedRounds
      .filter((round) => round.roundNumber !== latestRound.roundNumber)
      .map((round) =>
        previousRound &&
        round.roundNumber === previousRound.roundNumber &&
        round.status === 'completed'
          ? { ...round, status: 'draft' as const }
          : round,
      ),
  }
}

export function getNextAllowedRoundNumber(tournament: Tournament) {
  if (tournament.format === 'marioKart') {
    return getMarioKartPlanningAvailability(tournament).canCreate
      ? tournament.rounds.reduce(
          (highest, round) => Math.max(highest, round.roundNumber),
          0,
        ) + 1
      : null
  }

  if (tournament.rounds.length === 0) {
    return tournament.numberOfRounds >= 1 ? 1 : null
  }

  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]

  if (!latestRound || latestRound.status !== 'completed') {
    return null
  }

  return latestRound.roundNumber + 1
}

export function getCurrentDraftRound(tournament: Tournament) {
  return (
    [...tournament.rounds]
      .sort((left, right) => right.roundNumber - left.roundNumber)
      .find((round) => round.status === 'draft') ?? null
  )
}

export function upsertRound(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Tournament {
  const existing = tournament.rounds.find((round) => round.roundNumber === roundNumber)

  if (existing?.status === 'completed') {
    return tournament
  }

  const pairings = preserveExistingResults(
    generatePairings(tournament, roundNumber, fixedPairings),
    existing?.pairings ?? [],
  )

  const round: Round = {
    id: existing?.id ?? makeId('round'),
    roundNumber,
    pairings,
    status: existing?.status ?? 'draft',
  }

  const nextTournament = {
    ...tournament,
    currentRound: Math.max(tournament.currentRound, roundNumber),
    rounds: [
      ...tournament.rounds.filter((entry) => entry.roundNumber !== roundNumber),
      round,
    ].sort((left, right) => left.roundNumber - right.roundNumber),
  }

  return nextTournament
}

function invertResult(result: GameResult): GameResult {
  if (result === '1-0') {
    return '0-1'
  }

  if (result === '0-1') {
    return '1-0'
  }

  if (result === 'forfeit-1-0') {
    return 'forfeit-0-1'
  }

  if (result === 'forfeit-0-1') {
    return 'forfeit-1-0'
  }

  return result
}

function preserveExistingResults(pairings: Pairing[], existingPairings: Pairing[]) {
  const existingMarioKartPairings = existingPairings.filter(
    (pairing) =>
      pairingKind(pairing) === 'marioKart' &&
      marioKartRacers(pairing).some(
        (racer) => racer.placement || racer.event,
      ),
  )
  const existingGames = existingPairings.filter(
    (pairing) =>
      !pairing.isBye &&
      pairing.result &&
      whiteSidePlayerIds(pairing).length > 0 &&
      blackSidePlayerIds(pairing).length > 0,
  )

  if (existingGames.length === 0 && existingMarioKartPairings.length === 0) {
    return pairings
  }

  return pairings.map((pairing) => {
    if (pairingKind(pairing) === 'marioKart') {
      const scoringIds = marioKartScoringPlayerIds(pairing)
      const racerIds = marioKartRacers(pairing).map((racer) => racer.playerId)
      const existingMarioKartPairing =
        existingMarioKartPairings.find((existing) =>
          sameStringSet(
            marioKartRacers(existing).map((racer) => racer.playerId),
            racerIds,
          ),
        ) ??
        existingMarioKartPairings.find((existing) =>
          sameStringSet(marioKartScoringPlayerIds(existing), scoringIds),
        )

      if (!existingMarioKartPairing) {
        return pairing
      }

      return {
        ...pairing,
        marioKartRacers: marioKartRacers(pairing).map((racer) => {
          const existingRacer = marioKartRacers(existingMarioKartPairing).find(
            (entry) => entry.playerId === racer.playerId,
          )

          if (!existingRacer) {
            return racer
          }

          return {
            ...racer,
            placement: existingRacer.placement,
            event: existingRacer.event,
          }
        }),
      }
    }

    const whiteIds = whiteSidePlayerIds(pairing)
    const blackIds = blackSidePlayerIds(pairing)

    if (pairing.isBye || whiteIds.length === 0 || blackIds.length === 0) {
      return pairing
    }

    const sameColors = existingGames.find(
      (existing) =>
        sameStringSet(whiteSidePlayerIds(existing), whiteIds) &&
        sameStringSet(blackSidePlayerIds(existing), blackIds),
    )

    if (sameColors?.result) {
      return { ...pairing, result: sameColors.result }
    }

    const swappedColors = existingGames.find(
      (existing) =>
        sameStringSet(whiteSidePlayerIds(existing), blackIds) &&
        sameStringSet(blackSidePlayerIds(existing), whiteIds),
    )

    if (swappedColors?.result) {
      return { ...pairing, result: invertResult(swappedColors.result) }
    }

    return pairing
  })
}

export function createManualPairing(
  tournament: Tournament,
  roundNumber: number,
  whitePlayerId: string,
  blackPlayerId: string,
): Pairing {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const white = tournament.players.find((player) => player.id === whitePlayerId)
  const black = tournament.players.find((player) => player.id === blackPlayerId)
  const colors =
    white && black
      ? assignColors(white, black, summaries, tournament, roundNumber)
      : { whitePlayerId, blackPlayerId }
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber: 1,
    kind: tournament.format === 'handAndBrain' ? 'single' : 'standard',
    ...colors,
    isManual: true,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}

export function createManualHandBrainPairing(
  tournament: Tournament,
  roundNumber: number,
  handBrainSides: Pairing['handBrainSides'],
): Pairing {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber: 1,
    kind: 'handAndBrain',
    handBrainSides,
    isManual: true,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}
