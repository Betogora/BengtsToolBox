import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
  SchlagDenRaabPlayerId,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'

const regularGameCount = 15

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
