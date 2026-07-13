import { useEffect, useMemo } from 'react'

import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabPlayerId,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'
import {
  defaultSchlagDenRaabTiebreak,
  initialSchlagDenRaabState,
  normalizeSchlagDenRaabState,
} from '@/apps/schlag-den-raab/scoreboardState'
import {
  formatHistoricalDatasetName,
  getGeneratedDatasetBaseName,
  sequenceHistoricalRecordNames,
} from '@/apps/shared/historicalRecordNames'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const winningScore = 60

function sanitizeName(name: string, fallback: string) {
  return name.trim() || fallback
}

function emptyPlayerNumberMap() {
  return {
    'player-1': 0,
    'player-2': 0,
  } satisfies Record<SchlagDenRaabPlayerId, number>
}

function createArchiveId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? `archive-${crypto.randomUUID()}`
    : `archive-${Date.now()}-${Math.random().toString(16).slice(2)}`
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

export function getSchlagDenRaabSummary({
  games,
  players,
  tiebreak,
}: Pick<SchlagDenRaabState, 'games' | 'players' | 'tiebreak'>) {
  const regularScores = emptyPlayerNumberMap()

  games.forEach((game) => {
    if (game.winnerId) {
      regularScores[game.winnerId] += game.points
    }
  })

  const isRegularComplete = games.every((game) => game.winnerId)
  const isTiebreakRequired =
    isRegularComplete && regularScores['player-1'] === regularScores['player-2']
  const visibleGames =
    isTiebreakRequired && tiebreak ? [...games, tiebreak] : games
  const scores = emptyPlayerNumberMap()
  const wins = emptyPlayerNumberMap()
  const rows = visibleGames.map((game) => {
    if (game.winnerId) {
      scores[game.winnerId] += game.points
      wins[game.winnerId] += 1
    }

    return {
      game,
      scoresAfterGame: { ...scores },
      winsAfterGame: { ...wins },
    }
  })
  const totalScores = rows.at(-1)?.scoresAfterGame ?? emptyPlayerNumberMap()
  const gameWins = rows.at(-1)?.winsAfterGame ?? emptyPlayerNumberMap()
  const tiebreakWinnerId =
    isTiebreakRequired && tiebreak?.winnerId ? tiebreak.winnerId : null
  const leadingPlayerId =
    totalScores['player-1'] > totalScores['player-2']
      ? 'player-1'
      : totalScores['player-2'] > totalScores['player-1']
        ? 'player-2'
        : null
  const winnerId =
    tiebreakWinnerId ??
    (leadingPlayerId && totalScores[leadingPlayerId] > winningScore
      ? leadingPlayerId
      : null)
  const outcome = isTiebreakRequired && !tiebreakWinnerId
    ? {
        status: 'tiebreak' as const,
        label: 'Stechen erforderlich',
      }
    : winnerId
      ? {
          status: 'winner' as const,
          label: `${players.find((player) => player.id === winnerId)?.name ?? 'Spieler'} gewinnt den Abend`,
        }
      : {
          status: 'open' as const,
          label: 'Abend offen',
        }

  return {
    gameWins,
    isTiebreakRequired,
    outcome,
    rows,
    totalScores,
    winnerId,
  }
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
      store.isLoading ||
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
      id: createArchiveId(),
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
    error: store.error,
    gameWins: summary.gameWins,
    isLoading: store.isLoading,
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

function summaryNeedsVisibleTiebreak(state: SchlagDenRaabState) {
  const scores = emptyPlayerNumberMap()

  state.games.forEach((game) => {
    if (game.winnerId) {
      scores[game.winnerId] += game.points
    }
  })

  return (
    state.games.every((game) => game.winnerId) &&
    scores['player-1'] === scores['player-2']
  )
}
