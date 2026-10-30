import { useEffect, useMemo } from 'react'

import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabPlayerId,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'
import {
  defaultSchlagDenRaabTiebreak,
  getSchlagDenRaabSummary,
  initialSchlagDenRaabState,
  normalizeSchlagDenRaabState,
  summaryNeedsVisibleTiebreak,
} from '@/apps/schlag-den-raab/scoreboardState'
import {
  formatHistoricalDatasetName,
  getGeneratedDatasetBaseName,
  sequenceHistoricalRecordNames,
} from '@/apps/shared/historicalRecordNames'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

function sanitizeName(name: string, fallback: string) {
  return name.trim() || fallback
}

function formatArchiveDatasetName(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Datensatz'
  }

  return formatHistoricalDatasetName(date)
}

function sequenceArchiveNames(datasets: SchlagDenRaabArchivedDataset[]) {
  return sequenceHistoricalRecordNames(datasets, {
    getGeneratedBaseName: (dataset, date) =>
      getGeneratedDatasetBaseName(dataset.name, date),
    getTimestamp: (dataset) => dataset.archivedAtClientIso,
  })
}

export function useSchlagDenRaabScoreboard(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.schlagDenRaabState(activeLobbyId),
    [activeLobbyId],
  )
  const store = useFirestoreDoc<SchlagDenRaabState>(
    statePath,
    initialSchlagDenRaabState,
  )
  const storedState = useMemo(
    () => normalizeSchlagDenRaabState(store.data),
    [store.data],
  )
  const state = useMemo(
    () => ({
      ...storedState,
      archivedDatasets: sequenceArchiveNames(storedState.archivedDatasets ?? []),
    }),
    [storedState],
  )
  const visibleTiebreak = summaryNeedsVisibleTiebreak(state)
    ? state.tiebreak ?? defaultSchlagDenRaabTiebreak
    : state.tiebreak

  const summary = useMemo(
    () =>
      getSchlagDenRaabSummary({
        games: state.games,
        players: state.players,
        tiebreak: visibleTiebreak,
      }),
    [state.games, state.players, visibleTiebreak],
  )

  useEffect(() => {
    if (
      store.isLoading || !store.hasServerSnapshot ||
      store.isPending ||
      (store.error && (!store.isRealtime || store.error.source !== 'local-storage')) ||
      !state.archivedDatasets?.some(
        (dataset, index) =>
          dataset.name !== storedState.archivedDatasets?.[index]?.name,
      )
    ) {
      return
    }

    void store.save({
      ...state,
      updatedBy: session.userId,
    })
  }, [session.userId, state, store, storedState.archivedDatasets])

  const saveState = (nextState: SchlagDenRaabState) =>
    store.save({
      ...nextState,
      updatedBy: session.userId,
    })

  const setWinner = (gameId: string, winnerId: SchlagDenRaabPlayerId) => {
    const regularGame = state.games.find((game) => game.id === gameId)

    if (regularGame) {
      return saveState({
        ...state,
        games: state.games.map((game) =>
          game.id === gameId
            ? {
                ...game,
                winnerId: game.winnerId === winnerId ? null : winnerId,
              }
            : game,
        ),
      })
    }

    if (gameId === defaultSchlagDenRaabTiebreak.id) {
      const tiebreak = state.tiebreak ?? defaultSchlagDenRaabTiebreak

      return saveState({
        ...state,
        tiebreak: {
          ...tiebreak,
          winnerId: tiebreak.winnerId === winnerId ? null : winnerId,
        },
      })
    }

    return Promise.resolve()
  }

  const updatePlayerName = (playerId: SchlagDenRaabPlayerId, name: string) =>
    saveState({
      ...state,
      players: state.players.map((player) =>
        player.id === playerId
          ? {
              ...player,
              name: sanitizeName(name, player.name),
            }
          : player,
      ),
    })

  const updateGameTitle = (gameId: string, title: string) => {
    const regularGame = state.games.find((game) => game.id === gameId)

    if (regularGame) {
      return saveState({
        ...state,
        games: state.games.map((game) =>
          game.id === gameId
            ? {
                ...game,
                title: sanitizeName(title, game.title),
              }
            : game,
        ),
      })
    }

    if (gameId === defaultSchlagDenRaabTiebreak.id) {
      const tiebreak = state.tiebreak ?? defaultSchlagDenRaabTiebreak

      return saveState({
        ...state,
        tiebreak: {
          ...tiebreak,
          title: sanitizeName(title, tiebreak.title),
        },
      })
    }

    return Promise.resolve()
  }

  const resetEvening = () => {
    const now = new Date().toISOString()
    const archivedDatasets = state.archivedDatasets ?? []
    const archivePosition =
      archivedDatasets.reduce(
        (max, dataset) => Math.max(max, dataset.position),
        0,
      ) + 1
    const archive: SchlagDenRaabArchivedDataset = {
      id: `archive-${createRandomId()}`,
      name: formatArchiveDatasetName(now),
      archivedAtClientIso: now,
      position: archivePosition,
      players: state.players,
      games: state.games,
      tiebreak: state.tiebreak,
    }
    const nextArchivedDatasets = sequenceArchiveNames([
      archive,
      ...archivedDatasets,
    ])

    return saveState({
      ...initialSchlagDenRaabState,
      players: state.players,
      archivedDatasets: nextArchivedDatasets,
    })
  }

  const updateArchivedDatasetName = (datasetId: string, name: string) =>
    saveState({
      ...state,
      archivedDatasets: (state.archivedDatasets ?? []).map((dataset) =>
        dataset.id === datasetId
          ? {
              ...dataset,
              name: sanitizeName(name, 'Archivierter Datensatz'),
            }
          : dataset,
      ),
    })

  const deleteArchivedDataset = (datasetId: string) =>
    saveState({
      ...state,
      archivedDatasets: sequenceArchiveNames(
        (state.archivedDatasets ?? []).filter(
          (dataset) => dataset.id !== datasetId,
        ),
      ),
    })

  return {
    archivedDatasets: state.archivedDatasets ?? [],
    deleteArchivedDataset,
    error: store.error ?? session.error,
    gameWins: summary.gameWins,
    isLoading: store.isLoading,
    isPending: store.isPending,
    isRealtime: store.isRealtime,
    isTiebreakRequired: summary.isTiebreakRequired,
    outcome: summary.outcome,
    players: state.players,
    resetEvening,
    rows: summary.rows,
    setWinner,
    totalScores: summary.totalScores,
    updateArchivedDatasetName,
    updateGameTitle,
    updatePlayerName,
    winnerId: summary.winnerId,
  }
}
