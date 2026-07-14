import { describe, expect, it } from 'vitest'

import { tournamentDomain } from '@/apps/swiss-tournaments/domain/tournamentDomain'
import {
  applyTournamentCommand,
  makeRound,
  makeStandardPairing,
  makeTournament,
  planNextTournamentRound,
} from '@/apps/swiss-tournaments/__tests__/fixtures'

function tournamentWithUnscoredDraft() {
  const completedRound = makeRound(1, [
    makeStandardPairing('completed-game', 1, 'p1', 'p2', '1-0'),
  ])
  const tournament = makeTournament('swiss', 4, {
    currentRound: 1,
    rounds: [completedRound],
  })
  const manualPairing = {
    ...makeStandardPairing('manual-game', 2, 'p3', 'p4'),
    isManual: true,
  }

  const planned = planNextTournamentRound(tournament)

  return applyTournamentCommand(planned, {
    type: 'pairing.pin',
    roundNumber: 2,
    assignment: {
      kind: 'standard',
      whitePlayerId: manualPairing.whitePlayerId!,
      blackPlayerId: manualPairing.blackPlayerId!,
    },
  })
}

describe('tournament lifecycle', () => {
  it('recognizes byes, results and open games through the common interface', () => {
    const tournament = makeTournament('swiss', 2, {
      rounds: [makeRound(1, [
        {
        ...makeStandardPairing('bye', 1, 'p1', 'p2'),
        isBye: true,
        byePlayerId: 'p3',
        },
        makeStandardPairing('done', 1, 'p1', 'p2', '0.5-0.5'),
        makeStandardPairing('open', 1, 'p1', 'p2'),
      ], 'draft')],
    })
    const inspection = tournamentDomain.inspect(tournament)

    expect(inspection.pairings.get('bye')?.isComplete).toBe(true)
    expect(inspection.pairings.get('done')?.isComplete).toBe(true)
    expect(inspection.pairings.get('open')?.isComplete).toBe(false)
  })

  it('updates results only in the latest draft round', () => {
    const draft = makeRound(
      1,
      [makeStandardPairing('draft-game', 1, 'p1', 'p2')],
      'draft',
    )
    const tournament = makeTournament('swiss', 2, {
      currentRound: 1,
      rounds: [draft],
    })
    const updated = applyTournamentCommand(tournament, {
      type: 'result.set',
      roundNumber: 1,
      pairingId: 'draft-game',
      result: '1-0',
    })
    const completedTournament = {
      ...tournament,
      rounds: [{ ...draft, status: 'completed' as const }],
    }

    expect(updated.rounds[0].pairings[0].result).toBe('1-0')
    const decision = tournamentDomain.transition(completedTournament, {
        command: {
          type: 'result.set',
          roundNumber: 1,
          pairingId: 'draft-game',
          result: '0-1',
        },
      })
    expect(decision.status).toBe('unchanged')
    expect(decision.tournament).toBe(completedTournament)
  })

  it('corrects an old result and regenerates only the unscored current draft', () => {
    const tournament = tournamentWithUnscoredDraft()

    const preview = tournamentDomain.transition(tournament, {
      command: {
        type: 'result.correct',
        roundNumber: 1,
        pairingId: 'completed-game',
        result: '0-1',
      },
    })
    expect(preview.status).toBe('confirmation-required')

    const corrected = applyTournamentCommand(tournament, {
      type: 'result.correct',
      roundNumber: 1,
      pairingId: 'completed-game',
      result: '0-1',
    })
    const currentDraft = tournamentDomain.inspect(corrected).currentDraftRound

    expect(corrected.rounds[0].pairings[0].result).toBe('0-1')
    expect(currentDraft?.pairings).toContainEqual(
      expect.objectContaining({ isManual: true }),
    )
    expect(currentDraft?.pairings.every((pairing) => !pairing.result)).toBe(true)
  })

  it('regenerates pairings after status changes only while the draft is unscored', () => {
    const tournament = tournamentWithUnscoredDraft()
    const inactive = applyTournamentCommand(tournament, {
      type: 'player.set-status',
      playerId: 'p1',
      status: 'inactive',
    })
    const inactiveDraftIds = tournamentDomain.inspect(inactive).currentDraftRound?.pairings.flatMap(
      (pairing) => [pairing.whitePlayerId, pairing.blackPlayerId].filter(Boolean),
    )
    const draftPairingId = tournamentDomain.inspect(tournament).currentDraftRound?.pairings[0].id ?? ''
    const scoredDraft = applyTournamentCommand(tournament, {
      type: 'result.set',
      roundNumber: 2,
      pairingId: draftPairingId,
      result: '1-0',
    })
    const pairingsBeforeStatusChange = tournamentDomain.inspect(scoredDraft).currentDraftRound?.pairings
    const changedAfterScore = applyTournamentCommand(scoredDraft, {
      type: 'player.set-status',
      playerId: 'p1',
      status: 'inactive',
    })

    expect(inactiveDraftIds).not.toContain('p1')
    expect(tournamentDomain.inspect(changedAfterScore).currentDraftRound?.pairings).toEqual(
      pairingsBeforeStatusChange,
    )
  })

  it('allows every current player status to be reversed', () => {
    let tournament = makeTournament('swiss', 4)

    tournament = applyTournamentCommand(tournament, { type: 'player.set-status', playerId: 'p1', status: 'withdrawn' })
    tournament = applyTournamentCommand(tournament, { type: 'player.set-status', playerId: 'p1', status: 'inactive' })
    tournament = applyTournamentCommand(tournament, { type: 'player.set-status', playerId: 'p1', status: 'active' })

    expect(tournament.players.find((player) => player.id === 'p1')?.status).toBe(
      'active',
    )
  })

  it('adds players to the current draft and protects players from played rounds', () => {
    const tournament = tournamentWithUnscoredDraft()
    const withNewPlayer = applyTournamentCommand(tournament, {
      type: 'player.add',
      name: '  New Player  ',
      rating: 1500.7,
    })
    const addedPlayer = withNewPlayer.players.find((player) => player.name === 'New Player')

    expect(addedPlayer).toEqual(
      expect.objectContaining({ rating: 1501, addedInRound: 2, status: 'active' }),
    )
    expect(tournamentDomain.inspect(tournament).players.get('p1')?.canRemove).toBe(false)
    expect(tournamentDomain.inspect(tournament).players.get('p4')?.canRemove).toBe(true)
    expect(tournamentDomain.transition(tournament, {
      command: { type: 'player.remove', playerId: 'p1' },
    }).status).toBe('rejected')
    expect(applyTournamentCommand(tournament, {
      type: 'player.remove',
      playerId: 'p4',
    }).players.map((player) => player.id)).not.toContain(
      'p4',
    )
  })

  it('resets all progress and player scheduling metadata', () => {
    const tournament = tournamentWithUnscoredDraft()
    const changed = {
      ...tournament,
      marioKartLobbyReservation: { playerIds: ['p1', 'p2'] },
      players: tournament.players.map((player, index) => ({
        ...player,
        status: index === 0 ? ('withdrawn' as const) : player.status,
        addedInRound: index + 1,
        statusOverrides: { 3: 'inactive' as const },
      })),
    }
    const reset = applyTournamentCommand(changed, { type: 'tournament.reset-progress' })

    expect(reset.currentRound).toBe(0)
    expect(reset.rounds).toEqual([])
    expect(reset.marioKartLobbyReservation).toBeUndefined()
    expect(
      reset.players.every(
        (player) =>
          player.status === 'active' &&
          player.addedInRound === 1 &&
          player.statusOverrides === undefined,
      ),
    ).toBe(true)
  })

  it('reopens the previous round or deletes the latest round predictably', () => {
    const first = makeRound(1, [
      makeStandardPairing('first', 1, 'p1', 'p2', '1-0'),
    ])
    const second = makeRound(
      2,
      [makeStandardPairing('second', 2, 'p1', 'p2')],
      'draft',
    )
    const tournament = makeTournament('swiss', 2, {
      currentRound: 2,
      rounds: [first, second],
    })
    const reopened = applyTournamentCommand(tournament, { type: 'round.reopen-previous' })
    const deleted = applyTournamentCommand(tournament, { type: 'round.delete-latest' })

    expect(reopened.currentRound).toBe(1)
    expect(reopened.rounds).toHaveLength(1)
    expect(reopened.rounds[0].status).toBe('draft')
    expect(deleted.currentRound).toBe(1)
    expect(deleted.rounds).toHaveLength(1)
    expect(deleted.rounds[0].status).toBe('draft')
  })
})
