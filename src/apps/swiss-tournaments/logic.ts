import type {
  ByeScore,
  Color,
  CreateTournamentInput,
  GameResult,
  HandBrainSide,
  MarioKartRacer,
  Pairing,
  PairingWarning,
  Player,
  PlayerInput,
  PlayerScoreSummary,
  PlayerStatus,
  Round,
  StandingRoundCell,
  StandingRow,
  Tournament,
} from '@/apps/swiss-tournaments/types'
import { createRandomId } from '@/apps/shared/utils'

const defaultSettings = {
  initialSeedingMode: 'rating' as const,
  byeScore: 1 as const,
  byePolicy: 'protectLateEntrants' as const,
  roundRobinCycles: 1,
}

const roundRobinDummyId = '__round-robin-bye__'
const maxExactRoundRobinRepairPlayers = 16
const maxExactRoundRobinRepairStates = 50_000

function warning(id: string, message: string, severity: 'hard' | 'soft' = 'soft') {
  return { id, message, severity }
}

function makeId(prefix: string) {
  return `${prefix}-${createRandomId()}`
}

function stableHash(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function seedPlayers(
  players: PlayerInput[],
  mode: Tournament['settings']['initialSeedingMode'],
): Player[] {
  const cleanPlayers = players
    .map((player) => ({
      name: player.name.trim(),
      rating:
        player.rating === undefined || !Number.isFinite(player.rating)
          ? undefined
          : Math.round(player.rating),
      status: player.status ?? 'active',
    }))
    .filter((player) => player.name.length > 0)
  const hasRatings = cleanPlayers.some((player) => Number.isFinite(player.rating))
  const sorted = [...cleanPlayers].sort((left, right) => {
    if (mode === 'rating' && hasRatings) {
      return (
        (right.rating ?? Number.NEGATIVE_INFINITY) -
          (left.rating ?? Number.NEGATIVE_INFINITY) ||
        left.name.localeCompare(right.name, 'de')
      )
    }

    return stableHash(`${left.name}-${left.rating ?? ''}`) -
      stableHash(`${right.name}-${right.rating ?? ''}`)
  })

  return sorted.map((player, index) => {
    const seededPlayer: Player = {
      id: makeId('player'),
      name: player.name,
      initialSeed: index + 1,
      status: player.status,
      addedInRound: 1,
    }

    if (player.rating !== undefined) {
      seededPlayer.rating = player.rating
    }

    return seededPlayer
  })
}

function normalizeRoundRobinCycles(value: number | undefined) {
  return Math.max(1, Math.floor(value ?? 1) || 1)
}

function roundRobinRoundsForPlayerCount(playerCount: number, cycles: number) {
  if (playerCount <= 1) {
    return 1
  }

  return (playerCount % 2 === 0 ? playerCount - 1 : playerCount) * cycles
}

export function getRoundDisplayLabel(tournament: Tournament, roundNumber: number) {
  if (tournament.format === 'marioKart') {
    const pairing = tournament.rounds
      .find((round) => round.roundNumber === roundNumber)
      ?.pairings.find((entry) => entry.kind === 'marioKart')

    if (pairing?.marioKartCycleNumber && pairing.marioKartCycleLobbyNumber) {
      return `Lobby ${pairing.marioKartCycleNumber}.${pairing.marioKartCycleLobbyNumber}`
    }

    return `Lobby ${roundNumber}`
  }

  if (tournament.format !== 'roundRobin' || roundNumber <= tournament.numberOfRounds) {
    return `Runde ${roundNumber}`
  }

  const activePlayerCount = getRoundRobinEligiblePlayers(tournament, roundNumber).length
  const roundsPerCycle = roundRobinRoundsForPlayerCount(activePlayerCount, 1)
  const cycleOffset = Math.floor((roundNumber - 1) / roundsPerCycle) + 1
  const roundInCycle = ((roundNumber - 1) % roundsPerCycle) + 1

  return `Durchgang ${cycleOffset}, Runde ${roundInCycle}`
}

export function createTournament(
  input: CreateTournamentInput,
  position: number,
): Tournament {
  const name = input.name.trim() || 'Neues Schachturnier'
  const format = input.format ?? 'swiss'
  const seededPlayers = seedPlayers(
    input.players,
    format === 'roundRobin' ? 'random' : input.initialSeedingMode,
  )
  const roundRobinCycles = normalizeRoundRobinCycles(input.roundRobinCycles)
  const numberOfRounds =
    format === 'roundRobin'
      ? roundRobinRoundsForPlayerCount(
          seededPlayers.filter((player) => player.status === 'active').length,
          roundRobinCycles,
        )
      : Math.max(1, Math.floor(input.numberOfRounds) || 1)

  return {
    id: makeId('tournament'),
    name,
    format,
    numberOfRounds,
    currentRound: 0,
    players: seededPlayers,
    rounds: [],
    settings: {
      ...defaultSettings,
      initialSeedingMode: input.initialSeedingMode,
      byeScore: format === 'marioKart' ? 0.5 : input.byeScore,
      roundRobinCycles,
    },
    position,
    createdAtClientIso: new Date().toISOString(),
  }
}

function getRoundByeScore(tournament: Tournament, roundNumber: number): ByeScore {
  return tournament.settings.roundByeScores?.[roundNumber] ?? tournament.settings.byeScore
}

function byeResult(score: ByeScore): GameResult {
  if (score === 0.5) {
    return 'bye-0.5'
  }

  return score === 0 ? 'bye-0' : 'bye-1'
}

function pairingKind(pairing: Pairing) {
  if (pairing.isBye) {
    return 'standard'
  }

  return pairing.kind ?? 'standard'
}

function marioKartRacers(pairing: Pairing) {
  return pairingKind(pairing) === 'marioKart' ? pairing.marioKartRacers ?? [] : []
}

function marioKartScoringRacers(pairing: Pairing) {
  return marioKartRacers(pairing).filter((racer) => racer.role === 'scoring')
}

function marioKartExtraRacers(pairing: Pairing) {
  return marioKartRacers(pairing).filter((racer) => racer.role === 'extra')
}

function marioKartScoringPlayerIds(pairing: Pairing) {
  return marioKartScoringRacers(pairing).map((racer) => racer.playerId)
}

function marioKartPlacementPoints(scoringCount: number, placement: number | undefined) {
  if (!placement) {
    return 0
  }

  if (scoringCount === 4) {
    return [1, 0.7, 0.3, 0][placement - 1] ?? 0
  }

  if (scoringCount === 3) {
    return [1, 0.5, 0][placement - 1] ?? 0
  }

  if (scoringCount === 2) {
    return [1, 0][placement - 1] ?? 0
  }

  return 0
}

function hasCompleteMarioKartResult(pairing: Pairing) {
  const scoringRacers = marioKartScoringRacers(pairing)
  const placements = scoringRacers
    .map((racer) => racer.placement)
    .filter((placement): placement is number => typeof placement === 'number')

  return (
    scoringRacers.length >= 2 &&
    placements.length === scoringRacers.length &&
    new Set(placements).size === placements.length &&
    placements.every(
      (placement) => placement >= 1 && placement <= scoringRacers.length,
    )
  )
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

function whiteSidePlayerIds(pairing: Pairing) {
  if (pairingKind(pairing) === 'handAndBrain') {
    return sidePlayerIds(pairing.handBrainSides?.white)
  }

  return pairing.whitePlayerId ? [pairing.whitePlayerId] : []
}

function blackSidePlayerIds(pairing: Pairing) {
  if (pairingKind(pairing) === 'handAndBrain') {
    return sidePlayerIds(pairing.handBrainSides?.black)
  }

  return pairing.blackPlayerId ? [pairing.blackPlayerId] : []
}

function pairingPlayerIds(pairing: Pairing) {
  return [
    ...whiteSidePlayerIds(pairing),
    ...blackSidePlayerIds(pairing),
    ...marioKartRacers(pairing).map((racer) => racer.playerId),
    ...(pairing.byePlayerId ? [pairing.byePlayerId] : []),
  ]
}

function scoringPairingPlayerIds(pairing: Pairing) {
  if (pairing.isBye) {
    return pairing.byePlayerId ? [pairing.byePlayerId] : []
  }

  if (pairingKind(pairing) === 'marioKart') {
    return marioKartScoringPlayerIds(pairing)
  }

  return [...whiteSidePlayerIds(pairing), ...blackSidePlayerIds(pairing)]
}

function playerColor(pairing: Pairing, playerId: string): Color {
  if (whiteSidePlayerIds(pairing).includes(playerId)) {
    return 'W'
  }

  if (blackSidePlayerIds(pairing).includes(playerId)) {
    return 'B'
  }

  return '-'
}

function playerRole(pairing: Pairing, playerId: string): 'hand' | 'brain' | '-' {
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

function opponentIdsForPlayer(pairing: Pairing, playerId: string) {
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

function sameStringSet(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((entry) => right.includes(entry))
  )
}

function averageOpponentPoints(
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

function resultPoints(
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

    return marioKartPlacementPoints(scoringRacers.length, racer?.placement)
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

function getPlayerStatusForRound(player: Player, roundNumber: number): PlayerStatus {
  return player.statusOverrides?.[roundNumber] ?? player.status
}

function getMarioKartEligiblePlayers(tournament: Tournament, roundNumber: number) {
  return tournament.players
    .filter((player) => player.addedInRound <= roundNumber)
    .filter((player) => getPlayerStatusForRound(player, roundNumber) === 'active')
    .sort(seedOrder)
}

function hasPlayedEachOtherBeforeRound(
  tournament: Tournament,
  leftId: string,
  rightId: string,
  beforeRoundNumber: number,
) {
  return countGamesBetweenBeforeRound(tournament, leftId, rightId, beforeRoundNumber) > 0
}

function countGamesBetweenBeforeRound(
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

function countGamesBetween(
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

function getSummaryBeforeRound(
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
      marioKartIngamePoints: 0,
      marioKartPlacements: [],
      marioKartExtraRides: 0,
      marioKartGames: 0,
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
        marioKartExtraRacers(pairing).forEach((racer) => {
          if (summaries[racer.playerId]) {
            summaries[racer.playerId].marioKartExtraRides += 1
          }
        })

        if (pairingKind(pairing) === 'marioKart') {
          const scoringRacers = marioKartScoringRacers(pairing)
          const previousGameCounts = scoringRacers.map(
            (racer) => summaries[racer.playerId]?.marioKartGames ?? 0,
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
          const opponentIds = opponentIdsForPlayer(pairing, player.id)
          const isCompleteMarioKartPairing = hasCompleteMarioKartResult(pairing)
          const cycleNumber = marioKartCycleByPairingId.get(pairing.id) ?? 1

          if (opponentIds.length > 0) {
            summaries[player.id].opponentGroups.push(opponentIds)
          }

          summaries[player.id].colors.push('-')
          summaries[player.id].roles.push('-')

          if (ownRacer?.event) {
            summaries[player.id].marioKartEvents += 1
          }

          if (isCompleteMarioKartPairing) {
            const previousGameCount = summaries[player.id].marioKartGames

            if (previousGameCount >= cycleNumber) {
              summaries[player.id].marioKartFillIns += 1
              summaries[player.id].marioKartLastFillInRound = round.roundNumber
            }

            summaries[player.id].marioKartGames += 1
          }

          if (ownRacer?.placement) {
            summaries[player.id].marioKartPlacements.push(ownRacer.placement)
          }

          if (typeof ownRacer?.ingamePoints === 'number') {
            summaries[player.id].marioKartIngamePoints += ownRacer.ingamePoints
          }

          if (ownRacer?.placement === 1) {
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

function colorPenalty(player: Player, color: Color, summary: PlayerScoreSummary) {
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

function assignColors(
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

function assignSinglePairingColors(
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

function sideAveragePoints(
  playerIds: string[],
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (playerIds.length === 0) {
    return 0
  }

  return playerIds.reduce((sum, playerId) => sum + summaries[playerId].points, 0) /
    playerIds.length
}

function hasSameTeamBeforeRound(
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

function validatePairing(
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

    if (scoringRacers.length < 2 || scoringRacers.length > 4) {
      warnings.push(warning('missing-player', 'Diese Mario-Kart-Lobby braucht 2 bis 4 zählende Fahrer.', 'hard'))
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

function chooseByePlayer(
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

type PlannedPairing = {
  left: Player
  right: Player
  colors?: {
    whitePlayerId: string
    blackPlayerId: string
  }
  warnings?: PairingWarning[]
}

type BracketPairingResult = {
  pairs: PlannedPairing[]
  floaters: Player[]
  score: number
}

function playerOrder(
  left: Player,
  right: Player,
  summaries: Record<string, PlayerScoreSummary>,
) {
  return (
    summaries[right.id].points - summaries[left.id].points ||
    left.initialSeed - right.initialSeed
  )
}

function seedOrder(left: Player, right: Player) {
  return left.initialSeed - right.initialSeed
}

function pairPointDiff(
  left: Player,
  right: Player,
  summaries: Record<string, PlayerScoreSummary>,
) {
  return Math.abs(summaries[left.id].points - summaries[right.id].points)
}

function pairSearchScore(
  left: Player,
  right: Player,
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  allowRepeats: boolean,
) {
  const repeatPenalty =
    allowRepeats && hasPlayedEachOtherBeforeRound(tournament, left.id, right.id, roundNumber)
      ? 10_000
      : 0

  return (
    repeatPenalty +
    pairPointDiff(left, right, summaries) * 100 +
    (left.initialSeed + right.initialSeed) / 10_000
  )
}

function findCompletePairing(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  allowRepeats: boolean,
): BracketPairingResult | null {
  if (players.length === 0) {
    return { pairs: [], floaters: [], score: 0 }
  }

  const [first, ...rest] = [...players].sort((left, right) =>
    playerOrder(left, right, summaries),
  )
  const candidates = rest
    .filter(
      (candidate) =>
        allowRepeats ||
        !hasPlayedEachOtherBeforeRound(tournament, first.id, candidate.id, roundNumber),
    )
    .map((candidate) => ({
      candidate,
      score: pairSearchScore(
        first,
        candidate,
        tournament,
        summaries,
        roundNumber,
        allowRepeats,
      ),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, Math.min(10, rest.length))

  let best: BracketPairingResult | null = null

  for (const entry of candidates) {
    const tail = findCompletePairing(
      rest.filter((player) => player.id !== entry.candidate.id),
      tournament,
      summaries,
      roundNumber,
      allowRepeats,
    )

    if (!tail) {
      continue
    }

    const score = entry.score + tail.score
    const result = {
      pairs: [{ left: first, right: entry.candidate }, ...tail.pairs],
      floaters: [],
      score,
    }

    if (!best || result.score < best.score) {
      best = result
    }
  }

  return best
}

function findBestBracketPairing(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  allowRepeats: boolean,
): BracketPairingResult | null {
  const sortedPlayers = [...players].sort((left, right) =>
    playerOrder(left, right, summaries),
  )

  if (sortedPlayers.length < 2) {
    return {
      pairs: [],
      floaters: sortedPlayers,
      score: sortedPlayers.reduce(
        (sum, player) => sum + summaries[player.id].points * 100 + player.initialSeed,
        0,
      ),
    }
  }

  if (sortedPlayers.length % 2 === 0) {
    return findCompletePairing(
      sortedPlayers,
      tournament,
      summaries,
      roundNumber,
      allowRepeats,
    )
  }

  const floaterCandidates = [...sortedPlayers]
    .sort(
      (left, right) =>
        summaries[left.id].points - summaries[right.id].points ||
        right.initialSeed - left.initialSeed,
    )
    .slice(0, Math.min(10, sortedPlayers.length))

  let best: BracketPairingResult | null = null

  for (const floater of floaterCandidates) {
    const pairedPlayers = sortedPlayers.filter((player) => player.id !== floater.id)
    const result = findCompletePairing(
      pairedPlayers,
      tournament,
      summaries,
      roundNumber,
      allowRepeats,
    )

    if (!result) {
      continue
    }

    const floaterScore = summaries[floater.id].points * 100 + floater.initialSeed / 100
    const candidate = {
      pairs: result.pairs,
      floaters: [floater],
      score: result.score + floaterScore,
    }

    if (!best || candidate.score < best.score) {
      best = candidate
    }
  }

  return best
}

function findBestGlobalPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  allowRepeats: boolean,
) {
  return findCompletePairing(
    players,
    tournament,
    summaries,
    roundNumber,
    allowRepeats,
  )?.pairs ?? []
}

function hasNonRepeatPerfectPairing(
  players: Player[],
  tournament: Tournament,
  roundNumber: number,
): boolean {
  if (players.length === 0) {
    return true
  }

  const [first, ...rest] = players

  return rest.some((candidate) => {
    if (hasPlayedEachOtherBeforeRound(tournament, first.id, candidate.id, roundNumber)) {
      return false
    }

    return hasNonRepeatPerfectPairing(
      rest.filter((player) => player.id !== candidate.id),
      tournament,
      roundNumber,
    )
  })
}

function createFirstRoundPairings(players: Player[]): PlannedPairing[] {
  const sortedPlayers = [...players].sort(seedOrder)
  const midpoint = Math.ceil(sortedPlayers.length / 2)
  const topHalf = sortedPlayers.slice(0, Math.floor(sortedPlayers.length / 2))
  const bottomHalf = sortedPlayers.slice(midpoint)

  return topHalf
    .map((player, index) => {
      const opponent = bottomHalf[index]

      return opponent ? { left: player, right: opponent } : null
    })
    .filter((pairing): pairing is PlannedPairing => Boolean(pairing))
}

function createSwissBracketPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
): PlannedPairing[] {
  const canAvoidRepeats = hasNonRepeatPerfectPairing(players, tournament, roundNumber)
  const groups = new Map<number, Player[]>()
  const pairings: PlannedPairing[] = []
  let downfloaters: Player[] = []
  let usedFallback = false

  ;[...players]
    .sort((left, right) => playerOrder(left, right, summaries))
    .forEach((player) => {
      const score = summaries[player.id].points
      groups.set(score, [...(groups.get(score) ?? []), player])
    })

  const scores = [...groups.keys()].sort((left, right) => right - left)

  scores.forEach((score) => {
    const bracketPlayers = [
      ...downfloaters,
      ...(groups.get(score) ?? []).sort((left, right) =>
        playerOrder(left, right, summaries),
      ),
    ].sort((left, right) => playerOrder(left, right, summaries))

    if (bracketPlayers.length === 0) {
      downfloaters = []
      return
    }

    const strictResult = findBestBracketPairing(
      bracketPlayers,
      tournament,
      summaries,
      roundNumber,
      false,
    )
    const result =
      strictResult ??
      findBestBracketPairing(
        bracketPlayers,
        tournament,
        summaries,
        roundNumber,
        true,
      )

    if (!strictResult) {
      usedFallback = true
    }

    if (!result) {
      downfloaters = bracketPlayers
      usedFallback = true
      return
    }

    result.pairs.forEach((pair) => {
      const warnings: PairingWarning[] = []

      if (pairPointDiff(pair.left, pair.right, summaries) > 0) {
        warnings.push(warning('forced-floater', 'Diese Paarung nutzt einen Floater zwischen Scoregroups.'))
      }

      if (
        usedFallback &&
        hasPlayedEachOtherBeforeRound(tournament, pair.left.id, pair.right.id, roundNumber)
      ) {
        warnings.push(warning('non-fide-fallback', 'Diese Paarung ist nur als Vereins-Fallback möglich.', 'hard'))
      }

      pairings.push({ ...pair, warnings })
    })

    downfloaters = result.floaters
  })

  if (downfloaters.length > 0) {
    const fallbackPairs = findBestGlobalPairings(
      downfloaters,
      tournament,
      summaries,
      roundNumber,
      !canAvoidRepeats,
    )

    fallbackPairs.forEach((pair) => {
      pairings.push({
        ...pair,
        warnings: [
          warning('forced-floater', 'Diese Paarung nutzt einen Floater zwischen Scoregroups.'),
          ...(hasPlayedEachOtherBeforeRound(tournament, pair.left.id, pair.right.id, roundNumber)
            ? [warning('non-fide-fallback', 'Diese Paarung ist nur als Vereins-Fallback möglich.', 'hard')]
            : []),
        ],
      })
    })
  }

  const hasRepeat = pairings.some((pairing) =>
    hasPlayedEachOtherBeforeRound(tournament, pairing.left.id, pairing.right.id, roundNumber),
  )

  if (hasRepeat && canAvoidRepeats) {
    return findBestGlobalPairings(
      players,
      tournament,
      summaries,
      roundNumber,
      false,
    )
  }

  if (pairings.length === 0 && players.length >= 2) {
    return findBestGlobalPairings(players, tournament, summaries, roundNumber, true).map(
      (pairing) => ({
        ...pairing,
        warnings: [
          warning('non-fide-fallback', 'Diese Paarung ist nur als Vereins-Fallback möglich.', 'hard'),
        ],
      }),
    )
  }

  return pairings
}

type RoundRobinSlot = Player | typeof roundRobinDummyId

type RoundRobinScheduledPairing = {
  white: Player
  black: Player
}

type RoundRobinScheduledRound = {
  pairings: RoundRobinScheduledPairing[]
  byePlayer?: Player
}

function firstTableValue(rowIndex: number, columnIndex: number, playerSlotCount: number) {
  const value = (rowIndex * (playerSlotCount / 2) + columnIndex) % (playerSlotCount - 1)

  return value + 1
}

function createBergerCycle(players: Player[]) {
  const sortedPlayers = [...players].sort(seedOrder)
  const slotCount = sortedPlayers.length % 2 === 0
    ? sortedPlayers.length
    : sortedPlayers.length + 1
  const playerByBergerNumber = new Map<number, RoundRobinSlot>()

  for (let index = 1; index <= slotCount; index += 1) {
    playerByBergerNumber.set(index, sortedPlayers[index - 1] ?? roundRobinDummyId)
  }

  return Array.from({ length: Math.max(1, slotCount - 1) }, (_, rowIndex) => {
    const rowValues = Array.from({ length: slotCount / 2 }, (_, columnIndex) =>
      firstTableValue(rowIndex, columnIndex, slotCount),
    )
    const nextRowValues = Array.from({ length: slotCount / 2 }, (_, columnIndex) =>
      firstTableValue((rowIndex + 1) % (slotCount - 1), columnIndex, slotCount),
    ).reverse()
    const round: RoundRobinScheduledRound = {
      pairings: [],
    }

    rowValues.forEach((leftNumber, columnIndex) => {
      let rightNumber = nextRowValues[columnIndex]

      if (leftNumber === rightNumber) {
        if (rowIndex % 2 === 0) {
          rightNumber = slotCount
        } else {
          leftNumber = slotCount
        }
      }

      const left = playerByBergerNumber.get(leftNumber)
      const right = playerByBergerNumber.get(rightNumber)

      if (!left || !right) {
        return
      }

      if (left === roundRobinDummyId && right !== roundRobinDummyId) {
        round.byePlayer = right
        return
      }

      if (right === roundRobinDummyId && left !== roundRobinDummyId) {
        round.byePlayer = left
        return
      }

      if (left !== roundRobinDummyId && right !== roundRobinDummyId) {
        round.pairings.push({ white: left, black: right })
      }
    })

    return round
  })
}

function invertScheduledRound(round: RoundRobinScheduledRound): RoundRobinScheduledRound {
  return {
    byePlayer: round.byePlayer,
    pairings: round.pairings.map((pairing) => ({
      white: pairing.black,
      black: pairing.white,
    })),
  }
}

function createRoundRobinSchedule(players: Player[], cycles: number) {
  const baseCycle = createBergerCycle(players)
  const firstCycle =
    cycles >= 2 && baseCycle.length >= 2
      ? [
          ...baseCycle.slice(0, -2),
          baseCycle[baseCycle.length - 1],
          baseCycle[baseCycle.length - 2],
        ]
      : baseCycle

  return Array.from({ length: cycles }, (_, cycleIndex) =>
    (cycleIndex % 2 === 0 ? firstCycle : firstCycle.map(invertScheduledRound)),
  ).flat()
}

function pairKey(leftId: string, rightId: string) {
  return [leftId, rightId].sort().join('::')
}

function getRoundRobinTargetGames(tournament: Tournament, roundNumber?: number) {
  const configuredCycles = normalizeRoundRobinCycles(tournament.settings.roundRobinCycles)

  if (!roundNumber || tournament.format !== 'roundRobin') {
    return configuredCycles
  }

  const activePlayerCount = getRoundRobinEligiblePlayers(tournament, roundNumber).length
  const roundsPerCycle = roundRobinRoundsForPlayerCount(activePlayerCount, 1)

  return Math.max(configuredCycles, Math.ceil(roundNumber / roundsPerCycle))
}

function getRoundRobinEligiblePlayers(tournament: Tournament, roundNumber: number) {
  return tournament.players
    .filter((player) => player.addedInRound <= roundNumber)
    .filter((player) => getPlayerStatusForRound(player, roundNumber) === 'active')
    .sort(seedOrder)
}

export function getRoundRobinRequiredRoundCount(tournament: Tournament) {
  if (tournament.format !== 'roundRobin') {
    return tournament.numberOfRounds
  }

  const cycles = getRoundRobinTargetGames(tournament)
  const players = tournament.players.filter((player) => player.status === 'active')
  const boardCount = Math.floor(players.length / 2)

  if (players.length <= 1 || boardCount === 0) {
    return Math.max(1, ...tournament.rounds.map((round) => round.roundNumber))
  }

  let remainingGames = 0

  players.forEach((left, leftIndex) => {
    players.slice(leftIndex + 1).forEach((right) => {
      remainingGames += Math.max(
        0,
        cycles - countGamesBetween(tournament, left.id, right.id),
      )
    })
  })

  const highestCompletedRound = tournament.rounds.reduce(
    (highestRound, round) =>
      round.status === 'completed'
        ? Math.max(highestRound, round.roundNumber)
        : highestRound,
    0,
  )

  return Math.max(
    roundRobinRoundsForPlayerCount(players.length, cycles),
    highestCompletedRound + Math.ceil(remainingGames / boardCount),
    ...tournament.rounds.map((round) => round.roundNumber),
  )
}

function findBestRoundRobinPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  scheduledPairs: RoundRobinScheduledPairing[],
) {
  const targetGames = getRoundRobinTargetGames(tournament, roundNumber)
  const scheduledPairKeys = new Set(
    scheduledPairs.map((pairing) => pairKey(pairing.white.id, pairing.black.id)),
  )
  const scheduledPairByKey = new Map(
    scheduledPairs.map((pairing) => [
      pairKey(pairing.white.id, pairing.black.id),
      pairing,
    ] as const),
  )
  const remainingPlayersById = new Map(players.map((player) => [player.id, player]))
  const plannedPairings: PlannedPairing[] = []

  scheduledPairs.forEach((pairing) => {
    const white = remainingPlayersById.get(pairing.white.id)
    const black = remainingPlayersById.get(pairing.black.id)

    if (!white || !black) {
      return
    }

    plannedPairings.push({
      left: white,
      right: black,
      colors: {
        whitePlayerId: white.id,
        blackPlayerId: black.id,
      },
    })
    remainingPlayersById.delete(white.id)
    remainingPlayersById.delete(black.id)
  })

  const remainingPlayers = [...remainingPlayersById.values()].sort(seedOrder)

  const scheduledFirstPairings = [
    ...plannedPairings,
    ...pairRoundRobinLeftovers(
      remainingPlayers,
      tournament,
      summaries,
      roundNumber,
      targetGames,
      scheduledPairKeys,
      scheduledPairByKey,
    ),
  ]

  if (
    hasRoundRobinRepeatPairing(
      scheduledFirstPairings,
      tournament,
      roundNumber,
      targetGames,
    )
  ) {
    return findExactRoundRobinPairings(
      players,
      tournament,
      summaries,
      roundNumber,
      targetGames,
      scheduledPairKeys,
      scheduledPairByKey,
    ) ?? scheduledFirstPairings
  }

  return scheduledFirstPairings
}

function roundRobinPairColors(
  left: Player,
  right: Player,
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  scheduledPairByKey: Map<string, RoundRobinScheduledPairing>,
) {
  const scheduledPair = scheduledPairByKey.get(pairKey(left.id, right.id))

  if (scheduledPair) {
    return {
      whitePlayerId: scheduledPair.white.id,
      blackPlayerId: scheduledPair.black.id,
    }
  }

  return assignColors(left, right, summaries, tournament, roundNumber)
}

function roundRobinColorScore(
  left: Player,
  right: Player,
  colors: { whitePlayerId: string; blackPlayerId: string },
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
) {
  return (
    colorPenalty(
      tournament.players.find((player) => player.id === colors.whitePlayerId) ?? left,
      'W',
      summaries[colors.whitePlayerId],
    ) +
    colorPenalty(
      tournament.players.find((player) => player.id === colors.blackPlayerId) ?? right,
      'B',
      summaries[colors.blackPlayerId],
    )
  )
}

function roundRobinGameCount(
  tournament: Tournament,
  left: Player,
  right: Player,
  roundNumber: number,
) {
  return countGamesBetweenBeforeRound(tournament, left.id, right.id, roundNumber)
}

function roundRobinCandidate(
  first: Player,
  candidate: Player,
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  targetGames: number,
  scheduledPairKeys: Set<string>,
  scheduledPairByKey: Map<string, RoundRobinScheduledPairing>,
) {
  const key = pairKey(first.id, candidate.id)
  const gameCount = roundRobinGameCount(tournament, first, candidate, roundNumber)
  const colors = roundRobinPairColors(
    first,
    candidate,
    tournament,
    summaries,
    roundNumber,
    scheduledPairByKey,
  )
  const score = [
    gameCount < targetGames ? 0 : 1,
    scheduledPairKeys.has(key) ? 0 : 1,
    gameCount,
    roundRobinColorScore(first, candidate, colors, tournament, summaries),
    candidate.initialSeed,
  ]

  return { candidate, colors, gameCount, score }
}

function findExactRoundRobinPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  targetGames: number,
  scheduledPairKeys: Set<string>,
  scheduledPairByKey: Map<string, RoundRobinScheduledPairing>,
): PlannedPairing[] | null {
  if (
    players.length % 2 === 1 ||
    players.length > maxExactRoundRobinRepairPlayers
  ) {
    return null
  }

  let remainingStateBudget = maxExactRoundRobinRepairStates
  let didExhaustBudget = false
  const failedStates = new Set<string>()

  function search(remainingPlayers: Player[]): PlannedPairing[] | null {
    if (remainingPlayers.length === 0) {
      return []
    }

    if (didExhaustBudget || remainingStateBudget <= 0) {
      didExhaustBudget = true
      return null
    }

    remainingStateBudget -= 1

    const sortedPlayers = [...remainingPlayers].sort(seedOrder)
    const stateKey = sortedPlayers.map((player) => player.id).join('|')

    if (failedStates.has(stateKey)) {
      return null
    }

    const [first, ...rest] = sortedPlayers
    const candidates = rest
      .map((candidate) =>
        roundRobinCandidate(
          first,
          candidate,
          tournament,
          summaries,
          roundNumber,
          targetGames,
          scheduledPairKeys,
          scheduledPairByKey,
        ),
      )
      .filter((entry) => entry.gameCount < targetGames)
      .sort((left, right) => compareNumberLists(left.score, right.score))

    for (const entry of candidates) {
      const tail = search(
        rest.filter((player) => player.id !== entry.candidate.id),
      )

      if (tail) {
        return [
          {
            left: first,
            right: entry.candidate,
            colors: entry.colors,
          },
          ...tail,
        ]
      }

      if (didExhaustBudget) {
        return null
      }
    }

    failedStates.add(stateKey)
    return null
  }

  return search(players)
}

function hasRoundRobinRepeatPairing(
  pairings: PlannedPairing[],
  tournament: Tournament,
  roundNumber: number,
  targetGames: number,
) {
  return pairings.some(
    (pairing) =>
      roundRobinGameCount(tournament, pairing.left, pairing.right, roundNumber) >=
      targetGames,
  )
}

function pairRoundRobinLeftovers(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  targetGames: number,
  scheduledPairKeys: Set<string>,
  scheduledPairByKey: Map<string, RoundRobinScheduledPairing>,
): PlannedPairing[] {
  const exactPairings = findExactRoundRobinPairings(
    players,
    tournament,
    summaries,
    roundNumber,
    targetGames,
    scheduledPairKeys,
    scheduledPairByKey,
  )

  if (exactPairings) {
    return exactPairings
  }

  const pairings: PlannedPairing[] = []
  let remainingPlayers = [...players].sort(seedOrder)

  while (remainingPlayers.length >= 2) {
    const [first, ...rest] = remainingPlayers
    const bestCandidate = rest
      .map((candidate) =>
        roundRobinCandidate(
          first,
          candidate,
          tournament,
          summaries,
          roundNumber,
          targetGames,
          scheduledPairKeys,
          scheduledPairByKey,
        ),
      )
      .sort((left, right) => compareNumberLists(left.score, right.score))[0]

    if (!bestCandidate) {
      break
    }

    pairings.push({
      left: first,
      right: bestCandidate.candidate,
      colors: bestCandidate.colors,
    })
    remainingPlayers = rest.filter((player) => player.id !== bestCandidate.candidate.id)
  }

  return pairings
}

function chooseRoundRobinByePlayer(
  players: Player[],
  scheduledByePlayer: Player | undefined,
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (scheduledByePlayer && players.some((player) => player.id === scheduledByePlayer.id)) {
    return scheduledByePlayer
  }

  return [...players].sort(
    (left, right) =>
      summaries[left.id].byes - summaries[right.id].byes ||
      right.initialSeed - left.initialSeed,
  )[0]
}

function generateRoundRobinPairings(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Pairing[] {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const usedPlayerIds = new Set(
    fixedPairings.flatMap((pairing) =>
      [pairing.whitePlayerId, pairing.blackPlayerId, pairing.byePlayerId].filter(Boolean),
    ) as string[],
  )
  const activePlayers = getRoundRobinEligiblePlayers(tournament, roundNumber)
  const pairings: Pairing[] = fixedPairings.map((pairing, index) => ({
    ...pairing,
    boardNumber: index + 1,
    roundNumber,
    isManual: true,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }))
  const schedule = createRoundRobinSchedule(
    activePlayers,
    getRoundRobinTargetGames(tournament, roundNumber),
  )
  const scheduledRound = schedule[roundNumber - 1]
  let pool = activePlayers.filter((player) => !usedPlayerIds.has(player.id))
  let byePairing: Pairing | null = null

  if (pool.length % 2 === 1) {
    const byePlayer = chooseRoundRobinByePlayer(
      pool,
      scheduledRound?.byePlayer,
      summaries,
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
    pool = pool.filter((player) => player.id !== byePlayer.id)
  }

  const scheduledPairs = (scheduledRound?.pairings ?? []).filter(
    (pairing) =>
      pool.some((player) => player.id === pairing.white.id) &&
      pool.some((player) => player.id === pairing.black.id),
  )
  const plannedPairings = findBestRoundRobinPairings(
    pool,
    tournament,
    summaries,
    roundNumber,
    scheduledPairs,
  )

  plannedPairings.forEach(({ left, right, colors, warnings: pairingWarnings = [] }) => {
    const pairing: Pairing = {
      id: makeId('pairing'),
      roundNumber,
      boardNumber: pairings.length + 1,
      ...(colors ?? assignColors(left, right, summaries, tournament, roundNumber)),
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

function teammateRepeatPenalty(
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

function handBrainHardshipCount(
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

function compareNumberLists(left: number[], right: number[]) {
  const length = Math.max(left.length, right.length)

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0)

    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

function chooseSinglePairing(
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

function handBrainSideRoleOptions(
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

function playerById(tournament: Tournament, playerId: string, fallback: Player) {
  return tournament.players.find((player) => player.id === playerId) ?? fallback
}

function handBrainTeamColorPenalty(
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

function createHandBrainPairings(
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

function averageNumber(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function numberSpread(values: number[]) {
  return values.length > 0 ? Math.max(...values) - Math.min(...values) : 0
}

function combinations<T>(items: T[], count: number) {
  if (count <= 0) {
    return [[]] as T[][]
  }

  if (items.length < count) {
    return [] as T[][]
  }

  const result: T[][] = []

  function search(startIndex: number, current: T[]) {
    if (current.length === count) {
      result.push(current)
      return
    }

    for (
      let index = startIndex;
      index <= items.length - (count - current.length);
      index += 1
    ) {
      search(index + 1, [...current, items[index]])
    }
  }

  search(0, [])
  return result
}

function bestCombination<T>(
  candidates: T[],
  count: number,
  score: (group: T[]) => number[],
) {
  if (count <= 0) {
    return [] as T[]
  }

  if (candidates.length <= count) {
    return candidates
  }

  return combinations(candidates, count)
    .map((group) => ({ group, score: score(group) }))
    .sort((left, right) => compareNumberLists(left.score, right.score))[0].group
}

function marioKartPairwiseRepeatPenalty(
  players: Player[],
  tournament: Tournament,
  roundNumber: number,
) {
  let penalty = 0

  for (let leftIndex = 0; leftIndex < players.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < players.length; rightIndex += 1) {
      penalty +=
        countGamesBetweenBeforeRound(
          tournament,
          players[leftIndex].id,
          players[rightIndex].id,
          roundNumber,
        ) * 1_000
    }
  }

  return penalty
}

function marioKartPrimaryGroupScore(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
) {
  return [
    numberSpread(players.map((player) => summaries[player.id].points)) * 10_000,
    marioKartPairwiseRepeatPenalty(players, tournament, roundNumber),
    numberSpread(players.map((player) => player.initialSeed)) * 10,
    players.reduce((sum, player) => sum + player.initialSeed, 0) / 10_000,
  ]
}

function marioKartRecentFillInPenalty(
  summary: PlayerScoreSummary,
  roundNumber: number,
) {
  if (!summary.marioKartLastFillInRound) {
    return 0
  }

  const distance = Math.max(1, roundNumber - summary.marioKartLastFillInRound)

  if (distance <= 1) {
    return 1_000
  }

  if (distance === 2) {
    return 250
  }

  return Math.round(100 / distance)
}

function marioKartFillGroupScore(
  fillPlayers: Player[],
  primaryPlayers: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  fewestGames: number,
) {
  const referencePoints =
    primaryPlayers.length > 0
      ? averageNumber(primaryPlayers.map((player) => summaries[player.id].points))
      : averageNumber(fillPlayers.map((player) => summaries[player.id].points))
  const referenceSeed =
    primaryPlayers.length > 0
      ? averageNumber(primaryPlayers.map((player) => player.initialSeed))
      : averageNumber(fillPlayers.map((player) => player.initialSeed))

  return [
    fillPlayers.reduce(
      (sum, player) => sum + Math.max(0, summaries[player.id].marioKartGames - fewestGames),
      0,
    ) * 1_000_000,
    fillPlayers.reduce(
      (sum, player) => sum + summaries[player.id].marioKartFillIns,
      0,
    ) * 100_000,
    fillPlayers.reduce(
      (sum, player) => sum + marioKartRecentFillInPenalty(summaries[player.id], roundNumber),
      0,
    ) * 1_000,
    marioKartPairwiseRepeatPenalty(
      [...primaryPlayers, ...fillPlayers],
      tournament,
      roundNumber,
    ),
    fillPlayers.reduce(
      (sum, player) => sum + Math.abs(summaries[player.id].points - referencePoints),
      0,
    ) * 100,
    fillPlayers.reduce(
      (sum, player) => sum + Math.abs(player.initialSeed - referenceSeed),
      0,
    ) / 10_000,
  ]
}

function chooseMarioKartScoringPlayers(
  activePlayers: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
) {
  const targetSize = activePlayers.length >= 4 ? 4 : activePlayers.length

  if (targetSize < 2) {
    return [] as Player[]
  }

  const fewestGames = Math.min(
    ...activePlayers.map((player) => summaries[player.id].marioKartGames),
  )
  const leastPlayedPlayers = activePlayers
    .filter((player) => summaries[player.id].marioKartGames === fewestGames)
    .sort((left, right) => playerOrder(left, right, summaries))

  if (leastPlayedPlayers.length >= targetSize) {
    const primaryCandidates = leastPlayedPlayers.slice(
      0,
      Math.min(leastPlayedPlayers.length, 12),
    )

    return bestCombination(primaryCandidates, targetSize, (group) =>
      marioKartPrimaryGroupScore(group, tournament, summaries, roundNumber),
    ).sort((left, right) => playerOrder(left, right, summaries))
  }

  const primaryPlayers = leastPlayedPlayers
  const fillCount = targetSize - primaryPlayers.length
  const fillCandidates = activePlayers
    .filter((player) => !primaryPlayers.some((entry) => entry.id === player.id))
    .sort((left, right) =>
      compareNumberLists(
        [
          summaries[left.id].marioKartGames - fewestGames,
          summaries[left.id].marioKartFillIns,
          marioKartRecentFillInPenalty(summaries[left.id], roundNumber),
          Math.abs(
            summaries[left.id].points -
              averageNumber(primaryPlayers.map((player) => summaries[player.id].points)),
          ),
          Math.abs(
            left.initialSeed -
              averageNumber(primaryPlayers.map((player) => player.initialSeed)),
          ) / 10_000,
        ],
        [
          summaries[right.id].marioKartGames - fewestGames,
          summaries[right.id].marioKartFillIns,
          marioKartRecentFillInPenalty(summaries[right.id], roundNumber),
          Math.abs(
            summaries[right.id].points -
              averageNumber(primaryPlayers.map((player) => summaries[player.id].points)),
          ),
          Math.abs(
            right.initialSeed -
              averageNumber(primaryPlayers.map((player) => player.initialSeed)),
          ) / 10_000,
        ],
      ),
    )
    .slice(0, 12)
  const fillPlayers = bestCombination(fillCandidates, fillCount, (group) =>
    marioKartFillGroupScore(
      group,
      primaryPlayers,
      tournament,
      summaries,
      roundNumber,
      fewestGames,
    ),
  )

  return [...primaryPlayers, ...fillPlayers].sort((left, right) =>
    playerOrder(left, right, summaries),
  )
}

function marioKartCycleNumberForPlayers(
  scoringPlayers: Player[],
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (scoringPlayers.length === 0) {
    return 1
  }

  return (
    Math.min(...scoringPlayers.map((player) => summaries[player.id].marioKartGames)) + 1
  )
}

export function getMarioKartFillInPlayerIds(tournament: Tournament, pairing: Pairing) {
  if (pairingKind(pairing) !== 'marioKart' || pairing.isBye) {
    return [] as string[]
  }

  const summaries = getSummaryBeforeRound(tournament, pairing.roundNumber)
  const scoringIds = marioKartScoringPlayerIds(pairing)
  const cycleNumber =
    pairing.marioKartCycleNumber ??
    (scoringIds.length > 0
      ? Math.min(
          ...scoringIds.map(
            (playerId) => summaries[playerId]?.marioKartGames ?? 0,
          ),
        ) + 1
      : 1)

  return scoringIds.filter(
    (playerId) => (summaries[playerId]?.marioKartGames ?? 0) >= cycleNumber,
  )
}

function marioKartLobbyNumberForCycle(
  tournament: Tournament,
  roundNumber: number,
  cycleNumber: number,
) {
  const previousLobbiesInCycle = tournament.rounds
    .filter((round) => round.roundNumber < roundNumber)
    .flatMap((round) => round.pairings)
    .filter((pairing) => pairingKind(pairing) === 'marioKart')
    .filter((pairing) => pairing.marioKartCycleNumber === cycleNumber).length

  return previousLobbiesInCycle + 1
}

function createMarioKartPairing(
  tournament: Tournament,
  roundNumber: number,
  boardNumber: number,
  scoringPlayers: Player[],
  summaries: Record<string, PlayerScoreSummary>,
  cycleNumber: number,
  cycleLobbyNumber: number,
  isManual = false,
) {
  const scoringRacers: MarioKartRacer[] = scoringPlayers.map((player) => ({
    playerId: player.id,
    role: 'scoring',
  }))
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber,
    kind: 'marioKart',
    marioKartCycleNumber: cycleNumber,
    marioKartCycleLobbyNumber: cycleLobbyNumber,
    marioKartRacers: scoringRacers,
    isManual,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}

function withMarioKartLobbyMetadata(
  tournament: Tournament,
  roundNumber: number,
  pairing: Pairing,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const scoringPlayers = marioKartScoringRacers(pairing)
    .map((racer) => tournament.players.find((player) => player.id === racer.playerId))
    .filter((player): player is Player => Boolean(player))
  const cycleNumber =
    pairing.marioKartCycleNumber ??
    marioKartCycleNumberForPlayers(scoringPlayers, summaries)
  const cycleLobbyNumber =
    pairing.marioKartCycleLobbyNumber ??
    marioKartLobbyNumberForCycle(tournament, roundNumber, cycleNumber)
  const nextPairing = {
    ...pairing,
    roundNumber,
    boardNumber: 1,
    kind: 'marioKart' as const,
    marioKartCycleNumber: cycleNumber,
    marioKartCycleLobbyNumber: cycleLobbyNumber,
  }

  return {
    ...nextPairing,
    warnings: validatePairing(tournament, nextPairing, roundNumber, summaries),
  }
}

function createMarioKartPairings(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Pairing[] {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const fixedMarioKartPairing = fixedPairings.find(
    (pairing) => pairingKind(pairing) === 'marioKart',
  )

  if (fixedMarioKartPairing) {
    return normalizeRoundPairings([
      withMarioKartLobbyMetadata(
        tournament,
        roundNumber,
        { ...fixedMarioKartPairing, isManual: true },
        summaries,
      ),
    ])
  }

  const activePlayers = getMarioKartEligiblePlayers(tournament, roundNumber)
  const scoringPlayers = chooseMarioKartScoringPlayers(
    activePlayers,
    tournament,
    summaries,
    roundNumber,
  )

  if (scoringPlayers.length < 2) {
    return []
  }

  const cycleNumber = marioKartCycleNumberForPlayers(scoringPlayers, summaries)
  const cycleLobbyNumber = marioKartLobbyNumberForCycle(
    tournament,
    roundNumber,
    cycleNumber,
  )

  return normalizeRoundPairings([
    createMarioKartPairing(
      tournament,
      roundNumber,
      1,
      scoringPlayers,
      summaries,
      cycleNumber,
      cycleLobbyNumber,
    )
  ])
}

function normalizeRoundPairings(pairings: Pairing[]) {
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
    return createMarioKartPairings(tournament, roundNumber, fixedPairings)
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

function getDirectScore(tournament: Tournament, playerId: string, tiedIds: string[]) {
  let score = 0
  let games = 0

  tournament.rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (
        pairing.isBye ||
        (pairingKind(pairing) === 'marioKart'
          ? !hasCompleteMarioKartResult(pairing)
          : !pairing.result)
      ) {
        return
      }

      const opponentId = opponentIdsForPlayer(pairing, playerId).find((id) =>
        tiedIds.includes(id),
      )

      if (!opponentId) {
        return
      }

      games += 1
      score += resultPoints(pairing, playerId)
    })
  })

  return games > 0 ? score : null
}

function resultLabelForPlayer(pairing: Pairing, playerId: string) {
  const points = resultPoints(pairing, playerId)

  if (points === 1) {
    return '1'
  }

  if (points === 0.5) {
    return '1/2'
  }

  return '0'
}

function formatResult(result: GameResult) {
  if (result === '0.5-0.5') {
    return '1/2 - 1/2'
  }

  if (result === 'bye-0.5') {
    return 'Bye 1/2'
  }

  if (result.startsWith('bye-')) {
    return result.replace('bye-', 'Bye ')
  }

  return result.replaceAll('forfeit-', 'kampflos ').replaceAll('-', ' - ')
}

function resultTitle(result?: GameResult) {
  if (!result) {
    return 'offen'
  }

  return formatResult(result)
}

function createOpenRoundCell(tournament: Tournament, roundNumber: number): StandingRoundCell {
  return {
    roundNumber,
    label: '-',
    title:
      tournament.format === 'marioKart'
        ? `${getRoundDisplayLabel(tournament, roundNumber)}: keine Lobby`
        : `Runde ${roundNumber}: keine Partie`,
    color: '-',
    outcome: 'open',
  }
}

function createRoundHistory(
  tournament: Tournament,
  row: StandingRow,
  rankByPlayerId: Map<string, number>,
) {
  const playerById = new Map(tournament.players.map((player) => [player.id, player]))
  const visibleRoundCount = Math.max(
    0,
    ...tournament.rounds.map((round) => round.roundNumber),
  )

  return Array.from({ length: visibleRoundCount }, (_, index) => {
    const roundNumber = index + 1
    const round = tournament.rounds.find((entry) => entry.roundNumber === roundNumber)

    if (!round) {
      return createOpenRoundCell(tournament, roundNumber)
    }

    const pairing = round.pairings.find((entry) =>
      scoringPairingPlayerIds(entry).includes(row.playerId),
    )

    if (!pairing) {
      return createOpenRoundCell(tournament, roundNumber)
    }

    if (pairing.isBye) {
      const label = `BYE${resultLabelForPlayer(pairing, row.playerId)}`

      return {
        roundNumber,
        label,
        title: `Runde ${roundNumber}: Bye, Ergebnis ${resultTitle(pairing.result)}`,
        color: '-' as const,
        outcome: 'bye' as const,
      }
    }

    if (pairingKind(pairing) === 'marioKart') {
      const scoringRacers = marioKartScoringRacers(pairing)
      const ownRacer = scoringRacers.find((racer) => racer.playerId === row.playerId)
      const opponentNames = opponentIdsForPlayer(pairing, row.playerId).map(
        (opponentId) => playerById.get(opponentId)?.name ?? 'unbekannt',
      )
      const points = resultPoints(pairing, row.playerId)
      const placementLabel = ownRacer?.placement ? `P${ownRacer.placement}` : 'P-'
      const resultLabel = ownRacer?.placement ? `+${formatPoints(points)}` : 'offen'
      const ingameLabel =
        typeof ownRacer?.ingamePoints === 'number'
          ? `, Punkte ${ownRacer.ingamePoints}`
          : ''
      const lobbyLabel = getRoundDisplayLabel(tournament, roundNumber)
      const shortLobbyLabel =
        pairing.marioKartCycleNumber && pairing.marioKartCycleLobbyNumber
          ? `${pairing.marioKartCycleNumber}.${pairing.marioKartCycleLobbyNumber}`
          : `${pairing.boardNumber}`
      const eventLabel = ownRacer?.event ? ', Ereignis: ja' : ', Ereignis: nein'

      return {
        roundNumber,
        label: `${shortLobbyLabel} ${placementLabel} ${ownRacer?.placement ? `+${formatPoints(points)}` : '-'}${ownRacer?.event ? ' E' : ''}`,
        title: `${lobbyLabel}: gegen ${opponentNames.join(' / ') || 'unbekannt'}, ${resultLabel}${ingameLabel}${eventLabel}`,
        color: '-' as const,
        outcome: !ownRacer?.placement
          ? 'open'
          : ownRacer.placement === 1
            ? 'win'
            : points > 0
            ? 'draw'
            : 'loss',
        event: Boolean(ownRacer?.event),
      } satisfies StandingRoundCell
    }

    const color = playerColor(pairing, row.playerId)
    const opponentIds = opponentIdsForPlayer(pairing, row.playerId)

    if (opponentIds.length === 0 || color === '-') {
      return createOpenRoundCell(tournament, roundNumber)
    }

    const opponentRanks = opponentIds.map((opponentId) => rankByPlayerId.get(opponentId) ?? '?')
    const opponentNames = opponentIds.map(
      (opponentId) => playerById.get(opponentId)?.name ?? 'unbekannt',
    )
    const resultLabel = pairing.result ? resultLabelForPlayer(pairing, row.playerId) : '-'
    const role = playerRole(pairing, row.playerId)
    const roleLabel = role === 'brain' ? 'B' : role === 'hand' ? 'H' : ''
    const label =
      pairingKind(pairing) === 'handAndBrain'
        ? `${opponentRanks.join('/')}${color}${roleLabel}${resultLabel}`
        : `${opponentRanks.join('/')}${color}${resultLabel}`
    const points = resultPoints(pairing, row.playerId)
    const opponent = { name: opponentNames.join(' / ') }

    return {
      roundNumber,
      label,
      title: `Runde ${roundNumber}: ${color === 'W' ? 'Weiß' : 'Schwarz'} gegen ${
        opponent?.name ?? 'unbekannt'
      }, Ergebnis ${resultTitle(pairing.result)}`,
      color,
      outcome: !pairing.result
        ? 'open'
        : points === 1
          ? 'win'
          : points === 0.5
            ? 'draw'
            : 'loss',
    } satisfies StandingRoundCell
  })
}

export function recalculateStandings(tournament: Tournament): StandingRow[] {
  const summaries = getSummaryBeforeRound(tournament)
  const rows = tournament.players.map((player) => {
    const summary = summaries[player.id]
    const buchholz = summary.opponentGroups.reduce(
      (sum, opponentIds) => sum + averageOpponentPoints(opponentIds, summaries),
      0,
    )
    const sonnebornBerger =
      summary.defeatedOpponentGroups.reduce(
        (sum, opponentIds) => sum + averageOpponentPoints(opponentIds, summaries),
        0,
      ) +
      summary.drawnOpponentGroups.reduce(
        (sum, opponentIds) => sum + averageOpponentPoints(opponentIds, summaries) / 2,
        0,
      )

    return {
      playerId: player.id,
      rank: 0,
      playerName: player.name,
      rating: player.rating,
      points: summary.points,
      buchholz,
      sonnebornBerger,
      wins: summary.wins,
      directEncounterScore: null,
      initialSeed: player.initialSeed,
      colorHistory: summary.colors,
      roundHistory: [],
      receivedByes: summary.byes,
      receivedSingleGames: summary.singleGames,
      marioKartWins: summary.marioKartPlacements.filter((placement) => placement === 1).length,
      marioKartIngamePoints: summary.marioKartIngamePoints,
      marioKartAveragePlacement:
        summary.marioKartPlacements.length > 0
          ? summary.marioKartPlacements.reduce((sum, placement) => sum + placement, 0) /
            summary.marioKartPlacements.length
          : null,
      marioKartExtraRides: summary.marioKartExtraRides,
      marioKartGames: summary.marioKartGames,
      marioKartEvents: summary.marioKartEvents,
      status: player.status,
    } satisfies StandingRow
  })

  const pointGroups = new Map<number, string[]>()
  rows.forEach((row) => {
    pointGroups.set(row.points, [...(pointGroups.get(row.points) ?? []), row.playerId])
  })

  const rowsWithDirect = rows.map((row) => ({
    ...row,
    directEncounterScore: getDirectScore(
      tournament,
      row.playerId,
      pointGroups.get(row.points) ?? [],
    ),
  }))

  const rankedRows = rowsWithDirect
    .sort((left, right) => {
      if (tournament.format === 'marioKart') {
        const leftAveragePlacement =
          left.marioKartAveragePlacement ?? Number.POSITIVE_INFINITY
        const rightAveragePlacement =
          right.marioKartAveragePlacement ?? Number.POSITIVE_INFINITY

        return (
          right.points - left.points ||
          right.marioKartWins - left.marioKartWins ||
          right.marioKartIngamePoints - left.marioKartIngamePoints ||
          leftAveragePlacement - rightAveragePlacement ||
          (right.directEncounterScore ?? -1) - (left.directEncounterScore ?? -1) ||
          left.initialSeed - right.initialSeed
        )
      }

      return (
        right.points - left.points ||
        right.buchholz - left.buchholz ||
        right.sonnebornBerger - left.sonnebornBerger ||
        right.wins - left.wins ||
        (right.directEncounterScore ?? -1) - (left.directEncounterScore ?? -1) ||
        left.initialSeed - right.initialSeed
      )
    })
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const rankByPlayerId = new Map(
    rankedRows.map((row) => [row.playerId, row.rank] as const),
  )

  return rankedRows.map((row) => ({
    ...row,
    roundHistory: createRoundHistory(tournament, row, rankByPlayerId),
  }))
}

export function updateResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
): Tournament {
  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]

  if (
    !latestRound ||
    latestRound.roundNumber !== roundNumber ||
    latestRound.status !== 'draft'
  ) {
    return tournament
  }

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((pairing) => {
              if (pairing.id !== pairingId) {
                return pairing
              }

              if (result) {
                return { ...pairing, result }
              }

              const pairingWithoutResult = { ...pairing }
              delete pairingWithoutResult.result
              return pairingWithoutResult
            }),
          }
        : round,
    ),
  }
}

export function correctResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
): Tournament {
  let didChange = false
  const nextTournament = {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((pairing) => {
              if (pairing.id !== pairingId || pairing.isBye) {
                return pairing
              }

              if (pairing.result === result) {
                return pairing
              }

              didChange = true

              if (result) {
                return { ...pairing, result }
              }

              const pairingWithoutResult = { ...pairing }
              delete pairingWithoutResult.result
              return pairingWithoutResult
            }),
          }
        : round,
    ),
  }

  return didChange ? regenerateCurrentDraftRoundIfUnscored(nextTournament) : tournament
}

export function updateMarioKartResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  playerId: string,
  partial: { placement?: number; ingamePoints?: number; event?: boolean },
): Tournament {
  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]
  const isEventOnlyUpdate =
    'event' in partial &&
    !('placement' in partial) &&
    !('ingamePoints' in partial)

  if (
    !isEventOnlyUpdate &&
    (!latestRound ||
      latestRound.roundNumber !== roundNumber ||
      latestRound.status !== 'draft')
  ) {
    return tournament
  }

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((pairing) => {
              if (
                pairing.id !== pairingId ||
                pairing.isBye ||
                pairingKind(pairing) !== 'marioKart'
              ) {
                return pairing
              }

              return {
                ...pairing,
                marioKartRacers: marioKartRacers(pairing).map((racer) => {
                  if (racer.playerId !== playerId || racer.role !== 'scoring') {
                    return racer
                  }

                  const nextRacer = { ...racer }

                  if ('placement' in partial) {
                    if (partial.placement === undefined) {
                      delete nextRacer.placement
                    } else {
                      nextRacer.placement = partial.placement
                    }
                  }

                  if ('ingamePoints' in partial) {
                    if (partial.ingamePoints === undefined) {
                      delete nextRacer.ingamePoints
                    } else {
                      nextRacer.ingamePoints = partial.ingamePoints
                    }
                  }

                  if ('event' in partial) {
                    if (partial.event) {
                      nextRacer.event = true
                    } else {
                      delete nextRacer.event
                    }
                  }

                  return nextRacer
                }),
              }
            }),
          }
        : round,
    ),
  }
}

function getLatestRound(tournament: Tournament) {
  return [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]
}

function hasGameResult(pairing: Pairing) {
  if (pairing.isBye) {
    return false
  }

  if (pairingKind(pairing) === 'marioKart') {
    return marioKartScoringRacers(pairing).some((racer) => racer.placement)
  }

  return !pairing.isBye && Boolean(pairing.result)
}

function canRegenerateUnscoredDraftRound(tournament: Tournament, round: Round) {
  const latestRound = getLatestRound(tournament)

  return (
    round.status === 'draft' &&
    round.pairings.length > 0 &&
    round.roundNumber === latestRound?.roundNumber &&
    !round.pairings.some(hasGameResult)
  )
}

export function willResultCorrectionRegenerateCurrentDraftRound(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result?: GameResult,
) {
  const pairing = tournament.rounds
    .find((round) => round.roundNumber === roundNumber)
    ?.pairings.find((entry) => entry.id === pairingId)

  if (!pairing || pairing.isBye || pairing.result === result) {
    return false
  }

  const draftRound = getCurrentDraftRound(tournament)

  return Boolean(
    draftRound && canRegenerateUnscoredDraftRound(tournament, draftRound),
  )
}

function isValidManualPairingForRound(
  tournament: Tournament,
  pairing: Pairing,
  roundNumber: number,
) {
  return pairingPlayerIds(pairing).every((playerId) => {
    const player = tournament.players.find((entry) => entry.id === playerId)

    return (
      player &&
      player.addedInRound <= roundNumber &&
      getPlayerStatusForRound(player, roundNumber) === 'active'
    )
  })
}

export function canRemovePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
) {
  return !tournament.rounds.some((round) => {
    const playerUsedInRound = round.pairings.some((pairing) =>
      pairingPlayerIds(pairing).includes(playerId),
    )

    return playerUsedInRound && !canRegenerateUnscoredDraftRound(tournament, round)
  })
}

export function regenerateCurrentDraftRoundIfUnscored(
  tournament: Tournament,
): Tournament {
  const existing = getCurrentDraftRound(tournament)

  if (!existing || !canRegenerateUnscoredDraftRound(tournament, existing)) {
    return tournament
  }

  const fixedPairings = existing.pairings.filter(
    (pairing) =>
      pairing.isManual &&
      isValidManualPairingForRound(tournament, pairing, existing.roundNumber),
  )

  return upsertRound(tournament, existing.roundNumber, fixedPairings)
}

export function setPlayerStatus(
  tournament: Tournament,
  playerId: string,
  status: PlayerStatus,
  fromRound?: number,
): Tournament {
  let didChange = false
  const nextTournament = {
    ...tournament,
    players: tournament.players.map((player) => {
      if (player.id !== playerId) {
        return player
      }

      if (fromRound && fromRound > tournament.currentRound) {
        if (player.statusOverrides?.[fromRound] === status) {
          return player
        }

        didChange = true
        return {
          ...player,
          statusOverrides: {
            ...player.statusOverrides,
            [fromRound]: status,
          },
        }
      }

      if (player.status === status) {
        return player
      }

      didChange = true
      return { ...player, status }
    }),
  }

  return didChange ? regenerateCurrentDraftRoundIfUnscored(nextTournament) : tournament
}

export function addPlayerAfterStart(
  tournament: Tournament,
  name: string,
  rating?: number,
): Tournament {
  const nextSeed =
    tournament.players.reduce((max, player) => Math.max(max, player.initialSeed), 0) + 1
  const nextRound =
    tournament.rounds.find((round) => round.status === 'draft')?.roundNumber ??
    (tournament.format === 'roundRobin'
      ? tournament.currentRound + 1 || 1
      : tournament.format === 'marioKart'
        ? tournament.currentRound + 1 || 1
        : Math.min(tournament.numberOfRounds, tournament.currentRound + 1 || 1))
  const player: Player = {
    id: makeId('player'),
    name: name.trim() || `Spieler ${nextSeed}`,
    initialSeed: nextSeed,
    status: 'active',
    addedInRound: nextRound,
  }

  if (typeof rating === 'number' && Number.isFinite(rating)) {
    player.rating = Math.round(rating)
  }

  const nextTournament = {
    ...tournament,
    players: [...tournament.players, player],
  }

  return regenerateCurrentDraftRoundIfUnscored(nextTournament)
}

export function removePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
): Tournament {
  if (!canRemovePlayerFromTournament(tournament, playerId)) {
    return tournament
  }

  const nextTournament = {
    ...tournament,
    players: tournament.players.filter((player) => player.id !== playerId),
  }

  return regenerateCurrentDraftRoundIfUnscored(nextTournament)
}

export function resetTournamentProgress(tournament: Tournament): Tournament {
  return {
    ...tournament,
    currentRound: 0,
    players: tournament.players.map((player) => ({
      ...player,
      status: 'active',
      addedInRound: 1,
      statusOverrides: undefined,
    })),
    rounds: [],
  }
}

export function reopenPreviousRound(tournament: Tournament): Tournament {
  const sortedRounds = [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
  const latestRound = sortedRounds[sortedRounds.length - 1]
  const previousRound = sortedRounds[sortedRounds.length - 2]

  if (!latestRound || !previousRound || previousRound.status !== 'completed') {
    return tournament
  }

  return {
    ...tournament,
    currentRound: previousRound.roundNumber,
    rounds: sortedRounds
      .filter((round) => round.roundNumber !== latestRound.roundNumber)
      .map((round) =>
        round.roundNumber === previousRound.roundNumber
          ? { ...round, status: 'draft' as const }
          : round,
      ),
  }
}

export function deleteLatestRound(tournament: Tournament): Tournament {
  const sortedRounds = [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
  const latestRound = sortedRounds[sortedRounds.length - 1]
  const previousRound = sortedRounds[sortedRounds.length - 2]

  if (!latestRound) {
    return tournament
  }

  return {
    ...tournament,
    currentRound: previousRound?.roundNumber ?? 0,
    rounds: sortedRounds
      .filter((round) => round.roundNumber !== latestRound.roundNumber)
      .map((round) =>
        previousRound &&
        round.roundNumber === previousRound.roundNumber &&
        round.status === 'completed'
          ? { ...round, status: 'draft' as const }
          : round,
      ),
  }
}

export function getNextAllowedRoundNumber(tournament: Tournament) {
  if (tournament.rounds.length === 0) {
    if (
      tournament.format === 'marioKart' &&
      getMarioKartEligiblePlayers(tournament, 1).length < 2
    ) {
      return null
    }

    return tournament.numberOfRounds >= 1 ? 1 : null
  }

  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]

  if (!latestRound || latestRound.status !== 'completed') {
    return null
  }

  if (
    tournament.format === 'marioKart' &&
    getMarioKartEligiblePlayers(tournament, latestRound.roundNumber + 1).length < 2
  ) {
    return null
  }

  return latestRound.roundNumber + 1
}

export function getCurrentDraftRound(tournament: Tournament) {
  return (
    [...tournament.rounds]
      .sort((left, right) => right.roundNumber - left.roundNumber)
      .find((round) => round.status === 'draft') ?? null
  )
}

export function upsertRound(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Tournament {
  const existing = tournament.rounds.find((round) => round.roundNumber === roundNumber)

  if (existing?.status === 'completed') {
    return tournament
  }

  const pairings = preserveExistingResults(
    generatePairings(tournament, roundNumber, fixedPairings),
    existing?.pairings ?? [],
  )

  const round: Round = {
    id: existing?.id ?? makeId('round'),
    roundNumber,
    pairings,
    status: existing?.status ?? 'draft',
  }

  const nextTournament = {
    ...tournament,
    currentRound: Math.max(tournament.currentRound, roundNumber),
    rounds: [
      ...tournament.rounds.filter((entry) => entry.roundNumber !== roundNumber),
      round,
    ].sort((left, right) => left.roundNumber - right.roundNumber),
  }

  return nextTournament
}

function invertResult(result: GameResult): GameResult {
  if (result === '1-0') {
    return '0-1'
  }

  if (result === '0-1') {
    return '1-0'
  }

  if (result === 'forfeit-1-0') {
    return 'forfeit-0-1'
  }

  if (result === 'forfeit-0-1') {
    return 'forfeit-1-0'
  }

  return result
}

function preserveExistingResults(pairings: Pairing[], existingPairings: Pairing[]) {
  const existingMarioKartPairings = existingPairings.filter(
    (pairing) =>
      pairingKind(pairing) === 'marioKart' &&
      marioKartScoringRacers(pairing).some(
        (racer) => racer.placement || racer.event || typeof racer.ingamePoints === 'number',
      ),
  )
  const existingGames = existingPairings.filter(
    (pairing) =>
      !pairing.isBye &&
      pairing.result &&
      whiteSidePlayerIds(pairing).length > 0 &&
      blackSidePlayerIds(pairing).length > 0,
  )

  if (existingGames.length === 0 && existingMarioKartPairings.length === 0) {
    return pairings
  }

  return pairings.map((pairing) => {
    if (pairingKind(pairing) === 'marioKart') {
      const scoringIds = marioKartScoringPlayerIds(pairing)
      const existingMarioKartPairing = existingMarioKartPairings.find((existing) =>
        sameStringSet(marioKartScoringPlayerIds(existing), scoringIds),
      )

      if (!existingMarioKartPairing) {
        return pairing
      }

      return {
        ...pairing,
        marioKartRacers: marioKartRacers(pairing).map((racer) => {
          if (racer.role !== 'scoring') {
            return racer
          }

          const existingRacer = marioKartScoringRacers(existingMarioKartPairing).find(
            (entry) => entry.playerId === racer.playerId,
          )

          return existingRacer
            ? {
                ...racer,
                placement: existingRacer.placement,
                ingamePoints: existingRacer.ingamePoints,
                event: existingRacer.event,
              }
            : racer
        }),
      }
    }

    const whiteIds = whiteSidePlayerIds(pairing)
    const blackIds = blackSidePlayerIds(pairing)

    if (pairing.isBye || whiteIds.length === 0 || blackIds.length === 0) {
      return pairing
    }

    const sameColors = existingGames.find(
      (existing) =>
        sameStringSet(whiteSidePlayerIds(existing), whiteIds) &&
        sameStringSet(blackSidePlayerIds(existing), blackIds),
    )

    if (sameColors?.result) {
      return { ...pairing, result: sameColors.result }
    }

    const swappedColors = existingGames.find(
      (existing) =>
        sameStringSet(whiteSidePlayerIds(existing), blackIds) &&
        sameStringSet(blackSidePlayerIds(existing), whiteIds),
    )

    if (swappedColors?.result) {
      return { ...pairing, result: invertResult(swappedColors.result) }
    }

    return pairing
  })
}

export function createManualPairing(
  tournament: Tournament,
  roundNumber: number,
  whitePlayerId: string,
  blackPlayerId: string,
): Pairing {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const white = tournament.players.find((player) => player.id === whitePlayerId)
  const black = tournament.players.find((player) => player.id === blackPlayerId)
  const colors =
    white && black
      ? assignColors(white, black, summaries, tournament, roundNumber)
      : { whitePlayerId, blackPlayerId }
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber: 1,
    kind: tournament.format === 'handAndBrain' ? 'single' : 'standard',
    ...colors,
    isManual: true,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}

export function createManualHandBrainPairing(
  tournament: Tournament,
  roundNumber: number,
  handBrainSides: Pairing['handBrainSides'],
): Pairing {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber: 1,
    kind: 'handAndBrain',
    handBrainSides,
    isManual: true,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}

export function createManualMarioKartPairing(
  tournament: Tournament,
  roundNumber: number,
  scoringPlayerIds: string[],
): Pairing {
  const summaries = getSummaryBeforeRound(tournament, roundNumber)
  const uniqueScoringIds = [...new Set(scoringPlayerIds.filter(Boolean))]
  const scoringPlayers = uniqueScoringIds
    .map((playerId) => tournament.players.find((player) => player.id === playerId))
    .filter((player): player is Player => Boolean(player))
  const cycleNumber = marioKartCycleNumberForPlayers(scoringPlayers, summaries)
  const cycleLobbyNumber = marioKartLobbyNumberForCycle(
    tournament,
    roundNumber,
    cycleNumber,
  )
  const racers: MarioKartRacer[] = uniqueScoringIds.map((playerId) => ({
    playerId,
    role: 'scoring',
  }))

  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber: 1,
    kind: 'marioKart',
    marioKartCycleNumber: cycleNumber,
    marioKartCycleLobbyNumber: cycleLobbyNumber,
    marioKartRacers: racers,
    isManual: true,
    isBye: false,
  }

  return {
    ...pairing,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }
}

export function formatPoints(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1).replace('.', ',')
}

export function standingsToCsv(rows: StandingRow[], format: Tournament['format'] = 'swiss') {
  const isMarioKart = format === 'marioKart'
  const hardshipLabel =
    format === 'handAndBrain' ? 'Pech' : 'Byes'
  const hardshipCount = (row: StandingRow) =>
    format === 'handAndBrain'
      ? row.receivedByes + row.receivedSingleGames
      : row.receivedByes
  const header = isMarioKart
    ? [
        'Platz',
        'Name',
        'Turnierpunkte',
        'Siege',
        'Punkte',
        'Durchschnittsplatz',
        'Rennen',
        'Ereignisse',
        'Lobbys',
        'Status',
      ]
    : [
        'Platz',
        'Name',
        'Punkte',
        'Buchholz',
        'Sonneborn-Berger',
        'Siege',
        'Runden',
        hardshipLabel,
        'Status',
      ]
  const escape = (value: string | number | null) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`

  return [
    header.map(escape).join(','),
    ...rows.map((row) =>
      (isMarioKart
        ? [
            row.rank,
            row.playerName,
            formatPoints(row.points),
            row.marioKartWins,
            row.marioKartIngamePoints,
            row.marioKartAveragePlacement === null
              ? ''
              : formatPoints(row.marioKartAveragePlacement),
            row.marioKartGames,
            row.marioKartEvents,
            row.roundHistory.map((entry) => entry.label).join(' '),
            row.status,
          ]
        : [
            row.rank,
            row.playerName,
            formatPoints(row.points),
            formatPoints(row.buchholz),
            formatPoints(row.sonnebornBerger),
            row.wins,
            row.roundHistory.map((entry) => entry.label).join(' '),
            hardshipCount(row),
            row.status,
          ])
        .map(escape)
        .join(','),
    ),
  ].join('\n')
}
