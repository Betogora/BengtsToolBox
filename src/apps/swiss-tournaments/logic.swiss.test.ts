import { describe, expect, it } from 'vitest'

import {
  createTournament,
  generatePairings,
  recalculateStandings,
} from '@/apps/swiss-tournaments/logic'
import {
  makeRound,
  makeStandardPairing,
  makeTournament,
  pairingKey,
} from '@/apps/swiss-tournaments/__tests__/fixtures'

describe('Swiss tournament golden cases', () => {
  it('sanitizes tournament input and seeds rated players deterministically', () => {
    const tournament = createTournament(
      {
        name: '  Club Cup  ',
        format: 'swiss',
        numberOfRounds: 3.9,
        players: [
          { name: '  Ada  ', rating: 1799.7 },
          { name: ' ', rating: 2500 },
          { name: 'Berta', rating: 2100 },
          { name: 'Carla' },
        ],
        initialSeedingMode: 'rating',
        byeScore: 1,
      },
      2,
    )

    expect(tournament.name).toBe('Club Cup')
    expect(tournament.numberOfRounds).toBe(3)
    expect(tournament.position).toBe(2)
    expect(tournament.players.map(({ name, rating, initialSeed }) => ({
      name,
      rating,
      initialSeed,
    }))).toEqual([
      { name: 'Berta', rating: 2100, initialSeed: 1 },
      { name: 'Ada', rating: 1800, initialSeed: 2 },
      { name: 'Carla', rating: undefined, initialSeed: 3 },
    ])
    expect(tournament.players.every((player) => player.id.startsWith('player-'))).toBe(true)
  })

  it('pairs the upper and lower halves in the first round', () => {
    const pairings = generatePairings(makeTournament('swiss', 8), 1)

    expect(pairings.filter((pairing) => !pairing.isBye).map(pairingKey)).toEqual([
      'p1::p5',
      'p2::p6',
      'p3::p7',
      'p4::p8',
    ])
  })

  it('assigns a fair bye and avoids repeats when another pairing is possible', () => {
    const tournament = makeTournament('swiss', 5)
    const firstPairings = generatePairings(tournament, 1)
    const firstBye = firstPairings.find((pairing) => pairing.isBye)
    const completedFirstRound = firstPairings.map((pairing) =>
      pairing.isBye ? pairing : { ...pairing, result: '1-0' as const },
    )
    const afterRoundOne = {
      ...tournament,
      currentRound: 1,
      rounds: [makeRound(1, completedFirstRound)],
    }
    const secondPairings = generatePairings(afterRoundOne, 2)
    const previousKeys = new Set(
      completedFirstRound.filter((pairing) => !pairing.isBye).map(pairingKey),
    )

    expect(firstBye?.byePlayerId).toBe('p5')
    expect(secondPairings.find((pairing) => pairing.isBye)?.byePlayerId).not.toBe('p5')
    expect(
      secondPairings
        .filter((pairing) => !pairing.isBye)
        .every((pairing) => !previousKeys.has(pairingKey(pairing))),
    ).toBe(true)
  })

  it('marks an unavoidable repeat as a hard fallback', () => {
    const tournament = makeTournament('swiss', 2, {
      currentRound: 1,
      rounds: [
        makeRound(1, [makeStandardPairing('r1-p1', 1, 'p1', 'p2', '1-0')]),
      ],
    })
    const [repeat] = generatePairings(tournament, 2)

    expect(pairingKey(repeat)).toBe('p1::p2')
    expect(repeat.warnings).toContainEqual(
      expect.objectContaining({ id: 'non-fide-fallback', severity: 'hard' }),
    )
  })

  it('orders a known result table by the established tie-break sequence', () => {
    const tournament = makeTournament('swiss', 4, {
      currentRound: 3,
      rounds: [
        makeRound(1, [
          makeStandardPairing('r1-a', 1, 'p1', 'p2', '1-0'),
          makeStandardPairing('r1-b', 1, 'p3', 'p4', '1-0'),
        ]),
        makeRound(2, [
          makeStandardPairing('r2-a', 2, 'p1', 'p3', '1-0'),
          makeStandardPairing('r2-b', 2, 'p2', 'p4', '1-0'),
        ]),
        makeRound(3, [
          makeStandardPairing('r3-a', 3, 'p4', 'p1', '1-0'),
          makeStandardPairing('r3-b', 3, 'p3', 'p2', '1-0'),
        ]),
      ],
    })

    expect(recalculateStandings(tournament).map((row) => row.playerId)).toEqual([
      'p1',
      'p3',
      'p4',
      'p2',
    ])
  })
})
