import { describe, expect, it } from 'vitest'

import {
  makeTournament,
  pairingKey,
  planNextTournamentRound,
} from '@/apps/swiss-tournaments/__tests__/fixtures'
import type { Pairing, Tournament } from '@/apps/swiss-tournaments/types'

function completeNextRound(tournament: Tournament, roundNumber: number) {
  const planned = planNextTournamentRound(tournament)
  const pairings = (planned.rounds.at(-1)?.pairings ?? []).map((pairing) =>
    pairing.isBye ? pairing : { ...pairing, result: '1-0' as const },
  )

  return {
    tournament: {
      ...planned,
      currentRound: roundNumber,
      rounds: planned.rounds.map((round) =>
        round.roundNumber === roundNumber
          ? { ...round, pairings, status: 'completed' as const }
          : round,
      ),
    },
    pairings,
  }
}

function playRounds(tournament: Tournament, roundCount: number) {
  const rounds: Pairing[][] = []
  let current = tournament

  for (let roundNumber = 1; roundNumber <= roundCount; roundNumber += 1) {
    const next = completeNextRound(current, roundNumber)
    current = next.tournament
    rounds.push(next.pairings)
  }

  return { tournament: current, rounds }
}

describe('Round Robin golden cases', () => {
  it('schedules every pairing exactly once for four players', () => {
    const tournament = makeTournament('roundRobin', 4)
    const { rounds } = playRounds(tournament, 3)
    const games = rounds.flat().filter((pairing) => !pairing.isBye)

    expect(tournament.numberOfRounds).toBe(3)
    expect(rounds.map((round) => round.length)).toEqual([2, 2, 2])
    expect(new Set(games.map(pairingKey))).toEqual(
      new Set(['p1::p2', 'p1::p3', 'p1::p4', 'p2::p3', 'p2::p4', 'p3::p4']),
    )
  })

  it('gives every player one bye in a five-player cycle', () => {
    const { rounds } = playRounds(makeTournament('roundRobin', 5), 5)

    expect(
      rounds.map((round) => round.find((pairing) => pairing.isBye)?.byePlayerId).sort(),
    ).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(rounds.every((round) => round.length === 3)).toBe(true)
  })

  it('repeats every pairing with inverted colors in a second cycle', () => {
    const tournament = makeTournament('roundRobin', 4, {
      numberOfRounds: 6,
      settings: {
        initialSeedingMode: 'random',
        byeScore: 1,
        byePolicy: 'protectLateEntrants',
        roundRobinCycles: 2,
      },
    })
    const { rounds } = playRounds(tournament, 6)
    const gamesByPair = new Map<string, Pairing[]>()

    rounds.flat().forEach((pairing) => {
      const key = pairingKey(pairing)
      gamesByPair.set(key, [...(gamesByPair.get(key) ?? []), pairing])
    })

    expect([...gamesByPair.values()].every((games) => games.length === 2)).toBe(true)
    gamesByPair.forEach(([first, second]) => {
      expect(second.whitePlayerId).toBe(first.blackPlayerId)
      expect(second.blackPlayerId).toBe(first.whitePlayerId)
    })
  })
})
