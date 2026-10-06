import { describe, expect, it } from 'vitest'

import {
  createScoreboardPlayer,
  getScoreboardHistory,
  getScoreboardStandings,
  getScoreboardTargets,
  hasTeamEvents,
  isValidScoreDelta,
  sortScoreboardPlayers,
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
  creditedTeamId?: string | null,
): ScoreboardScoreEvent {
  return {
    id,
    scoringId: 'scoring-1',
    targetType: targetId.startsWith('team') ? 'team' : 'player',
    targetId,
    targetName: targetId,
    targetColor: '#0D8E90',
    ...(targetId.startsWith('player') ? { creditedTeamId: creditedTeamId ?? null } : {}),
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

  it('projects personal and team scores and excludes undone player events', () => {
    const scoringEvents = [
      event('event-1', 'player-alex', 5, 1, 'team-one'),
      event('event-2', 'team-one', 2, 2),
      event('event-3', 'player-bela', -3, 3, 'team-two'),
    ]
    const playerStandings = getScoreboardStandings(
      getScoreboardTargets('individual', players, teams),
      scoringEvents,
    )
    const teamStandings = getScoreboardStandings(
      getScoreboardTargets('teams', players, teams),
      scoringEvents,
    )

    expect(playerStandings.map(({ target, score }) => [target.id, score])).toEqual([
      ['player-alex', 5],
      ['player-bela', -3],
    ])
    expect(teamStandings.map(({ target, score }) => [target.id, score])).toEqual([
      ['team-one', 7],
      ['team-three', 0],
      ['team-two', -3],
    ])
    expect(getScoreboardStandings(getScoreboardTargets('teams', players, teams), scoringEvents.slice(0, -1))
      .find(({ target }) => target.id === 'team-two')?.score).toBe(0)
  })

  it('moves player points with the current assignment and aligns history and deletion protection', () => {
    const teamEvents = [event('event-1', 'player-alex', 7, 1, 'team-one')]
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
    expect(after.find(({ target }) => target.id === 'team-one')?.score).toBe(0)
    expect(after.find(({ target }) => target.id === 'team-two')?.score).toBe(7)
    expect(hasTeamEvents(teamEvents, 'team-two', movedPlayers)).toBe(true)
    expect(hasTeamEvents(teamEvents, 'team-one', movedPlayers)).toBe(false)
    const history = getScoreboardHistory(
      [...teamEvents, event('event-2', 'team-two', 2, 2)],
      getScoreboardTargets('teams', movedPlayers, teams),
    )
    expect(history[0].resultingScore).toBe(9)
  })

  it('includes earlier unassigned points after late entry and assignment to a new team', () => {
    const latePlayer = { ...createScoreboardPlayer(players, () => 'late'), teamId: null }
    const roster = [...players, latePlayer]
    const scoringEvents = [event('event-1', latePlayer.id, 4, 1, null)]
    const teamStandings = getScoreboardStandings(getScoreboardTargets('teams', roster, teams), scoringEvents)
    expect(teamStandings.every(({ score }) => score === 0)).toBe(true)
    const newTeam = { ...teams[0], id: 'team-late', position: 4 }
    const updatedTeams = [...teams, newTeam]
    const assignedRoster = roster.map((player) => player.id === latePlayer.id
      ? { ...player, teamId: newTeam.id } : player)
    expect(getScoreboardStandings(getScoreboardTargets('teams', assignedRoster, updatedTeams), scoringEvents)
      .find(({ target }) => target.id === newTeam.id)?.score).toBe(4)
    expect(getScoreboardStandings(getScoreboardTargets('individual', assignedRoster, updatedTeams), scoringEvents)
      .find(({ target }) => target.id === latePlayer.id)?.score).toBe(4)
  })

  it('builds a latest-first history with personal and complete team totals', () => {
    const history = getScoreboardHistory([
      event('event-1', 'player-alex', 5, 1, 'team-one'),
      event('event-2', 'team-one', 2, 2),
      event('event-3', 'player-alex', -1, 3, 'team-one'),
    ], getScoreboardTargets('teams', players, teams))

    expect(history.map(({ event: entry, resultingScore }) => [entry.id, resultingScore])).toEqual([
      ['event-3', 4],
      ['event-2', 7],
      ['event-1', 5],
    ])
  })

  it('recognizes direct and player-attributed team events', () => {
    expect(hasTeamEvents([event('event-1', 'team-one', 1, 1)], 'team-one', players)).toBe(true)
    expect(
      hasTeamEvents(
        [event('event-2', 'player-alex', 1, 2, 'team-one')],
        'team-one',
        players,
      ),
    ).toBe(true)
    expect(
      hasTeamEvents([event('event-3', 'player-alex', 1, 3, null)], 'team-one', players),
    ).toBe(true)
  })

  it('sorts players by fixed team order, score, stable position, and unassigned last', () => {
    const roster: ScoreboardPlayer[] = [
      ...players,
      {
        id: 'player-cem',
        name: 'Cem',
        color: '#FAC889',
        position: 3,
        teamId: 'team-one',
      },
      {
        id: 'player-dana',
        name: 'Dana',
        color: '#91B6BE',
        position: 4,
        teamId: null,
      },
      {
        id: 'player-eli',
        name: 'Eli',
        color: '#B89ACB',
        position: 5,
        teamId: 'team-one',
      },
    ]
    const standings = getScoreboardStandings(
      getScoreboardTargets('individual', roster, teams),
      [
        event('event-1', 'player-alex', 2, 1, 'team-one'),
        event('event-2', 'player-cem', 5, 2, 'team-one'),
        event('event-3', 'player-bela', 9, 3, 'team-two'),
        event('event-4', 'player-dana', 12, 4, null),
        event('event-5', 'player-eli', 2, 5, 'team-one'),
      ],
    )

    expect(sortScoreboardPlayers(roster, teams, standings).map((player) => player.id)).toEqual([
      'player-cem',
      'player-alex',
      'player-eli',
      'player-bela',
      'player-dana',
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
