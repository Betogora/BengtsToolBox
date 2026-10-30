import type { ByeScore, Color, GameResult, HandBrainSide, Pairing, Player, PlayerScoreSummary, PlayerStatus, Tournament } from '@/apps/swiss-tournaments/types'
import { getMarioKartExtraRacers, getMarioKartRacers, getMarioKartScoringRacers, getMarioKartScoringPlacement, getMarioKartTournamentPoints, isMarioKartPairingComplete } from './marioKartFormat'
import { createRandomId } from '@/apps/shared/utils'

export function warning(id: string, message: string, severity: 'hard' | 'soft' = 'soft') {
  return { id, message, severity }
}

export function makeId(prefix: string) {
  return `${prefix}-${createRandomId()}`
}

export function normalizeRoundRobinCycles(value: number | undefined) {
  return Math.max(1, Math.floor(value ?? 1) || 1)
}

export function roundRobinRoundsForPlayerCount(playerCount: number, cycles: number) {
  if (playerCount <= 1) {
    return 1
  }

  return (playerCount % 2 === 0 ? playerCount - 1 : playerCount) * cycles
}

export function getRoundByeScore(tournament: Tournament, roundNumber: number): ByeScore {
  return tournament.settings.roundByeScores?.[roundNumber] ?? tournament.settings.byeScore
}

export function byeResult(score: ByeScore): GameResult {
  if (score === 0.5) {
    return 'bye-0.5'
  }

  return score === 0 ? 'bye-0' : 'bye-1'
}

export function pairingKind(pairing: Pairing) {
  if (pairing.isBye) {
    return 'standard'
  }

  return pairing.kind ?? 'standard'
}

export function marioKartScoringPlayerIds(pairing: Pairing) {
  return getMarioKartScoringRacers(pairing).map((racer) => racer.playerId)
}

export function isPairingComplete(pairing: Pairing) {
  if (pairing.isBye) {
    return true
  }

  if (pairingKind(pairing) === 'marioKart') {
    return isMarioKartPairingComplete(pairing)
  }

  return Boolean(pairing.result)
}

export function hasEnteredResult(pairing: Pairing) {
  if (pairing.kind === 'marioKart') {
    return getMarioKartRacers(pairing).some(
      (racer) => racer.placement || racer.event,
    )
  }

  return !pairing.isBye && Boolean(pairing.result)
}

function sidePlayerIds(side?: HandBrainSide) {
  return side ? [side.brainPlayerId, side.handPlayerId] : []
}

export function whiteSidePlayerIds(pairing: Pairing) {
  if (pairingKind(pairing) === 'handAndBrain') {
    return sidePlayerIds(pairing.handBrainSides?.white)
  }

  return pairing.whitePlayerId ? [pairing.whitePlayerId] : []
}

export function blackSidePlayerIds(pairing: Pairing) {
  if (pairingKind(pairing) === 'handAndBrain') {
    return sidePlayerIds(pairing.handBrainSides?.black)
  }

  return pairing.blackPlayerId ? [pairing.blackPlayerId] : []
}

export function pairingPlayerIds(pairing: Pairing) {
  return [
    ...whiteSidePlayerIds(pairing),
    ...blackSidePlayerIds(pairing),
    ...getMarioKartRacers(pairing).map((racer) => racer.playerId),
    ...(pairing.byePlayerId ? [pairing.byePlayerId] : []),
  ]
}

export function scoringPairingPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  if (pairingKind(pairing) === 'marioKart') {
    return marioKartScoringPlayerIds(pairing)
  }

  return [...whiteSidePlayerIds(pairing), ...blackSidePlayerIds(pairing)]
}

export function playerColor(pairing: Pairing, playerId: string): Color {
  if (whiteSidePlayerIds(pairing).includes(playerId)) {
    return 'W'
  }

  if (blackSidePlayerIds(pairing).includes(playerId)) {
    return 'B'
  }

  return '-'
}

export function playerRole(pairing: Pairing, playerId: string): 'hand' | 'brain' | '-' {
  if (pairingKind(pairing) !== 'handAndBrain') {
    return '-'
  }

  const sides = pairing.handBrainSides

  if (!sides) {
    return '-'
  }

  if (sides.white.brainPlayerId === playerId || sides.black.brainPlayerId === playerId) {
    return 'brain'
  }

  if (sides.white.handPlayerId === playerId || sides.black.handPlayerId === playerId) {
    return 'hand'
  }

  return '-'
}

