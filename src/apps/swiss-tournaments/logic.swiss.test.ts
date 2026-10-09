import { describe, expect, it } from 'vitest'

import type { Pairing } from '@/apps/swiss-tournaments/types'
import { tournamentDomain } from '@/apps/swiss-tournaments/domain/tournamentDomain'
import {
  makeRound,
  makeStandardPairing,
  makeTournament,
  pairingKey,
  planNextTournamentPairings,
} from '@/apps/swiss-tournaments/__tests__/fixtures'

describe('Swiss tournament golden cases', () => {
  it('finds a complete pairing when one player needs the eleventh candidate', () => {
    const tournament = makeTournament('swiss', 12, { numberOfRounds: 11, currentRound: 10 })
    tournament.rounds = Array.from({ length: 10 }, (_, index) => {
      const number = index + 1
      const opponent = `p${index + 2}`
      const game = makeStandardPairing(`game-${number}`, number, 'p12', opponent, '0.5-0.5')
      const byes: Pairing[] = tournament.players
        .filter((player) => player.id !== 'p12' && player.id !== opponent)
        .map((player) => ({ id: `bye-${number}-${player.id}`, roundNumber: number, boardNumber: 2, isManual: false, isBye: true, byePlayerId: player.id, result: 'bye-0.5' }))
      return makeRound(number, [game, ...byes])
    })
    const pairings = planNextTournamentPairings(tournament)
    expect(pairings).toHaveLength(6)
    expect(pairings.map(pairingKey)).toContain('p1::p12')
    expect(new Set(pairings.flatMap((pairing) => [pairing.whitePlayerId, pairing.blackPlayerId])).size).toBe(12)
  })

  it('sanitizes tournament input and seeds rated players deterministically', () => {
    const tournament = tournamentDomain.create(
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
    const pairings = planNextTournamentPairings(makeTournament('swiss', 8))

    expect(pairings.filter((pairing) => !pairing.isBye).map(pairingKey)).toEqual([
      'p1::p5',
      'p2::p6',
      'p3::p7',
      'p4::p8',
    ])
  })

  it.each([
    [12, false, ['p1/p2', 'p3/p4', 'p7/p5', 'p9/p6', 'p8/p10', 'p11/p12']],
    [16, false, ['p12/p1', 'p11/p2', 'p3/p4', 'p5/p8', 'p6/p7', 'p9/p15', 'p10/p14', 'p13/p16']],
    [12, true, ['p1/p2', 'p3/p4', 'p5/p6', 'p7/p8', 'p9/p10', 'p11/p12']],
    [11, false, ['p11/p1', 'p2/p3', 'p4/p5', 'p6/p7', 'p8/p9']],
  ] as const)('preserves tied-score pairings and colors for %i players (equal seeds: %s)',
    (playerCount, equalSeeds, expectedPairs) => {
      const tournament = makeTournament('swiss', playerCount, { numberOfRounds: 5 })
      if (equalSeeds) {
        tournament.players = tournament.players.map((player) => ({ ...player, initialSeed: 1 }))
      }
      const firstPairings = planNextTournamentPairings(tournament)
      const pairings = planNextTournamentPairings({
        ...tournament,
        currentRound: 1,
        rounds: [makeRound(1, firstPairings.map((pairing) =>
          pairing.isBye ? pairing : { ...pairing, result: '0.5-0.5' },
        ))],
      })

      expect(pairings.filter((pairing) => !pairing.isBye).map((pairing) =>
        `${pairing.whitePlayerId}/${pairing.blackPlayerId}`,
      )).toEqual(expectedPairs)
      expect(pairings.find((pairing) => pairing.isBye)?.byePlayerId)
        .toBe(playerCount === 11 ? 'p10' : undefined)
      expect(pairings.flatMap((pairing) => pairing.warnings ?? []).map((warning) => warning.id))
        .toEqual(playerCount === 11 ? ['forced-floater'] : [])
    },
  )

  it('assigns a fair bye and avoids repeats when another pairing is possible', () => {
    const tournament = makeTournament('swiss', 5)
    const firstPairings = planNextTournamentPairings(tournament)
    const firstBye = firstPairings.find((pairing) => pairing.isBye)
    const completedFirstRound = firstPairings.map((pairing) =>
      pairing.isBye ? pairing : { ...pairing, result: '1-0' as const },
    )
    const afterRoundOne = {
      ...tournament,
      currentRound: 1,
      rounds: [makeRound(1, completedFirstRound)],
    }
    const secondPairings = planNextTournamentPairings(afterRoundOne)
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
    const [repeat] = planNextTournamentPairings(tournament)

    expect(pairingKey(repeat)).toBe('p1::p2')
    expect(repeat.warnings).toContainEqual(
      expect.objectContaining({ id: 'non-fide-fallback', severity: 'hard' }),
    )
  })

  it('preserves the fallback when non-repeat opponents form two odd-sized groups', () => {
    const tournament = makeTournament('swiss', 6, {
      numberOfRounds: 4,
      currentRound: 3,
      rounds: Array.from({ length: 3 }, (_, roundIndex) => makeRound(
        roundIndex + 1,
        Array.from({ length: 3 }, (_, playerIndex) => makeStandardPairing(
          `r${roundIndex}-${playerIndex}`,
          roundIndex + 1,
          `p${playerIndex + 1}`,
          `p${4 + (playerIndex + roundIndex) % 3}`,
          '0.5-0.5',
        )),
      )),
    })
    const pairings = planNextTournamentPairings(tournament)

    expect(pairings.map((pairing) => [pairing.whitePlayerId, pairing.blackPlayerId]))
      .toEqual([['p1', 'p2'], ['p6', 'p3'], ['p4', 'p5']])
    expect(pairings[1].warnings).toContainEqual(
      expect.objectContaining({ id: 'non-fide-fallback', severity: 'hard' }),
    )
  })

  it('covers more than 32 players when only one non-repeat matching remains', () => {
    const tournament = makeTournament('swiss', 36, { numberOfRounds: 35, currentRound: 34 })
    let slots = [...tournament.players]
    tournament.rounds = Array.from({ length: 34 }, (_, roundIndex) => {
      const pairings = Array.from({ length: 18 }, (_, boardIndex) => makeStandardPairing(
        `r${roundIndex}-${boardIndex}`,
        roundIndex + 1,
        slots[boardIndex].id,
        slots[35 - boardIndex].id,
        '0.5-0.5',
      ))
      slots = [slots[0], slots.at(-1)!, ...slots.slice(1, -1)]
      return makeRound(roundIndex + 1, pairings)
    })

    expect(planNextTournamentPairings(tournament).map(pairingKey)).toEqual(
      Array.from({ length: 18 }, (_, index) =>
        (index === 0 ? ['p1', 'p2'] : [`p${index + 2}`, `p${37 - index}`]).sort().join('::'),
      ),
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

    expect(
      tournamentDomain.inspect(tournament).standings.map((row) => row.playerId),
    ).toEqual([
      'p1',
      'p3',
      'p4',
      'p2',
    ])
  })

  it('keeps an unscored draft out of the standings until its first game result', () => {
    const firstRoundBye = {
      id: 'r1-bye',
      roundNumber: 1,
      boardNumber: 3,
      kind: 'standard',
      result: 'bye-1',
      isManual: false,
      isBye: true,
      byePlayerId: 'p5',
    } satisfies Pairing
    const secondRoundBye = {
      ...firstRoundBye,
      id: 'r2-bye',
      roundNumber: 2,
      byePlayerId: 'p4',
    } satisfies Pairing
    const firstRound = makeRound(1, [
      makeStandardPairing('r1-a', 1, 'p1', 'p2', '1-0'),
      makeStandardPairing('r1-b', 1, 'p3', 'p4', '1-0'),
      firstRoundBye,
    ])
    const secondRoundPairings = [
      makeStandardPairing('r2-a', 2, 'p1', 'p5'),
      makeStandardPairing('r2-b', 2, 'p2', 'p3'),
      secondRoundBye,
    ]
    const tournament = makeTournament('swiss', 5, {
      currentRound: 2,
      rounds: [firstRound],
    })
    const standingsByPlayer = (pairings: Pairing[]) =>
      Object.fromEntries(
        tournamentDomain
          .inspect({
            ...tournament,
            rounds: [firstRound, makeRound(2, pairings, 'draft')],
          })
          .standings.map((row) => [
            row.playerId,
            { points: row.points, buchholz: row.buchholz },
          ]),
      )

    expect(standingsByPlayer(secondRoundPairings)).toEqual({
      p1: { points: 1, buchholz: 0 },
      p2: { points: 0, buchholz: 1 },
      p3: { points: 1, buchholz: 0 },
      p4: { points: 0, buchholz: 1 },
      p5: { points: 1, buchholz: 0 },
    })

    expect(
      standingsByPlayer([
        { ...secondRoundPairings[0], result: '1-0' },
        ...secondRoundPairings.slice(1),
      ]),
    ).toEqual({
      p1: { points: 2, buchholz: 1 },
      p2: { points: 0, buchholz: 3 },
      p3: { points: 1, buchholz: 1 },
      p4: { points: 1, buchholz: 1 },
      p5: { points: 1, buchholz: 2 },
    })
  })
})
