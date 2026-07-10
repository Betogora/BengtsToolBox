import { describe, expect, it } from 'vitest'

import {
  addPlayerAfterStart,
  canRemovePlayerFromTournament,
  correctResult,
  deleteLatestRound,
  getCurrentDraftRound,
  isPairingComplete,
  removePlayerFromTournament,
  reopenPreviousRound,
  resetTournamentProgress,
  setPlayerStatus,
  updateResult,
  upsertRound,
  willResultCorrectionRegenerateCurrentDraftRound,
} from '@/apps/swiss-tournaments/logic'
import {
  makeRound,
  makeStandardPairing,
  makeTournament,
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

  return upsertRound(tournament, 2, [manualPairing])
}

describe('tournament lifecycle', () => {
  it('recognizes byes, results and open games through the common interface', () => {
    expect(
      isPairingComplete({
        ...makeStandardPairing('bye', 1, 'p1', 'p2'),
        isBye: true,
        byePlayerId: 'p3',
      }),
    ).toBe(true)
    expect(isPairingComplete(makeStandardPairing('done', 1, 'p1', 'p2', '0.5-0.5'))).toBe(
      true,
    )
    expect(isPairingComplete(makeStandardPairing('open', 1, 'p1', 'p2'))).toBe(false)
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
    const updated = updateResult(tournament, 1, 'draft-game', '1-0')
    const completedTournament = {
      ...tournament,
      rounds: [{ ...draft, status: 'completed' as const }],
    }

    expect(updated.rounds[0].pairings[0].result).toBe('1-0')
    expect(updateResult(completedTournament, 1, 'draft-game', '0-1')).toBe(
      completedTournament,
    )
  })

  it('corrects an old result and regenerates only the unscored current draft', () => {
    const tournament = tournamentWithUnscoredDraft()

    expect(
      willResultCorrectionRegenerateCurrentDraftRound(
        tournament,
        1,
        'completed-game',
        '0-1',
      ),
    ).toBe(true)

    const corrected = correctResult(tournament, 1, 'completed-game', '0-1')
    const currentDraft = getCurrentDraftRound(corrected)

    expect(corrected.rounds[0].pairings[0].result).toBe('0-1')
    expect(currentDraft?.pairings).toContainEqual(
      expect.objectContaining({ id: 'manual-game', isManual: true }),
    )
    expect(currentDraft?.pairings.every((pairing) => !pairing.result)).toBe(true)
  })

  it('regenerates pairings after status changes only while the draft is unscored', () => {
    const tournament = tournamentWithUnscoredDraft()
    const inactive = setPlayerStatus(tournament, 'p1', 'inactive')
    const inactiveDraftIds = getCurrentDraftRound(inactive)?.pairings.flatMap(
      (pairing) => [pairing.whitePlayerId, pairing.blackPlayerId].filter(Boolean),
    )
    const scoredDraft = updateResult(
      tournament,
      2,
      getCurrentDraftRound(tournament)?.pairings[0].id ?? '',
      '1-0',
    )
    const pairingsBeforeStatusChange = getCurrentDraftRound(scoredDraft)?.pairings
    const changedAfterScore = setPlayerStatus(scoredDraft, 'p1', 'inactive')

    expect(inactiveDraftIds).not.toContain('p1')
    expect(getCurrentDraftRound(changedAfterScore)?.pairings).toEqual(
      pairingsBeforeStatusChange,
    )
  })

  it('adds players to the current draft and protects players from played rounds', () => {
    const tournament = tournamentWithUnscoredDraft()
    const withNewPlayer = addPlayerAfterStart(tournament, '  New Player  ', 1500.7)
    const addedPlayer = withNewPlayer.players.find((player) => player.name === 'New Player')

    expect(addedPlayer).toEqual(
      expect.objectContaining({ rating: 1501, addedInRound: 2, status: 'active' }),
    )
    expect(canRemovePlayerFromTournament(tournament, 'p1')).toBe(false)
    expect(canRemovePlayerFromTournament(tournament, 'p4')).toBe(true)
    expect(removePlayerFromTournament(tournament, 'p1')).toBe(tournament)
    expect(removePlayerFromTournament(tournament, 'p4').players.map((player) => player.id)).not.toContain(
      'p4',
    )
  })

  it('resets all progress and player scheduling metadata', () => {
    const tournament = tournamentWithUnscoredDraft()
    const changed = {
      ...tournament,
      players: tournament.players.map((player, index) => ({
        ...player,
        status: index === 0 ? ('withdrawn' as const) : player.status,
        addedInRound: index + 1,
        statusOverrides: { 3: 'inactive' as const },
      })),
    }
    const reset = resetTournamentProgress(changed)

    expect(reset.currentRound).toBe(0)
    expect(reset.rounds).toEqual([])
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
    const reopened = reopenPreviousRound(tournament)
    const deleted = deleteLatestRound(tournament)

    expect(reopened.currentRound).toBe(1)
    expect(reopened.rounds).toHaveLength(1)
    expect(reopened.rounds[0].status).toBe('draft')
    expect(deleted.currentRound).toBe(1)
    expect(deleted.rounds).toHaveLength(1)
    expect(deleted.rounds[0].status).toBe('draft')
  })
})
