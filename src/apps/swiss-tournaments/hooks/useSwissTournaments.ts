import { useEffect, useMemo } from 'react'

import {
  addPlayerAfterStart,
  correctResult,
  createManualHandBrainPairing,
  createManualPairing,
  createTournament,
  deleteLatestRound,
  getCurrentDraftRound,
  getNextAllowedRoundNumber,
  isPairingComplete,
  recalculateStandings,
  removePlayerFromTournament,
  reopenPreviousRound,
  resetTournamentProgress,
  setPlayerStatus,
  standingsToCsv,
  updateMarioKartResult,
  updateResult,
  upsertRound,
} from '@/apps/swiss-tournaments/logic'
import {
  correctClosedMarioKartLobby,
  deleteLatestEmptyMarioKartLobby,
  getMarioKartPlanningAvailability,
  planNextMarioKartLobby,
  rerollLatestEmptyMarioKartLobby,
  setMarioKartLobbyReservation,
} from '@/apps/swiss-tournaments/marioKart'
import { sequenceTournamentNames } from '@/apps/swiss-tournaments/historicalNames'
import { getTournamentProgress } from '@/apps/swiss-tournaments/tournamentProgress'
import type {
  ByeScore,
  CreateTournamentInput,
  GameResult,
  HandBrainSide,
  Pairing,
  PlayerStatus,
  SwissTournamentsState,
  Tournament,
  TournamentArchiveReason,
} from '@/apps/swiss-tournaments/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { commitSyncBatch } from '@/lib/firebase/syncBatch'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const initialState: SwissTournamentsState = {
  activeTournamentId: null,
}