export function opponentIdsForPlayer(pairing: Pairing, playerId: string) {
  if (pairingKind(pairing) === 'marioKart') {
    const scoringIds = marioKartScoringPlayerIds(pairing)

    return scoringIds.includes(playerId)
      ? scoringIds.filter((entry) => entry !== playerId)
      : []
  }

  if (whiteSidePlayerIds(pairing).includes(playerId)) {
    return blackSidePlayerIds(pairing)
  }

  if (blackSidePlayerIds(pairing).includes(playerId)) {
    return whiteSidePlayerIds(pairing)
  }

  return []
}

function teammateIdsForPlayer(pairing: Pairing, playerId: string) {
  const sideIds = whiteSidePlayerIds(pairing).includes(playerId)
    ? whiteSidePlayerIds(pairing)
    : blackSidePlayerIds(pairing).includes(playerId)
      ? blackSidePlayerIds(pairing)
      : []

  return sideIds.filter((id) => id !== playerId)
}

export function wereOpponents(pairing: Pairing, leftId: string, rightId: string) {
  return opponentIdsForPlayer(pairing, leftId).includes(rightId)
}

export function wereTeammates(pairing: Pairing, leftId: string, rightId: string) {
  return teammateIdsForPlayer(pairing, leftId).includes(rightId)
}

export function sameStringSet(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((entry) => right.includes(entry))
  )
}

export function averageOpponentPoints(
  opponentIds: string[],
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (opponentIds.length === 0) {
    return 0
  }

  return opponentIds.reduce(
    (sum, opponentId) => sum + (summaries[opponentId]?.points ?? 0),
    0,
  ) / opponentIds.length
}

export function resultPoints(
  pairing: Pairing,
  playerId: string,
  result = pairing.result,
) {
  if (pairing.isBye && pairing.byePlayerId === playerId) {
    if (result === 'bye-0.5') {
      return 0.5
    }

    return result === 'bye-1' ? 1 : 0
  }

  if (pairingKind(pairing) === 'marioKart') {
    const scoringRacers = getMarioKartScoringRacers(pairing)
    const racer = scoringRacers.find((entry) => entry.playerId === playerId)

    return racer ? getMarioKartTournamentPoints(pairing, racer) : 0
  }

  if (!result) {
    return 0
  }

  const isWhite = whiteSidePlayerIds(pairing).includes(playerId)
  const isBlack = blackSidePlayerIds(pairing).includes(playerId)

  if (!isWhite && !isBlack) {
    return 0
  }

  if (result === '1-0' || result === 'forfeit-1-0') {
    return isWhite ? 1 : 0
  }

  if (result === '0-1' || result === 'forfeit-0-1') {
    return isBlack ? 1 : 0
  }

  return result === '0.5-0.5' ? 0.5 : 0
}

function isWin(pairing: Pairing, playerId: string) {
  return resultPoints(pairing, playerId) === 1 && !pairing.isBye
}

export function getPlayerStatusForRound(player: Player, roundNumber: number): PlayerStatus {
  return player.statusOverrides?.[roundNumber] ?? player.status
}

export function hasPlayedEachOtherBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  return countGamesBetweenBeforeRound(tournament, leftId, rightId, beforeRoundNumber) > 0
}

export function countGamesBetweenBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  let count = 0
  for (const round of tournament.rounds) {
    if (!(round.roundNumber < beforeRoundNumber)) continue
    for (const pairing of round.pairings) {
      if (!pairing.isBye && wereOpponents(pairing, leftId, rightId)) count += 1
    }
  }
  return count
}

export function countMarioKartEventsByPlayer(tournament: Tournament) {
  const counts = new Map<string, number>()

  tournament.rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.kind !== 'marioKart') {
        return
      }

      new Set(
        getMarioKartRacers(pairing)
          .filter((racer) => racer.event)
          .map((racer) => racer.playerId),
      ).forEach((playerId) => {
        counts.set(playerId, (counts.get(playerId) ?? 0) + 1)
      })
    })
  })

  return counts
}

