import { useEffect, useMemo } from 'react'

import {
  tournamentDomain,
  type TournamentCommand,
  type TournamentNoticeCode,
} from '@/apps/swiss-tournaments/domain/tournamentDomain'
import { sequenceTournamentNames } from '@/apps/swiss-tournaments/historicalNames'
import type {
  ByeScore,
  CreateTournamentInput,
  GameResult,
  HandBrainSide,
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
    () =>
      tournamentsStore.data.map(
        (tournament) => tournamentDomain.inspect(tournament).tournament,
      ),
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
  const inspection = useMemo(
    () => (activeTournament ? tournamentDomain.inspect(activeTournament) : null),
    [activeTournament],
  )
  const standings = inspection?.standings ?? []

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
    const tournament = tournamentDomain.create(input, nextPosition)
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

  const commitCommand = async (
    command: TournamentCommand,
    acknowledged?: readonly TournamentNoticeCode[],
  ) => {
    if (!activeTournament) {
      return null
    }

    const decision = tournamentDomain.transition(activeTournament, {
      command,
      acknowledged,
    })

    if (decision.status !== 'changed') {
      return decision
    }

    const result = await saveTournament(decision.tournament)
    return result.ok ? decision : null
  }

  const updateTournamentMeta = (partial: Partial<Tournament>) =>
    commitCommand({
      type: 'tournament.configure',
      changes: {
        name: partial.name,
        numberOfRounds: partial.numberOfRounds,
      },
    })

  const updateSettings = (partial: Partial<Tournament['settings']>) =>
    commitCommand({
      type: 'tournament.configure',
      changes: { settings: partial },
    })

  const setRoundByeScore = (roundNumber: number, byeScore: ByeScore) =>
    commitCommand({ type: 'round-bye-score.set', roundNumber, byeScore })

  const addPlayer = (name: string, rating?: number) =>
    commitCommand({ type: 'player.add', name, rating })

  const removePlayer = (playerId: string) =>
    commitCommand({ type: 'player.remove', playerId })

  const updatePlayer = (
    playerId: string,
    partial: { name?: string; rating?: number },
  ) =>
    commitCommand({ type: 'player.update', playerId, changes: partial })

  const changePlayerStatus = (
    playerId: string,
    status: PlayerStatus,
    fromRound?: number,
  ) =>
    commitCommand({
      type: 'player.set-status',
      playerId,
      status,
      fromRound,
    })

  const generateRound = () =>
    commitCommand({ type: 'round.plan-next' })

  const regenerateRound = () =>
    commitCommand({ type: 'round.regenerate-latest' })

  const addManualPairing = (
    roundNumber: number,
    whitePlayerId: string,
    blackPlayerId: string,
  ) =>
    commitCommand({
      type: 'pairing.pin',
      roundNumber,
      assignment: { kind: 'standard', whitePlayerId, blackPlayerId },
    })

  const addManualHandBrainPairing = (
    roundNumber: number,
    handBrainSides: {
      white: HandBrainSide
      black: HandBrainSide
    },
  ) =>
    commitCommand({
      type: 'pairing.pin',
      roundNumber,
      assignment: { kind: 'handAndBrain', sides: handBrainSides },
    })

  const removeManualPairing = (roundNumber: number, pairingId: string) =>
    commitCommand({ type: 'pairing.unpin', roundNumber, pairingId })

  const completeRound = (roundNumber: number) =>
    commitCommand({ type: 'round.complete', roundNumber })

  const resetTournament = async () => {
    if (!activeTournament) {
      return null
    }

    const nextPosition =
      tournaments.reduce((max, tournament) => Math.max(max, tournament.position), 0) + 1
    const archivedCopy = createArchivedCopy(activeTournament, nextPosition, 'reset')
    const decision = tournamentDomain.transition(activeTournament, {
      command: { type: 'tournament.reset-progress' },
    })

    if (decision.status !== 'changed') {
      return null
    }

    const resetTournament = {
      ...decision.tournament,
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
    commitCommand({ type: 'round.reopen-previous' })

  const removeLatestRound = () =>
    commitCommand({ type: 'round.delete-latest' })

  const updateMarioKartLobbyReservation = (playerIds: string[] | null) =>
    commitCommand({
      type: 'mario-kart.reserve-next-lobby',
      playerIds,
    })

  const setResult = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) =>
    commitCommand({
      type: 'result.set',
      roundNumber,
      pairingId,
      result,
    })

  const setMarioKartResult = (
    roundNumber: number,
    pairingId: string,
    playerId: string,
    partial: { placement?: number; event?: boolean },
  ) =>
    commitCommand({
      type: 'mario-kart.set-racer',
      roundNumber,
      pairingId,
      playerId,
      changes: partial,
    })

  const correctMarioKartLobby = (
    roundNumber: number,
    racers: Array<{
      playerId: string
      placement?: number
      event?: boolean
    }>,
  ) =>
    commitCommand({
      type: 'mario-kart.correct-lobby',
      roundNumber,
      racers,
    })

  const correctPairingResult = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) =>
    commitCommand(
      { type: 'result.correct', roundNumber, pairingId, result },
      ['correction-regenerates-current-draft'],
    )

  const shouldConfirmResultCorrection = (
    roundNumber: number,
    pairingId: string,
    result?: GameResult,
  ) => {
    if (!activeTournament) {
      return false
    }

    return (
      tournamentDomain.transition(activeTournament, {
        command: { type: 'result.correct', roundNumber, pairingId, result },
      }).status === 'confirmation-required'
    )
  }

  const exportStandingsCsv = (tournament = activeTournament) => {
    if (!tournament) {
      return
    }

    downloadText(
      `${sanitizeDownloadName(tournament.name)}-rangliste.csv`,
      tournamentDomain.inspect(tournament).standingsCsv,
      'text/csv;charset=utf-8',
    )
  }

  const marioKartPlanningAvailability = inspection?.planning ?? null

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
    inspection,
    inspectTournament: tournamentDomain.inspect,
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
    shouldConfirmResultCorrection,
    standings,
    tournaments,
    updatePlayer,
    updateSettings,
    updateTournamentMeta,
  }
}