function sanitizeTournament(tournament: Tournament): Tournament {
  const players = [...(tournament.players ?? [])].sort(
    (left, right) => left.initialSeed - right.initialSeed,
  )
  const playerIds = new Set(players.map((player) => player.id))
  const reservationPlayerIds = [
    ...new Set(tournament.marioKartLobbyReservation?.playerIds ?? []),
  ].filter((playerId) => playerIds.has(playerId))
  const sanitizedTournament = {
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
    tournament.format === 'marioKart' &&
    reservationPlayerIds.length >= 2 &&
    reservationPlayerIds.length <= 4
  ) {
    sanitizedTournament.marioKartLobbyReservation = {
      playerIds: reservationPlayerIds,
    }
  } else {
    delete sanitizedTournament.marioKartLobbyReservation
  }

  return sanitizedTournament
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function sanitizeDownloadName(value: string) {
  return (
    value
      .normalize('NFC')
      .trim()
      .replaceAll(/[^\p{L}\p{N}._-]+/gu, '-')
      .replaceAll(/^-+|-+$/g, '') || 'turnier'
  )
}

function createArchivePatch(reason: TournamentArchiveReason) {
  return {
    isArchived: true,
    archivedAtClientIso: new Date().toISOString(),
    archiveReason: reason,
  } satisfies Pick<
    Tournament,
    'archiveReason' | 'archivedAtClientIso' | 'isArchived'
  >
}

function createArchivedCopy(
  tournament: Tournament,
  position: number,
  reason: TournamentArchiveReason,
): Tournament {
  return {
    ...tournament,
    ...createArchivePatch(reason),
    id: `archive-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    position,
  }
}

function highestCompletedRoundNumber(tournament: Tournament) {
  return tournament.rounds.reduce(
    (highestRound, round) =>
      round.status === 'completed'
        ? Math.max(highestRound, round.roundNumber)
        : highestRound,
    0,
  )
}

function minimumPlannedUnitCount(tournament: Tournament) {
  return tournament.format === 'marioKart'
    ? getTournamentProgress(tournament).minimumSavableUnitCount
    : highestCompletedRoundNumber(tournament)
}

function pairingPlayerIds(pairing: Pairing) {
  return [
    pairing.whitePlayerId,
    pairing.blackPlayerId,
    pairing.byePlayerId,
    pairing.handBrainSides?.white.brainPlayerId,
    pairing.handBrainSides?.white.handPlayerId,
    pairing.handBrainSides?.black.brainPlayerId,
    pairing.handBrainSides?.black.handPlayerId,
    ...(pairing.marioKartRacers?.map((racer) => racer.playerId) ?? []),
  ].filter((playerId): playerId is string => typeof playerId === 'string')
}

function pairingScoringPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  if (pairing.kind === 'marioKart') {
    return (
      pairing.marioKartRacers
        ?.filter((racer) => racer.scoringCycleNumber !== null)
        .map((racer) => racer.playerId) ?? []
    )
  }

  return pairingPlayerIds(pairing)
}

export function useSwissTournaments(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.swissTournamentsState(activeLobbyId),
    [activeLobbyId],
  )
  const tournamentsPath = useMemo(
    () => firebasePaths.swissTournamentsTournaments(activeLobbyId),
    [activeLobbyId],
  )
  const stateStore = useFirestoreDoc<SwissTournamentsState>(
    statePath,
    initialState,
  )
  const tournamentsStore = useFirestoreCollection<Tournament>(
    tournamentsPath,
    [],
    'position',
  )
  const storedTournaments = useMemo(
    () => tournamentsStore.data.map(sanitizeTournament),
    [tournamentsStore.data],
  )
  const tournaments = useMemo(
    () => sequenceTournamentNames(storedTournaments),
    [storedTournaments],
  )
  const activeTournaments = useMemo(
    () => tournaments.filter((tournament) => !tournament.isArchived),
    [tournaments],
  )
  const archivedTournaments = useMemo(
    () =>
      tournaments
        .filter((tournament) => tournament.isArchived)
        .sort((left, right) =>
          (right.archivedAtClientIso ?? right.createdAtClientIso).localeCompare(
            left.archivedAtClientIso ?? left.createdAtClientIso,
          ),
        ),
    [tournaments],
  )
  const activeTournament =
    activeTournaments.find(
      (tournament) => tournament.id === stateStore.data.activeTournamentId,
    ) ??
    [...activeTournaments].sort((left, right) => right.position - left.position)[0] ??
    null
  const standings = useMemo(
    () => (activeTournament ? recalculateStandings(activeTournament) : []),
    [activeTournament],
  )

  useEffect(() => {
    if (
      tournamentsStore.isLoading ||
      !tournaments.some(
        (tournament, index) =>
          tournament.name !== storedTournaments[index]?.name,
      )
    ) {
      return
    }

    void tournamentsStore.saveItems(
      tournaments.map((tournament, index) =>
        tournament.name === storedTournaments[index]?.name
          ? tournament
          : { ...tournament, updatedBy: session.userId },
      ),
    )
  }, [session.userId, storedTournaments, tournaments, tournamentsStore])

  const saveTournament = async (tournament: Tournament) => {
    return tournamentsStore.setItem(tournament.id, {
      ...tournament,
      updatedBy: session.userId,
    })
  }

  const createNewTournament = async (input: CreateTournamentInput) => {
    const nextPosition =
      tournaments.reduce((max, tournament) => Math.max(max, tournament.position), 0) + 1
    const tournament = createTournament(input, nextPosition)
    const archivePatch = createArchivePatch('newTournament')
    const nextTournaments = sequenceTournamentNames([
      ...tournaments.map((entry) =>
        entry.isArchived ? entry : { ...entry, ...archivePatch, updatedBy: session.userId },
      ),
      {
        ...tournament,
        updatedBy: session.userId,
      },
    ])

    const result = await commitSyncBatch((batch) => {
      tournamentsStore.saveItems(nextTournaments, batch)
      stateStore.merge(
        {
          activeTournamentId: tournament.id,
          updatedBy: session.userId,
        },
        batch,
      )
    })

    if (!result.ok) return null

    return nextTournaments.find((entry) => entry.id === tournament.id) ?? tournament
  }

  const selectTournament = (tournamentId: string) =>
    stateStore.merge({
      activeTournamentId: tournamentId,
      updatedBy: session.userId,
    })

  const deleteTournament = async (tournamentId = activeTournament?.id) => {
    if (!tournamentId) {
      return
    }

    const nextTournament = activeTournaments.find((entry) => entry.id !== tournamentId)
    return commitSyncBatch((batch) => {
      tournamentsStore.deleteItem(tournamentId, batch)
      if (stateStore.data.activeTournamentId === tournamentId) {
        stateStore.merge(
          {
            activeTournamentId: nextTournament?.id ?? null,
            updatedBy: session.userId,
          },
          batch,
        )
      }
    })
  }

  const updateActiveTournament = async (
    updater: (tournament: Tournament) => Tournament,
  ) => {
    if (!activeTournament) {
      return null
    }

    const nextTournament = sanitizeTournament(updater(activeTournament))
    const result = await saveTournament(nextTournament)
    return result.ok ? nextTournament : null
  }

  const updateTournamentMeta = (partial: Partial<Tournament>) =>
    updateActiveTournament((tournament) => {
      const nextTournament = {
        ...tournament,
        ...partial,
        format: tournament.format,
        name: partial.name?.trim() || tournament.name,
        numberOfRounds: partial.numberOfRounds
          ? Math.max(
              1,
              minimumPlannedUnitCount(tournament),
              Math.floor(partial.numberOfRounds),
            )
          : tournament.numberOfRounds,
      }

      return nextTournament
    })

  const updateSettings = (partial: Partial<Tournament['settings']>) =>
    updateActiveTournament((tournament) => {
      const requestedRoundRobinCycles =
        partial.roundRobinCycles === undefined
          ? tournament.settings.roundRobinCycles
          : Math.max(1, Math.floor(partial.roundRobinCycles) || 1)
      const roundRobinCycles =
        tournament.format === 'roundRobin' && tournament.rounds.length > 0
          ? Math.max(tournament.settings.roundRobinCycles ?? 1, requestedRoundRobinCycles ?? 1)
          : requestedRoundRobinCycles
      return {
        ...tournament,
        settings: {
          ...tournament.settings,
          ...partial,
          roundRobinCycles,
        },
      }
    })

  const setRoundByeScore = (roundNumber: number, byeScore: ByeScore) =>
    updateActiveTournament((tournament) => ({
      ...tournament,
      settings: {
        ...tournament.settings,
        roundByeScores: {
          ...tournament.settings.roundByeScores,
          [roundNumber]: byeScore,
        },
      },
    }))

  const addPlayer = (name: string, rating?: number) =>
    updateActiveTournament((tournament) =>
      addPlayerAfterStart(tournament, name, rating),
    )

  const removePlayer = (playerId: string) =>
    updateActiveTournament((tournament) =>
      removePlayerFromTournament(tournament, playerId),
    )

  const updatePlayer = (
    playerId: string,
    partial: { name?: string; rating?: number },
  ) =>
    updateActiveTournament((tournament) => ({
      ...tournament,
      players: tournament.players.map((player) => {
        if (player.id !== playerId) {
          return player
        }

        const nextPlayer = {
          ...player,
          name: partial.name?.trim() || player.name,
        }

        if (partial.rating === undefined || !Number.isFinite(partial.rating)) {
          delete nextPlayer.rating
        } else {
          nextPlayer.rating = Math.round(partial.rating)
        }

        return nextPlayer
      }),
    }))

  const changePlayerStatus = (
    playerId: string,
    status: PlayerStatus,
    fromRound?: number,
  ) =>
    updateActiveTournament((tournament) =>
      setPlayerStatus(tournament, playerId, status, fromRound),
    )

  const generateRound = () =>
    updateActiveTournament((tournament) => {
      if (tournament.format === 'marioKart') {
        return planNextMarioKartLobby(tournament).tournament
      }

      const sortedRounds = [...tournament.rounds].sort(
        (left, right) => left.roundNumber - right.roundNumber,
      )
      const latestRound = sortedRounds[sortedRounds.length - 1]

      if (!latestRound) {
        const nextRoundNumber = getNextAllowedRoundNumber(tournament)

        return nextRoundNumber ? upsertRound(tournament, nextRoundNumber) : tournament
      }

      if (latestRound.status === 'completed') {
        const nextRoundNumber = getNextAllowedRoundNumber(tournament)

        return nextRoundNumber ? upsertRound(tournament, nextRoundNumber) : tournament
      }

      if (
        latestRound.status !== 'draft' ||
        latestRound.pairings.some((pairing) => !isPairingComplete(pairing))
      ) {
        return tournament
      }

      const completedTournament = {
        ...tournament,
        rounds: tournament.rounds.map((round) =>
          round.roundNumber === latestRound.roundNumber
            ? { ...round, status: 'completed' as const }
            : round,
        ),
      }

      const nextRoundNumber = getNextAllowedRoundNumber(completedTournament)

      return nextRoundNumber ? upsertRound(completedTournament, nextRoundNumber) : completedTournament
    })

  const regenerateRound = () =>
    updateActiveTournament((tournament) => {
      if (tournament.format === 'marioKart') {
        const latestActiveRound = [...tournament.rounds]
          .sort((left, right) => right.roundNumber - left.roundNumber)
          .find((round) => round.status === 'draft')

        return latestActiveRound
          ? rerollLatestEmptyMarioKartLobby(
              tournament,
              latestActiveRound.roundNumber,
            )
          : tournament
      }

      const existing = getCurrentDraftRound(tournament)
      const latestRound = [...tournament.rounds].sort(
        (left, right) => right.roundNumber - left.roundNumber,
      )[0]

      if (!existing || existing.roundNumber !== latestRound?.roundNumber) {
        return tournament
      }

      return upsertRound(
        tournament,
        existing.roundNumber,
        existing?.pairings.filter((pairing) => pairing.isManual) ?? [],
      )
    })

  const addManualPairing = (
    roundNumber: number,
    whitePlayerId: string,
    blackPlayerId: string,
  ) =>
    updateActiveTournament((tournament) => {
      const existing = tournament.rounds.find(
        (round) => round.roundNumber === roundNumber,
      )
      const latestRound = [...tournament.rounds].sort(
        (left, right) => right.roundNumber - left.roundNumber,
      )[0]

      if (
        !existing ||
        existing.status !== 'draft' ||
        existing.roundNumber !== getCurrentDraftRound(tournament)?.roundNumber ||
        existing.roundNumber !== latestRound?.roundNumber
      ) {
        return tournament
      }

      const fixedPlayerIds = new Set(
        existing.pairings
          .filter((pairing) => pairing.isManual)
          .flatMap(pairingScoringPlayerIds),
      )

      if (
        whitePlayerId === blackPlayerId ||
        fixedPlayerIds.has(whitePlayerId) ||
        fixedPlayerIds.has(blackPlayerId)
      ) {
        return tournament
      }

      const fixedPairings = [
        ...(existing?.pairings.filter((pairing) => pairing.isManual) ?? []),
        createManualPairing(tournament, roundNumber, whitePlayerId, blackPlayerId),
      ]

      return upsertRound(tournament, roundNumber, fixedPairings)
    })

  const addManualHandBrainPairing = (
    roundNumber: number,
    handBrainSides: {
      white: HandBrainSide
      black: HandBrainSide
    },
  ) =>
    updateActiveTournament((tournament) => {
      const existing = tournament.rounds.find(
        (round) => round.roundNumber === roundNumber,
      )
      const latestRound = [...tournament.rounds].sort(
        (left, right) => right.roundNumber - left.roundNumber,
      )[0]

      if (
        !existing ||
        existing.status !== 'draft' ||
        existing.roundNumber !== getCurrentDraftRound(tournament)?.roundNumber ||
        existing.roundNumber !== latestRound?.roundNumber
      ) {
        return tournament
      }

      const requestedPlayerIds = [
        handBrainSides.white.brainPlayerId,
        handBrainSides.white.handPlayerId,
        handBrainSides.black.brainPlayerId,
        handBrainSides.black.handPlayerId,
      ]
      const fixedPlayerIds = new Set(
        existing.pairings
          .filter((pairing) => pairing.isManual)
          .flatMap(pairingScoringPlayerIds),
      )

      if (
        new Set(requestedPlayerIds).size !== 4 ||
        requestedPlayerIds.some((playerId) => fixedPlayerIds.has(playerId))
      ) {
        return tournament
      }

      const fixedPairings = [
        ...(existing?.pairings.filter((pairing) => pairing.isManual) ?? []),
        createManualHandBrainPairing(tournament, roundNumber, handBrainSides),
      ]

      return upsertRound(tournament, roundNumber, fixedPairings)
    })

  const removeManualPairing = (roundNumber: number, pairingId: string) =>
    updateActiveTournament((tournament) => {
      const existing = tournament.rounds.find(
        (round) => round.roundNumber === roundNumber,
      )
      const latestRound = [...tournament.rounds].sort(
        (left, right) => right.roundNumber - left.roundNumber,
      )[0]

      if (
        !existing ||
        existing.status !== 'draft' ||
        existing.roundNumber !== getCurrentDraftRound(tournament)?.roundNumber ||
        existing.roundNumber !== latestRound?.roundNumber
      ) {
        return tournament
      }

      const fixedPairings = existing.pairings.filter(
        (pairing) => pairing.isManual && pairing.id !== pairingId,
      )

      return upsertRound(tournament, roundNumber, fixedPairings)
    })

  const completeRound = (roundNumber: number) =>
    updateActiveTournament((tournament) => {
      const latestRound = [...tournament.rounds].sort(
        (left, right) => right.roundNumber - left.roundNumber,
      )[0]

      if (
        !latestRound ||
        latestRound.roundNumber !== roundNumber ||
        latestRound.status !== 'draft' ||
        latestRound.pairings.some((pairing) => !isPairingComplete(pairing))
      ) {
        return tournament
      }

      return {
        ...tournament,
        rounds: tournament.rounds.map((round) =>
          round.roundNumber === roundNumber
            ? { ...round, status: 'completed' as const }
            : round,
        ),
      }
    })

  const resetTournament = async () => {
    if (!activeTournament) {
      return null
    }

    const nextPosition =
      tournaments.reduce((max, tournament) => Math.max(max, tournament.position), 0) + 1
    const archivedCopy = createArchivedCopy(activeTournament, nextPosition, 'reset')
    const resetTournament = {
      ...resetTournamentProgress(activeTournament),
      updatedBy: session.userId,
    }

    const result = await tournamentsStore.saveItems(sequenceTournamentNames([
      ...tournaments.filter((entry) => entry.id !== activeTournament.id),
      archivedCopy,
      resetTournament,
    ]))

    return result.ok ? resetTournament : null
  }

  const goBackToPreviousRound = () =>
    updateActiveTournament((tournament) => reopenPreviousRound(tournament))

  const removeLatestRound = () =>
    updateActiveTournament((tournament) => {
      if (tournament.format === 'marioKart') {
        const latestActiveRound = [...tournament.rounds]
          .sort((left, right) => right.roundNumber - left.roundNumber)
          .find((round) => round.status === 'draft')

        return latestActiveRound
          ? deleteLatestEmptyMarioKartLobby(
              tournament,
              latestActiveRound.roundNumber,
            )
          : tournament
      }

      return deleteLatestRound(tournament)
    })

  const updateMarioKartLobbyReservation = (playerIds: string[] | null) =>
    updateActiveTournament((tournament) =>
      setMarioKartLobbyReservation(tournament, playerIds),
    )

  const setResult = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) =>
    updateActiveTournament((tournament) =>
      updateResult(tournament, roundNumber, pairingId, result),
    )

  const setMarioKartResult = (
    roundNumber: number,
    pairingId: string,
    playerId: string,
    partial: { placement?: number; event?: boolean },
  ) =>
    updateActiveTournament((tournament) =>
      updateMarioKartResult(tournament, roundNumber, pairingId, playerId, partial),
    )

  const correctMarioKartLobby = (
    roundNumber: number,
    racers: Array<{
      playerId: string
      placement?: number
      event?: boolean
    }>,
  ) =>
    updateActiveTournament((tournament) =>
      correctClosedMarioKartLobby(tournament, roundNumber, racers),
    )

  const correctPairingResult = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) =>
    updateActiveTournament((tournament) =>
      correctResult(tournament, roundNumber, pairingId, result),
    )

  const exportStandingsCsv = (tournament = activeTournament) => {
    if (!tournament) {
      return
    }

    downloadText(
      `${sanitizeDownloadName(tournament.name)}-rangliste.csv`,
      standingsToCsv(recalculateStandings(tournament), tournament.format),
      'text/csv;charset=utf-8',
    )
  }

  const marioKartPlanningAvailability = activeTournament
    ? getMarioKartPlanningAvailability(activeTournament)
    : null

  return {
    activeTournament,
    addManualHandBrainPairing,
    addManualPairing,
    addPlayer,
    archivedTournaments,
    changePlayerStatus,
    completeRound,
    correctMarioKartLobby,
    correctResult: correctPairingResult,
    createNewTournament,
    deleteTournament,
    deleteLatestRound: removeLatestRound,
    error: stateStore.error ?? tournamentsStore.error ?? session.error,
    exportStandingsCsv,
    generateRound,
    goBackToPreviousRound,
    isLoading: stateStore.isLoading || tournamentsStore.isLoading,
    isPending: stateStore.isPending || tournamentsStore.isPending,
    isRealtime: stateStore.isRealtime && tournamentsStore.isRealtime,
    marioKartPlanningAvailability,
    regenerateRound,
    removeManualPairing,
    removePlayer,
    resetTournament,
    selectTournament,
    session,
    setMarioKartResult,
    setMarioKartLobbyReservation: updateMarioKartLobbyReservation,
    setResult,
    setRoundByeScore,
    standings,
    tournaments,
    updatePlayer,
    updateSettings,
    updateTournamentMeta,
  }
}
