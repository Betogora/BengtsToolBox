import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
  SchlagDenRaabPlayerId,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'

const regularGameCount = 15
const winningScore = 60

const legacyDefaultGameTitles: Partial<Record<string, string>> = {
  'game-1': 'Dummy Game 1',
  'game-2': 'Dummy Game 2',
}

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
      title: `Spiel ${position}`,
      points: position,
      winnerId: null,
    }
  },
)

export const defaultSchlagDenRaabTiebreak: SchlagDenRaabGame = {
  id: 'game-16',
  position: 16,
  title: 'Spiel 16 - Stechen',
  points: 0,
  winnerId: null,
}

export const initialSchlagDenRaabState: SchlagDenRaabState = {
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

function emptyPlayerNumberMap() {
  return {
    'player-1': 0,
    'player-2': 0,
  } satisfies Record<SchlagDenRaabPlayerId, number>
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
  const title = sanitizeName(game?.title ?? '', fallback.title)

  return {
    ...fallback,
    title:
      title === legacyDefaultGameTitles[fallback.id] ? fallback.title : title,
    winnerId: isPlayerId(game?.winnerId) ? game.winnerId : null,
  }
}

function normalizeArchivedDataset(
  dataset: Partial<SchlagDenRaabArchivedDataset>,
  index: number,
): SchlagDenRaabArchivedDataset {
  return {
    id: dataset.id?.trim() || `archive-${index + 1}`,
    name: sanitizeName(dataset.name ?? '', 'Archivierter Datensatz'),
    archivedAtClientIso: dataset.archivedAtClientIso || new Date(0).toISOString(),
    position: Number.isFinite(Number(dataset.position))
      ? Number(dataset.position)
      : index + 1,
    players: defaultPlayers.map((player) =>
      normalizePlayer(
        dataset.players?.find((entry) => entry.id === player.id),
        player,
      ),
    ),
    games: defaultGames.map((game) =>
      normalizeGame(
        dataset.games?.find((entry) => entry.id === game.id),
        game,
      ),
    ),
    tiebreak: dataset.tiebreak
      ? normalizeGame(dataset.tiebreak, defaultSchlagDenRaabTiebreak)
      : null,
  }
}

export function normalizeSchlagDenRaabState(
  state: SchlagDenRaabState,
): SchlagDenRaabState {
  return {
    ...initialSchlagDenRaabState,
    ...state,
    players: defaultPlayers.map((player) =>
      normalizePlayer(
        state.players?.find((entry) => entry.id === player.id),
        player,
      ),
    ),
    games: defaultGames.map((game) =>
      normalizeGame(
        state.games?.find((entry) => entry.id === game.id),
        game,
      ),
    ),
    tiebreak: state.tiebreak
      ? normalizeGame(state.tiebreak, defaultSchlagDenRaabTiebreak)
      : null,
    archivedDatasets: (state.archivedDatasets ?? []).map((dataset, index) =>
      normalizeArchivedDataset(dataset, index),
    ),
  }
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
  const scores = emptyPlayerNumberMap()
  const wins = emptyPlayerNumberMap()
  const rows = games.map((game) => {
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
  if (isTiebreakRequired && tiebreak) {
    rows.push({
      game: tiebreak,
      scoresAfterGame: { ...scores },
      winsAfterGame: { ...wins },
    })
  }
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

export function summaryNeedsVisibleTiebreak(state: SchlagDenRaabState) {
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
