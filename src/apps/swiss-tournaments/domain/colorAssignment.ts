import type { Color, Player, PlayerScoreSummary, Tournament } from '@/apps/swiss-tournaments/types'
import { playerColor, wereOpponents } from './pairingSupport'

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
