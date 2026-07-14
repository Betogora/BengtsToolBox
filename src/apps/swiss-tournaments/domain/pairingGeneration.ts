import type { Pairing, Tournament } from '@/apps/swiss-tournaments/types'
import { planNextMarioKartLobby } from '@/apps/swiss-tournaments/marioKart'
import { assignColors, byeResult, chooseByePlayer, getPlayerStatusForRound, getRoundByeScore, getSummaryBeforeRound, makeId, normalizeRoundPairings, validatePairing, warning } from './pairingSupport'
import { createFirstRoundPairings, createSwissBracketPairings, playerOrder } from './swissFormat'
import { generateRoundRobinPairings } from './roundRobinFormat'
import { createHandBrainPairings } from './handAndBrainFormat'

function createMarioKartPairings(
  tournament: Tournament,
): Pairing[] {
  const planned = planNextMarioKartLobby(tournament)

  return (
    planned.tournament.rounds.find(
      (round) => round.roundNumber === planned.createdRoundNumber,
    )?.pairings ?? []
  )
}

export function generatePairings(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Pairing[] {
  if (tournament.format === 'roundRobin') {
    return generateRoundRobinPairings(tournament, roundNumber, fixedPairings)
  }

  if (tournament.format === 'handAndBrain') {
    return createHandBrainPairings(tournament, roundNumber, fixedPairings)
  }

  if (tournament.format === 'marioKart') {
    return createMarioKartPairings(tournament)
  }

  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const usedPlayerIds = new Set(
    fixedPairings.flatMap((pairing) =>
      [pairing.whitePlayerId, pairing.blackPlayerId, pairing.byePlayerId].filter(Boolean),
    ) as string[],
  )
  const activePlayers = tournament.players
    .filter((player) => player.addedInRound <= roundNumber)
    .filter((player) => getPlayerStatusForRound(player, roundNumber) === 'active')
    .filter((player) => !usedPlayerIds.has(player.id))
    .sort((left, right) => playerOrder(left, right, summaries))

  const pairings: Pairing[] = fixedPairings.map((pairing, index) => ({
    ...pairing,
    boardNumber: index + 1,
    roundNumber,
    isManual: true,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }))
  let pool = activePlayers

  let byePairing: Pairing | null = null

  if (pool.length % 2 === 1) {
    const byePlayer = chooseByePlayer(
      pool,
      summaries,
      roundNumber,
      tournament.settings.byePolicy,
    )
    byePairing = {
      id: makeId('pairing'),
      roundNumber,
      boardNumber: 0,
      result: byeResult(getRoundByeScore(tournament, roundNumber)),
      isManual: false,
      isBye: true,
      byePlayerId: byePlayer.id,
    }
    const activeByeCounts = activePlayers.map((player) => summaries[player.id].byes)
    const hasStartedNewByeCycle =
      activeByeCounts.length > 0 &&
      activeByeCounts.every((byeCount) => byeCount === activeByeCounts[0]) &&
      activeByeCounts[0] > 0
    byePairing.warnings = [
      ...validatePairing(tournament, byePairing, roundNumber, summaries),
      ...(hasStartedNewByeCycle
        ? [warning('bye-cycle-restarted', 'Alle aktiven Spieler hatten bereits gleich viele Byes.')]
        : []),
    ]
    pool = pool.filter((player) => player.id !== byePlayer.id)
  }

  const plannedPairings =
    roundNumber === 1
      ? createFirstRoundPairings(pool)
      : createSwissBracketPairings(pool, tournament, summaries, roundNumber)

  plannedPairings.forEach(({ left, right, warnings: pairingWarnings = [] }) => {
    const colors = assignColors(left, right, summaries, tournament, roundNumber)
    const pairing: Pairing = {
      id: makeId('pairing'),
      roundNumber,
      boardNumber: pairings.length + 1,
      ...colors,
      isManual: false,
      isBye: false,
    }
    pairing.warnings = [
      ...validatePairing(tournament, pairing, roundNumber, summaries),
      ...pairingWarnings,
    ]
    pairings.push(pairing)
  })

  if (byePairing) {
    pairings.push(byePairing)
  }

  return normalizeRoundPairings(pairings)
}
