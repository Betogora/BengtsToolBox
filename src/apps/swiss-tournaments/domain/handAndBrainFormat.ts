import type { Pairing, PairingWarning, Player, PlayerScoreSummary, Tournament } from '@/apps/swiss-tournaments/types'
import { assignSinglePairingColors, byeResult, chooseByePlayer, chooseSinglePairing, compareNumberLists, getPlayerStatusForRound, getRoundByeScore, getSummaryBeforeRound, handBrainHardshipCount, handBrainSideRoleOptions, handBrainTeamColorPenalty, hasSameTeamBeforeRound, makeId, normalizeRoundPairings, pairingPlayerIds, sideAveragePoints, teammateRepeatPenalty, validatePairing, warning } from './pairingSupport'
import { playerOrder, seedOrder } from './swissFormat'

function createHandBrainBoardCandidate(
  boardPlayers: Player[],
  plannedWarnings: PairingWarning[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  boardNumber: number,
) {
  let best: { pairing: Pairing; score: number[] } | null = null

  for (let firstIndex = 0; firstIndex < boardPlayers.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < boardPlayers.length; secondIndex += 1) {
      const firstTeam = [boardPlayers[firstIndex], boardPlayers[secondIndex]].sort(seedOrder)
      const secondTeam = boardPlayers
        .filter((player) => !firstTeam.some((teammate) => teammate.id === player.id))
        .sort(seedOrder)

      if (firstTeam[0].initialSeed > secondTeam[0].initialSeed) {
        continue
      }

      const teamDirections = [
        { whiteTeam: firstTeam, blackTeam: secondTeam },
        { whiteTeam: secondTeam, blackTeam: firstTeam },
      ]

      for (const direction of teamDirections) {
        const whiteIds = direction.whiteTeam.map((player) => player.id)
        const blackIds = direction.blackTeam.map((player) => player.id)
        const sameTeamPenalty = hasSameTeamBeforeRound(tournament, whiteIds, blackIds, roundNumber)
          ? 1
          : 0
        const partnerPenalty =
          teammateRepeatPenalty(tournament, whiteIds[0], whiteIds[1], roundNumber) +
          teammateRepeatPenalty(tournament, blackIds[0], blackIds[1], roundNumber)
        const pointBalancePenalty = Math.abs(
          sideAveragePoints(whiteIds, summaries) - sideAveragePoints(blackIds, summaries),
        )
        const colorScore = handBrainTeamColorPenalty(
          whiteIds,
          blackIds,
          tournament,
          summaries,
          roundNumber,
        )

        for (const whiteRole of handBrainSideRoleOptions(direction.whiteTeam[0], direction.whiteTeam[1], summaries, tournament, roundNumber)) {
          for (const blackRole of handBrainSideRoleOptions(direction.blackTeam[0], direction.blackTeam[1], summaries, tournament, roundNumber)) {
          const pairing: Pairing = {
            id: makeId('pairing'),
            roundNumber,
            boardNumber,
            kind: 'handAndBrain',
            isManual: false,
            isBye: false,
            handBrainSides: {
              white: whiteRole.side,
              black: blackRole.side,
            },
            warnings: plannedWarnings,
          }
          const score = [
            sameTeamPenalty,
            partnerPenalty,
            pointBalancePenalty,
            whiteRole.score + blackRole.score,
            colorScore,
            direction.whiteTeam[0].initialSeed +
              direction.whiteTeam[1].initialSeed / 100 +
              direction.blackTeam[0].initialSeed / 10_000 +
              direction.blackTeam[1].initialSeed / 1_000_000,
          ]

          if (!best || compareNumberLists(score, best.score) < 0) {
            best = { pairing, score }
          }
        }
      }
    }
  }
  }

  return best
}

function createHandBrainBoardWarnings(
  boardPlayers: Player[],
  summaries: Record<string, PlayerScoreSummary>,
) {
  const scores = boardPlayers.map((player) => summaries[player.id].points)
  const highestScore = Math.max(...scores)
  const lowestScore = Math.min(...scores)

  return highestScore > lowestScore
    ? [warning('forced-floater', 'Dieses Hand-and-Brain-Brett verbindet mehrere Scoregroups.')]
    : []
}

function findBestHandBrainBoardPlan(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
): Pairing[] {
  if (players.length < 4) {
    return []
  }

  const sortedPlayers = [...players].sort((left, right) => playerOrder(left, right, summaries))

  return Array.from({ length: Math.floor(sortedPlayers.length / 4) }, (_, index) => {
    const boardPlayers = sortedPlayers.slice(index * 4, index * 4 + 4)
    const candidate = createHandBrainBoardCandidate(
      boardPlayers,
      createHandBrainBoardWarnings(boardPlayers, summaries),
      tournament,
      summaries,
      roundNumber,
      index + 1,
    )

    return candidate?.pairing
  }).filter((pairing): pairing is Pairing => Boolean(pairing))
}

export function createHandBrainPairings(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Pairing[] {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const usedPlayerIds = new Set(fixedPairings.flatMap(pairingPlayerIds))
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
  let singlePairing: Pairing | null = null
  const currentRoundByeIds = new Set<string>()

  if (pool.length % 4 === 1 || pool.length % 4 === 3) {
    const byePlayer = chooseByePlayer(
      pool,
      summaries,
      roundNumber,
      tournament.settings.byePolicy,
      (playerId) => handBrainHardshipCount(playerId, summaries),
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
    byePairing.warnings = validatePairing(tournament, byePairing, roundNumber, summaries)
    currentRoundByeIds.add(byePlayer.id)
    pool = pool.filter((player) => player.id !== byePlayer.id)
  }

  if (pool.length % 4 === 2) {
    const singlePair = chooseSinglePairing(
      pool,
      summaries,
      currentRoundByeIds,
    )

    if (singlePair) {
      const colors = assignSinglePairingColors(singlePair.left, singlePair.right, summaries)
      const pairing: Pairing = {
        id: makeId('pairing'),
        roundNumber,
        boardNumber: pairings.length + 1,
        kind: 'single',
        ...colors,
        isManual: false,
        isBye: false,
      }
      pairing.warnings = validatePairing(tournament, pairing, roundNumber, summaries)
      singlePairing = pairing
      pool = pool.filter(
        (player) => player.id !== singlePair.left.id && player.id !== singlePair.right.id,
      )
    }
  }

  const handBrainPairings = findBestHandBrainBoardPlan(
    pool,
    tournament,
    summaries,
    roundNumber,
  ).map((pairing, index) => ({
    ...pairing,
    boardNumber: pairings.length + index + 1,
    warnings: [
      ...validatePairing(tournament, pairing, roundNumber, summaries),
      ...(pairing.warnings ?? []),
    ],
  }))

  pairings.push(...handBrainPairings)

  if (singlePairing) {
    pairings.push(singlePairing)
  }

  if (byePairing) {
    pairings.push(byePairing)
  }

  return normalizeRoundPairings(pairings)
}