export function getSummaryBeforeRound(
  tournament: Tournament,
  beforeRoundNumber = Number.POSITIVE_INFINITY,
): Record<string, PlayerScoreSummary> {
  const summaries: Record<string, PlayerScoreSummary> = {}

  tournament.players.forEach((player) => {
    summaries[player.id] = {
      points: 0,
      wins: 0,
      opponentGroups: [],
      defeatedOpponentGroups: [],
      drawnOpponentGroups: [],
      colors: [],
      roles: [],
      byes: 0,
      singleGames: 0,
      marioKartPlacements: [],
      marioKartExtraRides: 0,
      marioKartPhysicalRaces: 0,
      marioKartScoringRaces: 0,
      marioKartEvents: 0,
      marioKartFillIns: 0,
      marioKartLastFillInRound: null,
    }
  })

  tournament.rounds
    .filter(
      (round) =>
        round.roundNumber < beforeRoundNumber &&
        (round.status === 'completed' || round.pairings.some(hasEnteredResult)),
    )
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .forEach((round) => {
      const seen = new Set<string>()
      const marioKartCycleByPairingId = new Map<string, number>()

      round.pairings.forEach((pairing) => {
        getMarioKartRacers(pairing).forEach((racer) => {
          if (racer.event && summaries[racer.playerId]) {
            summaries[racer.playerId].marioKartEvents += 1
          }
        })

        getMarioKartExtraRacers(pairing).forEach((racer) => {
          if (summaries[racer.playerId]) {
            summaries[racer.playerId].marioKartExtraRides += 1
          }
        })

        if (pairingKind(pairing) === 'marioKart') {
          const scoringRacers = getMarioKartScoringRacers(pairing)
          const previousGameCounts = scoringRacers.map(
            (racer) => summaries[racer.playerId]?.marioKartScoringRaces ?? 0,
          )
          const cycleNumber =
            pairing.marioKartCycleNumber ??
            (previousGameCounts.length > 0 ? Math.min(...previousGameCounts) + 1 : 1)

          marioKartCycleByPairingId.set(pairing.id, cycleNumber)
        }
      })

      tournament.players.forEach((player) => {
        const pairing = round.pairings.find(
          (entry) =>
            scoringPairingPlayerIds(entry).includes(player.id),
        )

        if (!pairing) {
          summaries[player.id].colors.push('-')
          summaries[player.id].roles.push('-')
          return
        }

        seen.add(player.id)
        summaries[player.id].points += resultPoints(pairing, player.id)

        if (pairing.isBye) {
          summaries[player.id].colors.push('-')
          summaries[player.id].roles.push('-')
          summaries[player.id].byes += 1
          return
        }

        if (pairingKind(pairing) === 'marioKart') {
          const scoringRacers = getMarioKartScoringRacers(pairing)
          const ownRacer = scoringRacers.find((racer) => racer.playerId === player.id)
          const ownScoringPlacement = ownRacer
            ? getMarioKartScoringPlacement(pairing, ownRacer)
            : undefined
          const opponentIds = opponentIdsForPlayer(pairing, player.id)
          const isCompleteMarioKartPairing = isMarioKartPairingComplete(pairing)
          const cycleNumber = marioKartCycleByPairingId.get(pairing.id) ?? 1

          if (opponentIds.length > 0) {
            summaries[player.id].opponentGroups.push(opponentIds)
          }

          summaries[player.id].colors.push('-')
          summaries[player.id].roles.push('-')

          if (isCompleteMarioKartPairing) {
            const previousGameCount = summaries[player.id].marioKartScoringRaces

            if (previousGameCount >= cycleNumber) {
              summaries[player.id].marioKartFillIns += 1
              summaries[player.id].marioKartLastFillInRound = round.roundNumber
            }

            summaries[player.id].marioKartPhysicalRaces += 1
            summaries[player.id].marioKartScoringRaces += 1
          }

          if (ownRacer?.placement) {
            summaries[player.id].marioKartPlacements.push(ownRacer.placement)
          }

          if (ownScoringPlacement === 1) {
            summaries[player.id].wins += 1
          }

          if (ownRacer?.placement && opponentIds.length > 0) {
            const defeatedOpponentIds = scoringRacers
              .filter(
                (racer) =>
                  racer.playerId !== player.id &&
                  typeof racer.placement === 'number' &&
                  racer.placement > ownRacer.placement!,
              )
              .map((racer) => racer.playerId)

            if (defeatedOpponentIds.length > 0) {
              summaries[player.id].defeatedOpponentGroups.push(defeatedOpponentIds)
            }
          }

          return
        }

        const opponentIds = opponentIdsForPlayer(pairing, player.id)

        if (opponentIds.length > 0) {
          summaries[player.id].opponentGroups.push(opponentIds)
        }

        summaries[player.id].colors.push(playerColor(pairing, player.id))
        summaries[player.id].roles.push(playerRole(pairing, player.id))

        if (pairingKind(pairing) === 'single') {
          summaries[player.id].singleGames += 1
        }

        if (isWin(pairing, player.id)) {
          summaries[player.id].wins += 1

          if (opponentIds.length > 0) {
            summaries[player.id].defeatedOpponentGroups.push(opponentIds)
          }
        } else if (pairing.result === '0.5-0.5' && opponentIds.length > 0) {
          summaries[player.id].drawnOpponentGroups.push(opponentIds)
        }
      })

      Object.keys(summaries).forEach((playerId) => {
        if (!seen.has(playerId) && summaries[playerId].colors.length < round.roundNumber) {
          summaries[playerId].colors.push('-')
          summaries[playerId].roles.push('-')
        }
      })
    })

  return summaries
}

