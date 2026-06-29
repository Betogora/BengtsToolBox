import { useMemo } from 'react'

import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
  SchlagDenRaabPlayerId,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const regularGameCount = 15
const winningScore = 60

const defaultPlayers: SchlagDenRaabPlayer[] = [
  {
    id: 'player-1',
    name: 'Paul',
    position: 1,
  },
  {
    id: 'player-2',
    name: 'Sven',
    position: 2,
  },
]

const defaultGames: SchlagDenRaabGame[] = Array.from(
  { length: regularGameCount },
  (_, index) => {
    const position = index + 1

    return {
      id: `game-${position}`,
      position,
      title:
        position === 1
          ? 'Dummy Game 1'
          : position === 2
            ? 'Dummy Game 2'
            : `Spiel ${position}`,
      points: position,
      winnerId: null,
    }
  },
)

const defaultTiebreakGame: SchlagDenRaabGame = {
  id: 'game-16',
  position: 16,
  title: 'Spiel 16 - Stechen',
  points: 16,
  winnerId: null,
}

const initialScoreboardState: SchlagDenRaabState = {
  players: defaultPlayers,
  games: defaultGames,
  tiebreak: null,
  archivedDatasets: [],
}

function isPlayerId(value: unknown): value is SchlagDenRaabPlayerId {
  return value === 'player-1' || value === 'player-2'
}

function sanitizeName(name: string, fallback: string) {
  return name.trim() || fallback
}

function normalizePlayer(
  player: Partial<SchlagDenRaabPlayer> | undefined,
  fallback: SchlagDenRaabPlayer,
): SchlagDenRaabPlayer {
  return {
    ...fallback,
    name: sanitizeName(player?.name ?? '', fallback.name),
  }
}

function normalizeGame(
  game: Partial<SchlagDenRaabGame> | undefined,
  fallback: SchlagDenRaabGame,
): SchlagDenRaabGame {
  return {
    ...fallback,
    title: sanitizeName(game?.title ?? '', fallback.title),
    winnerId: isPlayerId(game?.winnerId) ? game.winnerId : null,
  }
}

function normalizeState(state: SchlagDenRaabState): SchlagDenRaabState {
  const players = defaultPlayers.map((player) =>
    normalizePlayer(
      state.players?.find((entry) => entry.id === player.id),
      player,
    ),
  )
  const games = defaultGames.map((game) =>
    normalizeGame(
      state.games?.find((entry) => entry.id === game.id),
      game,
    ),
  )
  const tiebreak = state.tiebreak
    ? normalizeGame(state.tiebreak, defaultTiebreakGame)
    : null

  return {
    ...initialScoreboardState,
    ...state,
    players,
    games,
    tiebreak,
    archivedDatasets: (state.archivedDatasets ?? []).map((dataset, index) =>
      normalizeArchivedDataset(dataset, index),
    ),
  }
}

function normalizeArchivedDataset(
  dataset: Partial<SchlagDenRaabArchivedDataset>,
  index: number,
): SchlagDenRaabArchivedDataset {
  const archivedPlayers = defaultPlayers.map((player) =>
    normalizePlayer(
      dataset.players?.find((entry) => entry.id === player.id),
      player,
    ),
  )

  return {
    id: dataset.id?.trim() || `archive-${index + 1}`,
    name: sanitizeName(dataset.name ?? '', 'Archivierter Datensatz'),
    archivedAtClientIso: dataset.archivedAtClientIso || new Date(0).toISOString(),
    position: Number.isFinite(Number(dataset.position))
      ? Number(dataset.position)
      : index + 1,
    players: archivedPlayers,
    games: defaultGames.map((game) =>
      normalizeGame(
        dataset.games?.find((entry) => entry.id === game.id),
        game,
      ),
    ),
    tiebreak: dataset.tiebreak
      ? normalizeGame(dataset.tiebreak, defaultTiebreakGame)
      : null,
  }
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

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `Datensatz ${year}-${month}-${day} ${hours}:${minutes}`
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

export function useSchlagDenRaabScoreboard(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.schlagDenRaabState(sessionId),
    [sessionId],
  )
  const store = useFirestoreDoc<SchlagDenRaabState>(
    statePath,
    initialScoreboardState,
  )
  const state = useMemo(() => normalizeState(store.data), [store.data])
  const visibleTiebreak = summaryNeedsVisibleTiebreak(state)
    ? state.tiebreak ?? defaultTiebreakGame
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

    if (gameId === defaultTiebreakGame.id) {
      const tiebreak = state.tiebreak ?? defaultTiebreakGame

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

    if (gameId === defaultTiebreakGame.id) {
      const tiebreak = state.tiebreak ?? defaultTiebreakGame

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

    return saveState({
      ...initialScoreboardState,
      players: state.players,
      archivedDatasets: [archive, ...archivedDatasets],
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
      archivedDatasets: (state.archivedDatasets ?? []).filter(
        (dataset) => dataset.id !== datasetId,
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
