import { describe, expect, it } from 'vitest'
import { deleteApp, initializeApp } from 'firebase/app'
import { doc, getFirestore, writeBatch } from 'firebase/firestore'

import {
  makeMarioKartPairing,
  makeRound,
  makeStandardPairing,
  makeTournament,
} from '@/apps/swiss-tournaments/__tests__/fixtures'
import type { MarioKartRacer } from '@/apps/swiss-tournaments/types'
import { tournamentDomain } from './tournamentDomain'

describe('tournamentDomain decisions', () => {
  it('resets progress and scheduling metadata without values rejected by Firestore', async () => {
    const tournament = makeTournament('swiss', 4, {
      currentRound: 2,
      rounds: [
        makeRound(1, [makeStandardPairing('game', 1, 'p1', 'p2', '1-0')]),
        makeRound(2, [makeStandardPairing('draft', 2, 'p3', 'p4')], 'draft'),
      ],
    })
    tournament.marioKartLobbyReservation = { playerIds: ['p1', 'p2'] }
    tournament.players = tournament.players.map((player, index) => ({
      ...player,
      status: index === 0 ? 'withdrawn' : player.status,
      addedInRound: index + 1,
      statusOverrides: { 3: 'inactive' },
    }))
    const result = tournamentDomain.transition(tournament, { command: { type: 'tournament.reset-progress' } })
    expect(result.status).toBe('changed')
    if (result.status !== 'changed') throw new Error('Zurücksetzen erwartet')
    const reset = result.tournament
    expect(reset.currentRound).toBe(0)
    expect(reset.rounds).toEqual([])
    expect(reset.marioKartLobbyReservation).toBeUndefined()
    expect(reset.players.every((player) =>
      player.status === 'active' && player.addedInRound === 1,
    )).toBe(true)
    for (const player of reset.players) {
      expect(player).not.toHaveProperty('statusOverrides')
    }
    const app = initializeApp({ projectId: 'reset-regression-test' }, 'reset-regression-test')
    try {
      const db = getFirestore(app)
      expect(() => writeBatch(db).set(doc(db, 'test/reset'), result.tournament)).not.toThrow()
    } finally {
      await deleteApp(app)
    }
  })

  it('updates existing draft byes and their score when the round override changes', () => {
    const bye = { ...makeStandardPairing('bye', 1, 'p1', 'p2'), isBye: true, byePlayerId: 'p3', result: 'bye-1' as const }
    const tournament = makeTournament('swiss', 3, {
      currentRound: 1,
      rounds: [makeRound(1, [makeStandardPairing('game', 1, 'p1', 'p2', '1-0'), bye], 'draft')],
    })
    const result = tournamentDomain.transition(tournament, { command: { type: 'round-bye-score.set', roundNumber: 1, byeScore: 0.5 } })
    expect(result.status).toBe('changed')
    if (result.status !== 'changed') return
    expect(result.tournament.rounds[0].pairings[1].result).toBe('bye-0.5')
    expect(tournamentDomain.inspect(result.tournament).standings.find((entry) => entry.playerId === 'p3')?.points).toBe(0.5)
  })

  it('returns unchanged with the original normalized reference for an idempotent command', () => {
    const tournament = tournamentDomain.inspect(makeTournament()).tournament
    const decision = tournamentDomain.transition(tournament, {
      command: {
        type: 'tournament.configure',
        changes: { name: tournament.name },
      },
    })

    expect(decision).toEqual({ status: 'unchanged', tournament })
    expect(decision.tournament).toBe(tournament)
  })

  it('returns changed without mutating its input', () => {
    const tournament = tournamentDomain.inspect(makeTournament()).tournament
    const before = structuredClone(tournament)
    const decision = tournamentDomain.transition(tournament, {
      command: { type: 'player.add', name: 'Neu', rating: 1500.4 },
    })

    expect(decision.status).toBe('changed')
    expect(tournament).toEqual(before)
    if (decision.status === 'changed') {
      expect(decision.tournament.players).toContainEqual(
        expect.objectContaining({ name: 'Neu', rating: 1500 }),
      )
    }
  })

  it('rejects a command whose subject does not exist', () => {
    const tournament = makeTournament()
    const decision = tournamentDomain.transition(tournament, {
      command: { type: 'player.remove', playerId: 'missing' },
    })

    expect(decision).toEqual({
      status: 'rejected',
      tournament,
      issues: [{ code: 'not-found', subject: 'player' }],
    })
  })
})

describe('tournamentDomain progress', () => {
  it('distinguishes scored drafts from officially completed regular rounds', () => {
    const tournament = makeTournament('swiss', 4, {
      numberOfRounds: 3,
      currentRound: 2,
      rounds: [
        makeRound(1, [makeStandardPairing('first', 1, 'p1', 'p2', '1-0')]),
        makeRound(
          2,
          [makeStandardPairing('second', 2, 'p3', 'p4', '0.5-0.5')],
          'draft',
        ),
      ],
    })

    expect(tournamentDomain.inspect(tournament).progress).toEqual({
      completedUnitCount: 2,
      completionRoundNumber: null,
      currentUnitCount: 2,
      isComplete: false,
      minimumEditableUnitCount: 2,
      minimumSavableUnitCount: 1,
    })
  })

  it('marks a regular tournament complete at its configured round count', () => {
    const tournament = makeTournament('swiss', 2, {
      numberOfRounds: 2,
      currentRound: 2,
      rounds: [
        makeRound(1, [makeStandardPairing('first', 1, 'p1', 'p2', '1-0')]),
        makeRound(2, [makeStandardPairing('second', 2, 'p1', 'p2', '0-1')]),
      ],
    })

    expect(tournamentDomain.inspect(tournament).progress.isComplete).toBe(true)
  })

  it('measures Mario Kart progress by races played by every active racer', () => {
    const completedRacers = [
      { playerId: 'p1', scoringCycleNumber: 1, placement: 1 },
      { playerId: 'p2', scoringCycleNumber: 1, placement: 2 },
      { playerId: 'p3', scoringCycleNumber: 1, placement: 3 },
      { playerId: 'p4', scoringCycleNumber: 1, placement: 4 },
    ]
    const openRacers = completedRacers.map((racer) => ({
      playerId: racer.playerId,
      scoringCycleNumber: 2,
    }))
    const tournament = makeTournament('marioKart', 4, {
      numberOfRounds: 2,
      currentRound: 2,
      rounds: [
        makeRound(1, [makeMarioKartPairing('first', 1, completedRacers)]),
        makeRound(
          2,
          [makeMarioKartPairing('second', 2, openRacers, 2)],
          'draft',
        ),
      ],
    })

    expect(tournamentDomain.inspect(tournament).progress).toEqual({
      completedUnitCount: 1,
      completionRoundNumber: null,
      currentUnitCount: 2,
      isComplete: false,
      minimumEditableUnitCount: 1,
      minimumSavableUnitCount: 1,
    })
  })

  it('normalizes legacy racers without an explicit scoring cycle', () => {
    const legacyRacers = [1, 2, 3, 4].map((placement, index) => ({
      playerId: `p${index + 1}`,
      placement,
    })) as MarioKartRacer[]
    const tournament = makeTournament('marioKart', 4, {
      numberOfRounds: 1,
      currentRound: 1,
      rounds: [
        makeRound(1, [makeMarioKartPairing('legacy', 1, legacyRacers, 1)]),
      ],
    })

    expect(tournamentDomain.inspect(tournament).progress).toMatchObject({
      completedUnitCount: 1,
      completionRoundNumber: 1,
      isComplete: true,
      minimumSavableUnitCount: 1,
    })
  })
})