export function sideAveragePoints(
  playerIds: string[],
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (playerIds.length === 0) {
    return 0
  }

  return playerIds.reduce((sum, playerId) => sum + summaries[playerId].points, 0) /
    playerIds.length
}

export function hasSameTeamBeforeRound(
  tournament: Tournament,
  leftIds: string[],
  rightIds: string[],
  beforeRoundNumber: number,
) {
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .some((round) =>
      round.pairings.some((pairing) => {
        if (pairingKind(pairing) !== 'handAndBrain') {
          return false
        }

        const previousWhite = whiteSidePlayerIds(pairing)
        const previousBlack = blackSidePlayerIds(pairing)

        return (
          (sameStringSet(leftIds, previousWhite) && sameStringSet(rightIds, previousBlack)) ||
          (sameStringSet(leftIds, previousBlack) && sameStringSet(rightIds, previousWhite))
        )
      }),
    )
}

export function hasSameRoleWithTeammateBeforeRound(
  tournament: Tournament,
  side: HandBrainSide,
  beforeRoundNumber: number,
) {
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .some((round) =>
      round.pairings.some((pairing) => {
        const sides = pairing.handBrainSides

        if (!sides) {
          return false
        }

        return [sides.white, sides.black].some(
          (previousSide) =>
            previousSide.brainPlayerId === side.brainPlayerId &&
            previousSide.handPlayerId === side.handPlayerId,
        )
      }),
    )
}

export function chooseByePlayer(
  players: Player[],
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  byePolicy: Tournament['settings']['byePolicy'],
  hardshipCount: (playerId: string) => number = (playerId) => summaries[playerId].byes,
) {
  const lowestHardshipCount = Math.min(...players.map((player) => hardshipCount(player.id)))
  const eligiblePlayersWithFewestHardships = players.filter(
    (player) => hardshipCount(player.id) === lowestHardshipCount,
  )
  const protectedLateEntrants =
    byePolicy === 'protectLateEntrants' && roundNumber > 1
      ? eligiblePlayersWithFewestHardships.filter(
          (player) => player.addedInRound === roundNumber,
        )
      : []
  const eligiblePlayers =
    protectedLateEntrants.length < eligiblePlayersWithFewestHardships.length
      ? eligiblePlayersWithFewestHardships.filter(
          (player) => !protectedLateEntrants.some((late) => late.id === player.id),
        )
      : eligiblePlayersWithFewestHardships

  return [...eligiblePlayers].sort((left, right) => {
    return (
      summaries[left.id].points - summaries[right.id].points ||
      right.initialSeed - left.initialSeed
    )
  })[0]
}

function teammateRoundsBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .filter((round) =>
      round.pairings.some(
        (pairing) =>
          !pairing.isBye &&
          wereTeammates(pairing, leftId, rightId),
      ),
    )
    .map((round) => round.roundNumber)
}

export function teammateRepeatPenalty(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  roundNumber: number,
) {
  const rounds = teammateRoundsBeforeRound(tournament, leftId, rightId, roundNumber)

  if (rounds.length === 0) {
    return 0
  }

  const latestRound = Math.max(...rounds)
  const roundsSince = roundNumber - latestRound

  if (roundsSince <= 1) {
    return 200_000 + rounds.length * 10_000
  }

  if (roundsSince === 2) {
    return 35_000 + rounds.length * 5_000
  }

  if (roundsSince === 3) {
    return 5_000 + rounds.length * 1_000
  }

  return rounds.length * 250
}

function roleCount(summary: PlayerScoreSummary, role: 'hand' | 'brain') {
  return summary.roles.filter((entry) => entry === role).length
}

export function handBrainHardshipCount(
  playerId: string,
  summaries: Record<string, PlayerScoreSummary>,
  currentRoundByes = new Set<string>(),
) {
  const summary = summaries[playerId]

  return (
    (summary?.byes ?? 0) +
    (summary?.singleGames ?? 0) +
    (currentRoundByes.has(playerId) ? 1 : 0)
  )
}

export function compareNumberLists(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)

    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

export function chooseSinglePairing(
  players: Player[],
  summaries: Record<string, PlayerScoreSummary>,
  currentRoundByes = new Set<string>(),
) {
  const sorted = [...players].sort(
    (left, right) =>
      handBrainHardshipCount(left.id, summaries, currentRoundByes) -
        handBrainHardshipCount(right.id, summaries, currentRoundByes) ||
      summaries[left.id].points - summaries[right.id].points ||
      right.initialSeed - left.initialSeed,
  )

  if (sorted.length < 2) {
    return null
  }

  return { left: sorted[0], right: sorted[1] }
}

function handBrainSideRolePenalty(
  side: HandBrainSide,
  summaries: Record<string, PlayerScoreSummary>,
  tournament: Tournament,
  roundNumber: number,
) {
  const brainSummary = summaries[side.brainPlayerId]
  const handSummary = summaries[side.handPlayerId]
  const balancePenalty =
    Math.abs(roleCount(brainSummary, 'brain') + 1 - roleCount(brainSummary, 'hand')) +
    Math.abs(roleCount(handSummary, 'hand') + 1 - roleCount(handSummary, 'brain'))
  const repeatedRolePenalty = hasSameRoleWithTeammateBeforeRound(tournament, side, roundNumber)
    ? 4_000
    : 0

  return repeatedRolePenalty + balancePenalty * 600
}

export function handBrainSideRoleOptions(
  first: Player,
  second: Player,
  summaries: Record<string, PlayerScoreSummary>,
  tournament: Tournament,
  roundNumber: number,
) {
  return [
    { brainPlayerId: first.id, handPlayerId: second.id },
    { brainPlayerId: second.id, handPlayerId: first.id },
  ]
    .map((side) => ({
      side,
      score: handBrainSideRolePenalty(side, summaries, tournament, roundNumber),
    }))
    .sort((left, right) => left.score - right.score)
}

export function normalizeRoundPairings(pairings: Pairing[]) {
  const playerUseCounts = new Map<string, number>()

  pairings.forEach((pairing) => {
    scoringPairingPlayerIds(pairing).forEach((playerId) => {
      playerUseCounts.set(playerId, (playerUseCounts.get(playerId) ?? 0) + 1)
    })
  })

  return pairings.map((pairing, index) => {
    const duplicateIds = scoringPairingPlayerIds(pairing).filter(
      (playerId) => (playerUseCounts.get(playerId) ?? 0) > 1,
    )

    return {
      ...pairing,
      boardNumber: index + 1,
      warnings:
        duplicateIds.length === 0
          ? pairing.warnings
          : [
              ...(pairing.warnings ?? []),
              warning(
                'duplicate-round-player',
                'Ein Spieler ist in dieser Runde mehrfach gepaart.',
                'hard',
              ),
            ],
    }
  })
}
