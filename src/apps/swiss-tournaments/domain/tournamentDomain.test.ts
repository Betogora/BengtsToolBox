import { describe, expect, it } from 'vitest'

import {
  makeRound,
  makeStandardPairing,
  makeTournament,
} from '@/apps/swiss-tournaments/__tests__/fixtures'
import { tournamentDomain } from './tournamentDomain'

describe('tournamentDomain decisions', () => {
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

  it('requires confirmation before a historical correction regenerates the draft', () => {
    const completedRound = makeRound(1, [
      makeStandardPairing('completed-game', 1, 'p1', 'p2', '1-0'),
    ])
    const emptyDraft = makeRound(
      2,
      [makeStandardPairing('draft-game', 2, 'p3', 'p4')],
      'draft',
    )
    const tournament = makeTournament('swiss', 4, {
      currentRound: 2,
      rounds: [completedRound, emptyDraft],
    })
    const command = {
      type: 'result.correct' as const,
      roundNumber: 1,
      pairingId: 'completed-game',
      result: '0-1' as const,
    }
    const preview = tournamentDomain.transition(tournament, { command })

    expect(preview.status).toBe('confirmation-required')
    if (preview.status !== 'confirmation-required') {
      throw new Error('Bestätigung erwartet')
    }

    const applied = tournamentDomain.transition(tournament, preview.retry)
    expect(applied.status).toBe('changed')
    if (applied.status === 'changed') {
      expect(applied.effects).toContain('current-draft-regenerated')
      expect(
        applied.tournament.rounds[0].pairings[0].result,
      ).toBe('0-1')
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
