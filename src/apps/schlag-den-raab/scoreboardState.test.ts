import { describe, expect, it } from 'vitest'

import {
  defaultSchlagDenRaabTiebreak,
  getSchlagDenRaabSummary,
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
  // Each case also covers archived games and idempotence of the migration.
  it.each([
    [
      'migrates exact legacy titles',
      { 'game-1': ' Dummy Game 1 ', 'game-2': 'Dummy Game 2' },
      ['Spiel 1', 'Spiel 2'],
    ],
    [
      'preserves custom titles and legacy text in unrelated game slots',
      { 'game-1': 'Quiz', 'game-2': 'Geschicklichkeit', 'game-3': 'Dummy Game 1' },
      ['Quiz', 'Geschicklichkeit', 'Dummy Game 1'],
    ],
  ])('%s while preserving the remaining game data', (_case, titles, expectedTitles) => {
    const state = withGameTitles(titles)
    state.games[0] = {
      ...state.games[0]!,
      winnerId: 'player-2',
    }
    state.archivedDatasets = [archiveFromState(state)]

    const normalized = normalizeSchlagDenRaabState(state)

    for (const games of [normalized.games, normalized.archivedDatasets?.[0]?.games]) {
      expect(games?.slice(0, expectedTitles.length).map(({ title }) => title)).toEqual(
        expectedTitles,
      )
      expect(games?.[0]).toMatchObject({
        id: 'game-1',
        points: 1,
        winnerId: 'player-2',
      })
    }
    expect(normalizeSchlagDenRaabState(normalized)).toEqual(normalized)
  })

  it('uses canonical titles for blank or missing games', () => {
    expect(initialSchlagDenRaabState.games).toHaveLength(15)
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
