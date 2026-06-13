import { useMemo } from 'react'

import {
  addPlayerAfterStart,
  createManualPairing,
  createTournament,
  getCurrentDraftRound,
  getNextAllowedRoundNumber,
  getRoundRobinRequiredRoundCount,
  recalculateStandings,
  removePlayerFromTournament,
  reopenPreviousRound,
  resetTournamentProgress,
  setPlayerStatus,
  standingsToCsv,
  updateResult,
  upsertRound,
} from '@/apps/swiss-tournaments/logic'
import type {
  ByeScore,
  CreateTournamentInput,
  GameResult,
  PlayerStatus,
  SwissTournamentsState,
  Tournament,
  TournamentArchiveReason,
} from '@/apps/swiss-tournaments/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const initialState: SwissTournamentsState = {
  activeTournamentId: null,
}

function sanitizeTournament(tournament: Tournament): Tournament {
  return {
    ...tournament,
    format: tournament.format ?? 'swiss',
    players: [...(tournament.players ?? [])].sort(
      (left, right) => left.initialSeed - right.initialSeed,
    ),
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

export function useSwissTournaments(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.swissTournamentsState(sessionId),
    [sessionId],
  )
  const tournamentsPath = useMemo(
    () => firebasePaths.swissTournamentsTournaments(sessionId),
    [sessionId],
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
  const tournaments = useMemo(
    () => tournamentsStore.data.map(sanitizeTournament),
    [tournamentsStore.data],
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

  const saveTournament = async (tournament: Tournament) => {
    await tournamentsStore.setItem(tournament.id, {
      ...tournament,
      updatedBy: session.userId,
    })
  }

  const createNewTournament = async (input: CreateTournamentInput) => {
    const nextPosition =
      tournaments.reduce((max, tournament) => Math.max(max, tournament.position), 0) + 1
    const tournament = createTournament(input, nextPosition)
    const archivePatch = createArchivePatch('newTournament')
    const nextTournaments = [
      ...tournaments.map((entry) =>
        entry.isArchived ? entry : { ...entry, ...archivePatch, updatedBy: session.userId },
      ),
      {
        ...tournament,
        updatedBy: session.userId,
      },
    ]

    await tournamentsStore.saveItems(nextTournaments)
    await stateStore.merge({
      activeTournamentId: tournament.id,
      updatedBy: session.userId,
    })

    return tournament
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

    await tournamentsStore.deleteItem(tournamentId)

    if (stateStore.data.activeTournamentId === tournamentId) {
      const nextTournament = activeTournaments.find((entry) => entry.id !== tournamentId)

      await stateStore.merge({
        activeTournamentId: nextTournament?.id ?? null,
        updatedBy: session.userId,
      })
    }
  }

  const updateActiveTournament = async (
    updater: (tournament: Tournament) => Tournament,
  ) => {
    if (!activeTournament) {
      return null
    }

    const nextTournament = updater(activeTournament)
    await saveTournament(nextTournament)

    return nextTournament
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
              highestCompletedRoundNumber(tournament),
              Math.floor(partial.numberOfRounds),
            )
          : tournament.numberOfRounds,
      }

      return nextTournament.format === 'roundRobin'
        ? {
            ...nextTournament,
            numberOfRounds: Math.max(
              tournament.rounds.length > 0 ? tournament.numberOfRounds : 1,
              nextTournament.numberOfRounds,
              getRoundRobinRequiredRoundCount(nextTournament),
            ),
          }
        : nextTournament
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
      const nextTournament = {
        ...tournament,
        settings: {
          ...tournament.settings,
          ...partial,
          roundRobinCycles,
        },
      }

      return nextTournament.format === 'roundRobin'
        ? {
            ...nextTournament,
            numberOfRounds: Math.max(
              nextTournament.numberOfRounds,
              getRoundRobinRequiredRoundCount(nextTournament),
            ),
          }
        : nextTournament
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
      players: tournament.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              name: partial.name?.trim() || player.name,
              rating:
                partial.rating === undefined || !Number.isFinite(partial.rating)
                  ? undefined
                  : Math.round(partial.rating),
            }
          : player,
      ),
    }))

  const changePlayerStatus = (
    playerId: string,
    status: PlayerStatus,
    fromRound?: number,
  ) =>
    updateActiveTournament((tournament) => {
      const nextTournament = setPlayerStatus(tournament, playerId, status, fromRound)

      return nextTournament.format === 'roundRobin'
        ? {
            ...nextTournament,
            numberOfRounds: Math.max(
              nextTournament.numberOfRounds,
              getRoundRobinRequiredRoundCount(nextTournament),
            ),
          }
        : nextTournament
    })

  const generateRound = () =>
    updateActiveTournament((tournament) => {
      const nextRoundNumber = getNextAllowedRoundNumber(tournament)

      return nextRoundNumber ? upsertRound(tournament, nextRoundNumber) : tournament
    })

  const regenerateRound = () =>
    updateActiveTournament((tournament) => {
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

      const fixedPairings = [
        ...(existing?.pairings.filter((pairing) => pairing.isManual) ?? []),
        createManualPairing(tournament, roundNumber, whitePlayerId, blackPlayerId),
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
        latestRound.pairings.some((pairing) => !pairing.isBye && !pairing.result)
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

    await tournamentsStore.saveItems([
      ...tournaments.filter((entry) => entry.id !== activeTournament.id),
      archivedCopy,
      resetTournament,
    ])

    return resetTournament
  }

  const goBackToPreviousRound = () =>
    updateActiveTournament((tournament) => reopenPreviousRound(tournament))

  const setResult = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) =>
    updateActiveTournament((tournament) =>
      updateResult(tournament, roundNumber, pairingId, result),
    )

  const exportStandingsCsv = (tournament = activeTournament) => {
    if (!tournament) {
      return
    }

    downloadText(
      `${sanitizeDownloadName(tournament.name)}-rangliste.csv`,
      standingsToCsv(recalculateStandings(tournament)),
      'text/csv;charset=utf-8',
    )
  }

  const exportTournamentJson = (tournament = activeTournament) => {
    if (!tournament) {
      return
    }

    downloadText(
      `${sanitizeDownloadName(tournament.name)}.json`,
      JSON.stringify(tournament, null, 2),
      'application/json;charset=utf-8',
    )
  }

  return {
    activeTournament,
    addManualPairing,
    addPlayer,
    archivedTournaments,
    changePlayerStatus,
    completeRound,
    createNewTournament,
    deleteTournament,
    error: stateStore.error ?? tournamentsStore.error,
    exportStandingsCsv,
    exportTournamentJson,
    generateRound,
    goBackToPreviousRound,
    isLoading: stateStore.isLoading || tournamentsStore.isLoading,
    isRealtime: stateStore.isRealtime && tournamentsStore.isRealtime,
    regenerateRound,
    removeManualPairing,
    removePlayer,
    resetTournament,
    selectTournament,
    session,
    setResult,
    setRoundByeScore,
    standings,
    tournaments,
    updatePlayer,
    updateSettings,
    updateTournamentMeta,
  }
}
