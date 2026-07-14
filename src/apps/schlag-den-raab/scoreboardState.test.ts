import { describe, expect, it } from 'vitest'

import { getSchlagDenRaabSummary } from '@/apps/schlag-den-raab/hooks/useSchlagDenRaabScoreboard'
import {
  defaultSchlagDenRaabTiebreak,
  initialSchlagDenRaabState,
  normalizeSchlagDenRaabState,
} from '@/apps/schlag-den-raab/scoreboardState'
import type {
  SchlagDenRaabArchivedDataset,
  SchlagDenRaabState,
} from '@/apps/schlag-den-raab/types'

function withGameTitles(
  titles: Partial<Record<string, string>>,
): SchlagDenRaabState {
  return {
    ...initialSchlagDenRaabState,
    players: initialSchlagDenRaabState.players.map((player) => ({ ...player })),
    games: initialSchlagDenRaabState.games.map((game) => ({
      ...game,
      title: titles[game.id] ?? game.title,
    })),
  }
}

function archiveFromState(
  state: SchlagDenRaabState,
): SchlagDenRaabArchivedDataset {
  return {
    id: 'archive-1',
    name: 'Testabend',
    archivedAtClientIso: '2026-07-13T18:00:00.000Z',
    position: 1,
    players: state.players,
    games: state.games,
    tiebreak: state.tiebreak,
  }
}

describe('Schlag den Raab scoreboard state', () => {
  it('provides 15 canonical games without placeholder titles', () => {
    expect(initialSchlagDenRaabState.games).toHaveLength(15)
    expect(initialSchlagDenRaabState.games[0]?.title).toBe('Spiel 1')
    expect(initialSchlagDenRaabState.games[1]?.title).toBe('Spiel 2')
    expect(initialSchlagDenRaabState.games[14]?.title).toBe('Spiel 15')
  })

  it('migrates exact legacy titles while preserving the remaining game data', () => {
    const state = withGameTitles({
      'game-1': ' Dummy Game 1 ',
      'game-2': 'Dummy Game 2',
    })
    state.games[0] = {
      ...state.games[0]!,
      winnerId: 'player-2',
    }

    const normalized = normalizeSchlagDenRaabState(state)

    expect(normalized.games[0]).toMatchObject({
      id: 'game-1',
      points: 1,
      title: 'Spiel 1',
      winnerId: 'player-2',
    })
    expect(normalized.games[1]?.title).toBe('Spiel 2')
  })

  it('applies the legacy migration to archived games', () => {
    const state = withGameTitles({
      'game-1': 'Dummy Game 1',
      'game-2': 'Dummy Game 2',
    })
    state.archivedDatasets = [archiveFromState(state)]

    const archivedGames = normalizeSchlagDenRaabState(state)
      .archivedDatasets?.[0]?.games

    expect(archivedGames?.[0]?.title).toBe('Spiel 1')
    expect(archivedGames?.[1]?.title).toBe('Spiel 2')
  })

  it('preserves custom titles and legacy text in unrelated game slots', () => {
    const normalized = normalizeSchlagDenRaabState(
      withGameTitles({
        'game-1': 'Quiz',
        'game-2': 'Geschicklichkeit',
        'game-3': 'Dummy Game 1',
      }),
    )

    expect(normalized.games[0]?.title).toBe('Quiz')
    expect(normalized.games[1]?.title).toBe('Geschicklichkeit')
    expect(normalized.games[2]?.title).toBe('Dummy Game 1')
  })

  it('uses canonical titles for blank or missing games', () => {
    const state = withGameTitles({})
    state.games = state.games
      .filter((game) => game.id !== 'game-2')
      .map((game) =>
        game.id === 'game-1' ? { ...game, title: '   ' } : game,
      )

    const normalized = normalizeSchlagDenRaabState(state)

    expect(normalized.games[0]?.title).toBe('Spiel 1')
    expect(normalized.games[1]?.title).toBe('Spiel 2')
  })

  it('is idempotent', () => {
    const once = normalizeSchlagDenRaabState(
      withGameTitles({
        'game-1': 'Dummy Game 1',
        'game-2': 'Eigener Titel',
      }),
    )

    expect(normalizeSchlagDenRaabState(once)).toEqual(once)
  })

  it('uses the tiebreak only to decide the winner', () => {
    const playerOneWins = new Set([4, 5, 6, 7, 8, 9, 10, 11])
    const games = initialSchlagDenRaabState.games.map((game) => ({
      ...game,
      winnerId: playerOneWins.has(game.position)
        ? ('player-1' as const)
        : ('player-2' as const),
    }))
    const summary = getSchlagDenRaabSummary({
      games,
      players: initialSchlagDenRaabState.players,
      tiebreak: {
        ...defaultSchlagDenRaabTiebreak,
        points: 16,
        winnerId: 'player-2',
      },
    })

    expect(summary.totalScores).toEqual({ 'player-1': 60, 'player-2': 60 })
    expect(summary.gameWins).toEqual({ 'player-1': 8, 'player-2': 7 })
    expect(summary.rows).toHaveLength(16)
    expect(summary.rows.at(-1)?.scoresAfterGame).toEqual({
      'player-1': 60,
      'player-2': 60,
    })
    expect(summary.rows.at(-1)?.winsAfterGame).toEqual({
      'player-1': 8,
      'player-2': 7,
    })
    expect(summary.winnerId).toBe('player-2')
  })
})
