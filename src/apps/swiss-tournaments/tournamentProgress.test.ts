import { describe, expect, it } from 'vitest'

import { getTournamentProgress } from '@/apps/swiss-tournaments/tournamentProgress'
import {
  makeMarioKartPairing,
  makeRound,
  makeStandardPairing,
  makeTournament,
} from '@/apps/swiss-tournaments/__tests__/fixtures'

describe('getTournamentProgress', () => {
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

    expect(getTournamentProgress(tournament)).toEqual({
      completedUnitCount: 2,
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

    expect(getTournamentProgress(tournament).isComplete).toBe(true)
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

    expect(getTournamentProgress(tournament)).toEqual({
      completedUnitCount: 1,
      currentUnitCount: 2,
      isComplete: false,
      minimumEditableUnitCount: 1,
      minimumSavableUnitCount: 1,
    })
  })

})
