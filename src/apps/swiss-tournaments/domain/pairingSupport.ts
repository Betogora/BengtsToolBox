import type { ByeScore, Color, GameResult, HandBrainSide, Pairing, PairingWarning, Player, PlayerScoreSummary, PlayerStatus, Tournament } from '@/apps/swiss-tournaments/types'
import { getMarioKartExtraRacers as marioKartExtraRacers, getMarioKartRacers as marioKartRacers, getMarioKartScoringRacers as marioKartScoringRacers, getMarioKartScoringPlacement, getMarioKartTournamentPoints, isMarioKartPairingComplete } from '@/apps/swiss-tournaments/marioKart'
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
  return marioKartScoringRacers(pairing).map((racer) => racer.playerId)
}

export function hasCompleteMarioKartResult(pairing: Pairing) {
  return isMarioKartPairingComplete(pairing)
}

export function isPairingComplete(pairing: Pairing) {
  if (pairing.isBye) {
    return true
  }

  if (pairingKind(pairing) === 'marioKart') {
    return hasCompleteMarioKartResult(pairing)
  }

  return Boolean(pairing.result)
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
    ...marioKartRacers(pairing).map((racer) => racer.playerId),
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

function wereOpponents(pairing: Pairing, leftId: string, rightId: string) {
  return opponentIdsForPlayer(pairing, leftId).includes(rightId)
}

function wereTeammates(pairing: Pairing, leftId: string, rightId: string) {
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
    const scoringRacers = marioKartScoringRacers(pairing)
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
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .reduce(
      (count, round) =>
        count +
        round.pairings.filter(
          (pairing) =>
            !pairing.isBye &&
            wereOpponents(pairing, leftId, rightId),
        ).length,
      0,
    )
}

export function countGamesBetween(
  tournament: Tournament,
  leftId: string,
  rightId: string,
) {
  return tournament.rounds.reduce(
    (count, round) =>
      count +
      round.pairings.filter(
        (pairing) =>
          !pairing.isBye &&
          wereOpponents(pairing, leftId, rightId),
      ).length,
    0,
  )
}

export function countMarioKartEvents(tournament: Tournament, playerId: string) {
  return tournament.rounds.reduce(
    (count, round) =>
      count +
      round.pairings.filter(
        (pairing) =>
          pairing.kind === 'marioKart' &&
          marioKartRacers(pairing).some(
            (racer) => racer.playerId === playerId && racer.event,
          ),
      ).length,
    0,
  )
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
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .forEach((round) => {
      const seen = new Set<string>()
      const marioKartCycleByPairingId = new Map<string, number>()

      round.pairings.forEach((pairing) => {
        marioKartRacers(pairing).forEach((racer) => {
          if (racer.event && summaries[racer.playerId]) {
            summaries[racer.playerId].marioKartEvents += 1
          }
        })

        marioKartExtraRacers(pairing).forEach((racer) => {
          if (summaries[racer.playerId]) {
            summaries[racer.playerId].marioKartExtraRides += 1
          }
        })

        if (pairingKind(pairing) === 'marioKart') {
          const scoringRacers = marioKartScoringRacers(pairing)
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
          const scoringRacers = marioKartScoringRacers(pairing)
          const ownRacer = scoringRacers.find((racer) => racer.playerId === player.id)
          const ownScoringPlacement = ownRacer
            ? getMarioKartScoringPlacement(pairing, ownRacer)
            : undefined
          const opponentIds = opponentIdsForPlayer(pairing, player.id)
          const isCompleteMarioKartPairing = hasCompleteMarioKartResult(pairing)
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

export function colorPenalty(player: Player, color: Color, summary: PlayerScoreSummary) {
  if (color === '-') {
    return 0
  }

  const whiteCount = summary.colors.filter((entry) => entry === 'W').length
  const blackCount = summary.colors.filter((entry) => entry === 'B').length
  const lastColors = summary.colors.filter((entry) => entry !== '-').slice(-2)
  const nextWhiteCount = whiteCount + (color === 'W' ? 1 : 0)
  const nextBlackCount = blackCount + (color === 'B' ? 1 : 0)
  const nextColorDiff = nextWhiteCount - nextBlackCount
  let penalty = 0

  if (Math.abs(nextColorDiff) > 2) {
    penalty += 1000
  }

  if (lastColors.length > 0 && lastColors[lastColors.length - 1] === color) {
    penalty += 4
  }

  if (lastColors.length === 2 && lastColors.every((entry) => entry === color)) {
    penalty += 1000
  }

  penalty += Math.abs(nextColorDiff) * 20

  return penalty + player.initialSeed / 1000
}

function previousColorAgainstBeforeRound(
  tournament: Tournament,
  playerId: string,
  opponentId: string,
  beforeRoundNumber: number,
): Color | null {
  const previousPairing = [...tournament.rounds]
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .sort((left, right) => right.roundNumber - left.roundNumber)
    .flatMap((round) => round.pairings)
    .find(
      (pairing) =>
        !pairing.isBye &&
        wereOpponents(pairing, playerId, opponentId),
    )

  if (!previousPairing) {
    return null
  }

  return playerColor(previousPairing, playerId)
}

export function assignColors(
  whiteCandidate: Player,
  blackCandidate: Player,
  summaries: Record<string, PlayerScoreSummary>,
  tournament: Tournament,
  roundNumber: number,
) {
  const asGiven = colorAssignmentPenalty(
    whiteCandidate,
    blackCandidate,
    summaries,
    tournament,
    roundNumber,
  )
  const swapped = colorAssignmentPenalty(
    blackCandidate,
    whiteCandidate,
    summaries,
    tournament,
    roundNumber,
  )

  return asGiven <= swapped
    ? { whitePlayerId: whiteCandidate.id, blackPlayerId: blackCandidate.id }
    : { whitePlayerId: blackCandidate.id, blackPlayerId: whiteCandidate.id }
}

export function assignSinglePairingColors(
  left: Player,
  right: Player,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const leftWhiteCount = summaries[left.id].colors.filter((entry) => entry === 'W').length
  const rightWhiteCount = summaries[right.id].colors.filter((entry) => entry === 'W').length

  if (leftWhiteCount !== rightWhiteCount) {
    return leftWhiteCount < rightWhiteCount
      ? { whitePlayerId: left.id, blackPlayerId: right.id }
      : { whitePlayerId: right.id, blackPlayerId: left.id }
  }

  const leftBlackCount = summaries[left.id].colors.filter((entry) => entry === 'B').length
  const rightBlackCount = summaries[right.id].colors.filter((entry) => entry === 'B').length

  if (leftBlackCount !== rightBlackCount) {
    return leftBlackCount > rightBlackCount
      ? { whitePlayerId: left.id, blackPlayerId: right.id }
      : { whitePlayerId: right.id, blackPlayerId: left.id }
  }

  return left.initialSeed > right.initialSeed
    ? { whitePlayerId: left.id, blackPlayerId: right.id }
    : { whitePlayerId: right.id, blackPlayerId: left.id }
}

function colorAssignmentPenalty(
  white: Player,
  black: Player,
  summaries: Record<string, PlayerScoreSummary>,
  tournament: Tournament,
  roundNumber: number,
) {
  const repeatedWhiteCandidateColor = previousColorAgainstBeforeRound(
    tournament,
    white.id,
    black.id,
    roundNumber,
  )
  const repeatAsGivenPenalty = repeatedWhiteCandidateColor === 'W' ? 60 : 0

  return (
    colorPenalty(white, 'W', summaries[white.id]) +
    colorPenalty(black, 'B', summaries[black.id]) +
    repeatAsGivenPenalty
  )
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

function hasSameRoleWithTeammateBeforeRound(
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

export function validatePairing(
  tournament: Tournament,
  pairing: Pairing,
  roundNumber: number,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const warnings: PairingWarning[] = []

  if (pairing.isBye) {
    const player = tournament.players.find((entry) => entry.id === pairing.byePlayerId)

    const activePlayers = tournament.players.filter(
      (entry) =>
        entry.addedInRound <= roundNumber &&
        getPlayerStatusForRound(entry, roundNumber) === 'active',
    )
    const fewestByes = Math.min(
      ...activePlayers.map((entry) => summaries[entry.id]?.byes ?? 0),
    )

    if (
      player &&
      summaries[player.id].byes > fewestByes
    ) {
      warnings.push(warning('multiple-byes', `${player.name} hat bereits ein Bye erhalten.`))
    }

    if (marioKartRacers(pairing).length > 0) {
      warnings.push(warning('mario-kart-bye-extra', 'Dieses Bye enthält eine optionale Extra-Fahrt ohne Wertung.'))
    }

    return warnings
  }

  if (pairingKind(pairing) === 'marioKart') {
    const scoringRacers = marioKartScoringRacers(pairing)
    const extraRacers = marioKartExtraRacers(pairing)
    const scoringIds = scoringRacers.map((racer) => racer.playerId)
    const allRacerIds = marioKartRacers(pairing).map((racer) => racer.playerId)
    const uniqueScoringIds = new Set(scoringIds)
    const uniqueAllRacerIds = new Set(allRacerIds)

    const minimumScoringRacers = extraRacers.length > 0 ? 1 : 2

    if (scoringRacers.length < minimumScoringRacers || scoringRacers.length > 4) {
      warnings.push(warning('missing-player', 'Diese Mario-Kart-Lobby braucht 2 bis 4 Fahrer und mindestens einen zählenden Fahrer.', 'hard'))
    }

    if (uniqueScoringIds.size !== scoringIds.length || uniqueAllRacerIds.size !== allRacerIds.length) {
      warnings.push(warning('duplicate-round-player', 'Ein Fahrer darf in derselben Lobby nur einmal vorkommen.', 'hard'))
    }

    if (scoringRacers.length + extraRacers.length > 4) {
      warnings.push(warning('missing-player', 'Eine Mario-Kart-Lobby darf maximal 4 Fahrer enthalten.', 'hard'))
    }

    allRacerIds.forEach((playerId) => {
      const player = tournament.players.find((entry) => entry.id === playerId)

      if (!player) {
        warnings.push(warning('missing-player', 'Ein Fahrer fehlt in dieser Lobby.', 'hard'))
        return
      }

      if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
        warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
      }
    })

    if (scoringRacers.length === 3) {
      warnings.push(warning('mario-kart-three-player-lobby', 'Diese Lobby hat nur drei zählende Fahrer.'))
    }

    const scores = scoringIds.map((playerId) => summaries[playerId]?.points ?? 0)
    const scoreGap = Math.max(...scores) - Math.min(...scores)

    if (scores.length > 0 && scoreGap > 1) {
      warnings.push(warning('mario-kart-score-gap', 'Die Score-Differenz dieser Lobby ist ungewöhnlich hoch.'))
    }

    return warnings
  }

  if (pairingKind(pairing) === 'handAndBrain') {
    const whiteIds = whiteSidePlayerIds(pairing)
    const blackIds = blackSidePlayerIds(pairing)
    const playerIds = [...whiteIds, ...blackIds]
    const uniquePlayerIds = new Set(playerIds)

    if (whiteIds.length !== 2 || blackIds.length !== 2 || uniquePlayerIds.size !== 4) {
      warnings.push(warning('missing-player', 'Dieses Hand-and-Brain-Brett ist unvollständig.', 'hard'))
    }

    playerIds.forEach((playerId) => {
      const player = tournament.players.find((entry) => entry.id === playerId)

      if (!player) {
        warnings.push(warning('missing-player', 'Ein Spieler fehlt in diesem Brett.', 'hard'))
        return
      }

      if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
        warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
      }
    })

    if (hasSameTeamBeforeRound(tournament, whiteIds, blackIds, roundNumber)) {
      warnings.push(warning('repeat-hand-brain-team', 'Diese Team-gegen-Team-Konstellation gab es bereits.', 'hard'))
    }

    if (pairing.handBrainSides) {
      ;[pairing.handBrainSides.white, pairing.handBrainSides.black].forEach((side) => {
        if (countTeammateGamesBeforeRound(tournament, side.brainPlayerId, side.handPlayerId, roundNumber) > 0) {
          warnings.push(warning('repeat-hand-brain-partner', 'Diese Spieler waren bereits auf derselben Seite.'))
        }

        if (hasSameRoleWithTeammateBeforeRound(tournament, side, roundNumber)) {
          warnings.push(warning('repeat-hand-brain-roles', 'Dieses Duo hatte bereits dieselbe Hand/Brain-Verteilung.'))
        }
      })
    }

    const pointDiff = Math.abs(
      sideAveragePoints(whiteIds, summaries) - sideAveragePoints(blackIds, summaries),
    )

    if (pointDiff > 1) {
      warnings.push(warning('large-point-gap', 'Die Punktdifferenz der Seiten ist ungewöhnlich hoch.'))
    }

    ;[
      ...whiteIds.map((playerId) => [playerId, 'W' as const] as const),
      ...blackIds.map((playerId) => [playerId, 'B' as const] as const),
    ].forEach(([playerId, color]) => {
      const player = tournament.players.find((entry) => entry.id === playerId)
      const summary = summaries[playerId]

      if (!player || !summary) {
        return
      }

      const recent = summary.colors.filter((entry) => entry !== '-').slice(-2)
      const whiteCount = summary.colors.filter((entry) => entry === 'W').length
      const blackCount = summary.colors.filter((entry) => entry === 'B').length
      const nextColorDiff =
        whiteCount + (color === 'W' ? 1 : 0) - blackCount - (color === 'B' ? 1 : 0)

      if (recent.length === 2 && recent.every((entry) => entry === color)) {
        warnings.push(warning('third-color', `${player.name} würde zum dritten Mal in Folge ${color === 'W' ? 'Weiß' : 'Schwarz'} erhalten.`))
      }

      if (Math.abs(nextColorDiff) > 2) {
        warnings.push(warning('color-imbalance', `${player.name} hätte eine Farbdifferenz größer als 2.`))
      }
    })

    return warnings
  }

  const white = tournament.players.find((player) => player.id === pairing.whitePlayerId)
  const black = tournament.players.find((player) => player.id === pairing.blackPlayerId)

  if (!white || !black) {
    warnings.push(warning('missing-player', 'Diese Paarung ist unvollständig.', 'hard'))
    return warnings
  }

  if (white.id === black.id) {
    warnings.push(warning('same-player', 'Ein Spieler kann nicht gegen sich selbst spielen.', 'hard'))
  }

  for (const player of [white, black]) {
    if (getPlayerStatusForRound(player, roundNumber) !== 'active') {
      warnings.push(warning('inactive-player', `${player.name} ist nicht aktiv.`, 'hard'))
    }
  }

  const previousGames = countGamesBetweenBeforeRound(
    tournament,
    white.id,
    black.id,
    roundNumber,
  )
  const targetGames =
    tournament.format === 'roundRobin'
      ? normalizeRoundRobinCycles(tournament.settings.roundRobinCycles)
      : 1

  if (previousGames >= targetGames) {
    warnings.push(warning('repeat-pairing', 'Diese Spieler haben bereits gegeneinander gespielt.', 'hard'))
  }

  const pointDiff = Math.abs(summaries[white.id].points - summaries[black.id].points)

  if (pointDiff > 1) {
    warnings.push(warning('large-point-gap', 'Die Punktdifferenz ist ungewöhnlich hoch.'))
  }

  const nextColors: Array<[Player, 'W' | 'B']> = [
    [white, 'W' as const],
    [black, 'B' as const],
  ]

  nextColors.forEach(([player, color]) => {
    const summary = summaries[player.id]
    const recent = summary.colors.filter((entry) => entry !== '-').slice(-2)
    const whiteCount = summary.colors.filter((entry) => entry === 'W').length
    const blackCount = summary.colors.filter((entry) => entry === 'B').length
    const nextColorDiff =
      whiteCount + (color === 'W' ? 1 : 0) - blackCount - (color === 'B' ? 1 : 0)

    if (recent.length === 2 && recent.every((entry) => entry === color)) {
      warnings.push(warning('third-color', `${player.name} würde zum dritten Mal in Folge ${color === 'W' ? 'Weiß' : 'Schwarz'} erhalten.`))
    }

    if (Math.abs(nextColorDiff) > 2) {
      warnings.push(warning('color-imbalance', `${player.name} hätte eine Farbdifferenz größer als 2.`))
    }
  })

  return warnings
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

function countTeammateGamesBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .reduce(
      (count, round) =>
        count +
        round.pairings.filter(
          (pairing) =>
            !pairing.isBye &&
            wereTeammates(pairing, leftId, rightId),
        ).length,
      0,
    )
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

export function playerById(tournament: Tournament, playerId: string, fallback: Player) {
  return tournament.players.find((player) => player.id === playerId) ?? fallback
}

export function handBrainTeamColorPenalty(
  whiteIds: string[],
  blackIds: string[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
) {
  const fallbackPlayer = tournament.players[0]
  const whitePenalty = whiteIds.reduce((sum, playerId) => {
    const player = playerById(tournament, playerId, fallbackPlayer)

    return sum + colorPenalty(player, 'W', summaries[playerId])
  }, 0)
  const blackPenalty = blackIds.reduce((sum, playerId) => {
    const player = playerById(tournament, playerId, fallbackPlayer)

    return sum + colorPenalty(player, 'B', summaries[playerId])
  }, 0)
  const repeatedOpponentColorPenalty = whiteIds.reduce(
    (sum, whiteId) =>
      sum +
      blackIds.filter(
        (blackId) =>
          previousColorAgainstBeforeRound(tournament, whiteId, blackId, roundNumber) === 'W',
      ).length *
        60,
    0,
  )

  return whitePenalty + blackPenalty + repeatedOpponentColorPenalty
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
