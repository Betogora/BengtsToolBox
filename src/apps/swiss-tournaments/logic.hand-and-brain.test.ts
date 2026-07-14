import { describe, expect, it } from 'vitest'

import {
  applyTournamentCommand,
  makeRound,
  makeTournament,
  planNextTournamentPairings,
  planNextTournamentRound,
} from '@/apps/swiss-tournaments/__tests__/fixtures'
import type { Pairing } from '@/apps/swiss-tournaments/types'

function handAndBrainPairing(id: string, roundNumber: number): Pairing {
  return {
    id,
    roundNumber,
    boardNumber: 1,
    kind: 'handAndBrain',
    handBrainSides: {
      white: { brainPlayerId: 'p1', handPlayerId: 'p2' },
      black: { brainPlayerId: 'p3', handPlayerId: 'p4' },
    },
    result: '1-0',
    isManual: false,
    isBye: false,
  }
}

function pairingPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  return [
    pairing.whitePlayerId,
    pairing.blackPlayerId,
    pairing.handBrainSides?.white.brainPlayerId,
    pairing.handBrainSides?.white.handPlayerId,
    pairing.handBrainSides?.black.brainPlayerId,
    pairing.handBrainSides?.black.handPlayerId,
  ].filter((playerId): playerId is string => Boolean(playerId))
}

describe('Hand and Brain golden cases', () => {
  it('creates two complete boards for eight players', () => {
    const pairings = planNextTournamentPairings(
      makeTournament('handAndBrain', 8),
    )
    const playerIds = pairings.flatMap(pairingPlayerIds)

    expect(pairings).toHaveLength(2)
    expect(pairings.every((pairing) => pairing.kind === 'handAndBrain')).toBe(true)
    expect(new Set(playerIds).size).toBe(8)
  })

  it('creates one team board and one single game for six players', () => {
    const pairings = planNextTournamentPairings(
      makeTournament('handAndBrain', 6),
    )

    expect(pairings.map((pairing) => pairing.kind)).toEqual([
      'handAndBrain',
      'single',
    ])
    expect(new Set(pairings.flatMap(pairingPlayerIds)).size).toBe(6)
  })

  it('creates one team board and a fair bye for five players', () => {
    const pairings = planNextTournamentPairings(
      makeTournament('handAndBrain', 5),
    )

    expect(pairings.find((pairing) => pairing.isBye)?.byePlayerId).toBe('p5')
    expect(pairings.filter((pairing) => pairing.kind === 'handAndBrain')).toHaveLength(1)
  })

  it('reports repeated teams, partners and roles through the public manual interface', () => {
    const previous = handAndBrainPairing('previous', 1)
    const tournament = makeTournament('handAndBrain', 4, {
      currentRound: 1,
      rounds: [makeRound(1, [previous])],
    })
    const draftTournament = planNextTournamentRound(tournament)
    const pinnedTournament = applyTournamentCommand(draftTournament, {
      type: 'pairing.pin',
      roundNumber: 2,
      assignment: {
        kind: 'handAndBrain',
        sides: previous.handBrainSides!,
      },
    })
    const pairing = pinnedTournament.rounds
      .find((round) => round.roundNumber === 2)
      ?.pairings.find((entry) => entry.isManual)
    const warningIds = pairing?.warnings?.map((warning) => warning.id)

    expect(warningIds).toContain('repeat-hand-brain-team')
    expect(warningIds).toContain('repeat-hand-brain-partner')
    expect(warningIds).toContain('repeat-hand-brain-roles')
  })
})
