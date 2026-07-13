import { describe, expect, it } from 'vitest'

import {
  createScoreboardPlayer,
  getScoreboardHistory,
  getScoreboardStandings,
  getScoreboardTargets,
  isValidScoreDelta,
} from '@/apps/scoreboard/logic'
import type {
  ScoreboardPlayer,
  ScoreboardScoreEvent,
  ScoreboardTeam,
} from '@/apps/scoreboard/types'

const players: ScoreboardPlayer[] = [
  {
    id: 'player-alex',
    name: 'Alex',
    color: '#0D8E90',
    position: 1,
    teamId: 'team-one',
  },
  {
    id: 'player-bela',
    name: 'Bela',
    color: '#FD7261',
    position: 2,
    teamId: 'team-two',
  },
]

const teams: ScoreboardTeam[] = [
  { id: 'team-one', name: 'Team 1', color: '#0D8E90', position: 1 },
  { id: 'team-two', name: 'Team 2', color: '#FD7261', position: 2 },
  { id: 'team-three', name: 'Team 3', color: '#FAC889', position: 3 },
]

function event(
  id: string,
  targetId: string,
  delta: number,
  createdAtClientMs: number,
): ScoreboardScoreEvent {
  return {
    id,
    scoringId: 'scoring-1',
    targetType: targetId.startsWith('team') ? 'team' : 'player',
    targetId,
    targetName: targetId,
    targetColor: '#0D8E90',
    delta,
    createdAtClientIso: new Date(createdAtClientMs).toISOString(),
    createdAtClientMs,
  }
}

describe('scoreboard v2 logic', () => {
  it('creates name-independent player ids even when a position is reused', () => {
    const replacement = createScoreboardPlayer([players[0]], () => 'random-id')

    expect(replacement).toMatchObject({
      id: 'player-random-id',
      name: 'Spieler 2',
      position: 2,
      teamId: null,
    })
  })

  it('allows negative team scores and assigns shared competition ranks', () => {
    const targets = getScoreboardTargets('teams', players, teams)
    const standings = getScoreboardStandings(targets, [
      event('event-1', 'team-one', 4, 1),
      event('event-2', 'team-two', 4, 2),
      event('event-3', 'team-three', -2, 3),
    ])

    expect(standings.map(({ target, score, rank }) => [target.id, score, rank])).toEqual([
      ['team-one', 4, 1],
      ['team-two', 4, 1],
      ['team-three', -2, 3],
    ])
  })

  it('keeps team scores stable when a player changes teams', () => {
    const teamEvents = [event('event-1', 'team-one', 7, 1)]
    const before = getScoreboardStandings(
      getScoreboardTargets('teams', players, teams),
      teamEvents,
    )
    const movedPlayers = players.map((player) =>
      player.id === 'player-alex' ? { ...player, teamId: 'team-two' } : player,
    )
    const after = getScoreboardStandings(
      getScoreboardTargets('teams', movedPlayers, teams),
      teamEvents,
    )

    expect(before.find(({ target }) => target.id === 'team-one')?.score).toBe(7)
    expect(after.find(({ target }) => target.id === 'team-one')?.score).toBe(7)
  })

  it('builds a latest-first history with the resulting score per target', () => {
    const history = getScoreboardHistory([
      event('event-1', 'player-alex', 5, 1),
      event('event-2', 'player-bela', -2, 2),
      event('event-3', 'player-alex', -1, 3),
    ])

    expect(history.map(({ event: entry, resultingScore }) => [entry.id, resultingScore])).toEqual([
      ['event-3', 4],
      ['event-2', -2],
      ['event-1', 5],
    ])
  })

  it('accepts only non-zero whole-number deltas', () => {
    expect(isValidScoreDelta(10)).toBe(true)
    expect(isValidScoreDelta(-3)).toBe(true)
    expect(isValidScoreDelta(0)).toBe(false)
    expect(isValidScoreDelta(0.5)).toBe(false)
    expect(isValidScoreDelta(Number.NaN)).toBe(false)
  })
})
