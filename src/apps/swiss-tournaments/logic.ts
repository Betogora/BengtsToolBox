import type {
  ByeScore,
  Color,
  CreateTournamentInput,
  GameResult,
  HandBrainSide,
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
      status: 'active',
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
      ? roundRobinRoundsForPlayerCount(seededPlayers.length, roundRobinCycles)
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
      byeScore: input.byeScore,
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
    ...(pairing.byePlayerId ? [pairing.byePlayerId] : []),
  ]
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
  if (!result) {
    return 0
  }

  if (pairing.isBye && pairing.byePlayerId === playerId) {
    if (result === 'bye-0.5') {
      return 0.5
    }

    return result === 'bye-1' ? 1 : 0
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
    }
  })

  tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .sort((left, right) => left.roundNumber - right.roundNumber)
    .forEach((round) => {
      const seen = new Set<string>()

      tournament.players.forEach((player) => {
        const pairing = round.pairings.find(
          (entry) =>
            pairingPlayerIds(entry).includes(player.id),
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

        const opponentIds = opponentIdsForPlayer(pairing, player.id)

        if (opponentIds.length > 0) {
          summaries[player.id].opponentGroups.push(opponentIds)
        }

        summaries[player.id].colors.push(playerColor(pairing, player.id))
        summaries[player.id].roles.push(playerRole(pairing, player.id))

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
  const repeatedWhiteCandidateColor = previousColorAgainstBeforeRound(
    tournament,
    whiteCandidate.id,
    blackCandidate.id,
    roundNumber,
  )
  const repeatAsGivenPenalty = repeatedWhiteCandidateColor === 'W' ? 60 : 0
  const repeatSwappedPenalty = repeatedWhiteCandidateColor === 'B' ? 60 : 0
  const asGiven =
    colorPenalty(whiteCandidate, 'W', summaries[whiteCandidate.id]) +
    colorPenalty(blackCandidate, 'B', summaries[blackCandidate.id]) +
    repeatAsGivenPenalty
  const swapped =
    colorPenalty(whiteCandidate, 'B', summaries[whiteCandidate.id]) +
    colorPenalty(blackCandidate, 'W', summaries[blackCandidate.id]) +
    repeatSwappedPenalty

  return asGiven <= swapped
    ? { whitePlayerId: whiteCandidate.id, blackPlayerId: blackCandidate.id }
    : { whitePlayerId: blackCandidate.id, blackPlayerId: whiteCandidate.id }
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
) {
  const lowestByeCount = Math.min(...players.map((player) => summaries[player.id].byes))
  const eligiblePlayersWithFewestByes = players.filter(
    (player) => summaries[player.id].byes === lowestByeCount,
  )
  const protectedLateEntrants =
    byePolicy === 'protectLateEntrants' && roundNumber > 1
      ? eligiblePlayersWithFewestByes.filter(
          (player) => player.addedInRound === roundNumber,
        )
      : []
  const eligiblePlayers =
    protectedLateEntrants.length < eligiblePlayersWithFewestByes.length
      ? eligiblePlayersWithFewestByes.filter(
          (player) => !protectedLateEntrants.some((late) => late.id === player.id),
        )
      : eligiblePlayersWithFewestByes

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

  function search(availablePlayers: Player[]): { pairs: PlannedPairing[]; score: number } {
    if (availablePlayers.length < 2) {
      return { pairs: [], score: 0 }
    }

    const [first, ...rest] = [...availablePlayers].sort(seedOrder)
    let best: { pairs: PlannedPairing[]; score: number } | null = null

    rest.forEach((candidate) => {
      const gameCount = countGamesBetweenBeforeRound(
        tournament,
        first.id,
        candidate.id,
        roundNumber,
      )

      if (gameCount >= targetGames) {
        return
      }

      const key = pairKey(first.id, candidate.id)
      const scheduledPair = scheduledPairByKey.get(key)
      const colors = scheduledPair
        ? {
            whitePlayerId: scheduledPair.white.id,
            blackPlayerId: scheduledPair.black.id,
          }
        : assignColors(first, candidate, summaries, tournament, roundNumber)
      const tail = search(rest.filter((player) => player.id !== candidate.id))
      const score =
        tail.score +
        (scheduledPairKeys.has(key) ? 0 : 500) +
        gameCount * 100 +
        colorPenalty(
          tournament.players.find((player) => player.id === colors.whitePlayerId) ?? first,
          'W',
          summaries[colors.whitePlayerId],
        ) +
        colorPenalty(
          tournament.players.find((player) => player.id === colors.blackPlayerId) ?? candidate,
          'B',
          summaries[colors.blackPlayerId],
        )
      const result = {
        pairs: [{ left: first, right: candidate, colors }, ...tail.pairs],
        score,
      }

      if (!best || result.score < best.score) {
        best = result
      }
    })

    return best ?? { pairs: [], score: 0 }
  }

  return search(players).pairs
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

function roleCount(summary: PlayerScoreSummary, role: 'hand' | 'brain') {
  return summary.roles.filter((entry) => entry === role).length
}

function countSingleGamesBeforeRound(
  tournament: Tournament,
  playerId: string,
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
            pairingKind(pairing) === 'single' &&
            pairingPlayerIds(pairing).includes(playerId),
        ).length,
      0,
    )
}

function assignHandBrainSide(
  first: Player,
  second: Player,
  summaries: Record<string, PlayerScoreSummary>,
  tournament: Tournament,
  roundNumber: number,
): HandBrainSide {
  const asGivenPenalty =
    Math.abs(roleCount(summaries[first.id], 'brain') + 1 - roleCount(summaries[first.id], 'hand')) +
    Math.abs(roleCount(summaries[second.id], 'hand') + 1 - roleCount(summaries[second.id], 'brain')) +
    (hasSameRoleWithTeammateBeforeRound(
      tournament,
      { brainPlayerId: first.id, handPlayerId: second.id },
      roundNumber,
    )
      ? 100
      : 0)
  const swappedPenalty =
    Math.abs(roleCount(summaries[first.id], 'hand') + 1 - roleCount(summaries[first.id], 'brain')) +
    Math.abs(roleCount(summaries[second.id], 'brain') + 1 - roleCount(summaries[second.id], 'hand')) +
    (hasSameRoleWithTeammateBeforeRound(
      tournament,
      { brainPlayerId: second.id, handPlayerId: first.id },
      roundNumber,
    )
      ? 100
      : 0)

  return asGivenPenalty <= swappedPenalty
    ? { brainPlayerId: first.id, handPlayerId: second.id }
    : { brainPlayerId: second.id, handPlayerId: first.id }
}

function chooseSinglePairing(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
) {
  const sorted = [...players].sort(
    (left, right) =>
      summaries[left.id].points - summaries[right.id].points ||
      right.initialSeed - left.initialSeed,
  )
  let best: PlannedPairing | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (let leftIndex = 0; leftIndex < sorted.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < sorted.length; rightIndex += 1) {
      const left = sorted[leftIndex]
      const right = sorted[rightIndex]
      const repeatPenalty = hasPlayedEachOtherBeforeRound(tournament, left.id, right.id, roundNumber)
        ? 1_000_000
        : 0
      const leftSingleGames = countSingleGamesBeforeRound(tournament, left.id, roundNumber)
      const rightSingleGames = countSingleGamesBeforeRound(tournament, right.id, roundNumber)
      const repeatedSinglePenalty =
        Math.max(leftSingleGames, rightSingleGames) * 100_000 +
        (leftSingleGames + rightSingleGames) * 25_000
      const score =
        repeatPenalty +
        repeatedSinglePenalty +
        pairPointDiff(left, right, summaries) * 100 +
        leftIndex +
        rightIndex / 100

      if (score < bestScore) {
        best = { left, right }
        bestScore = score
      }
    }
  }

  return best
}

function handBrainBoardPenalty(
  whiteIds: string[],
  blackIds: string[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
) {
  const teamRepeatPenalty = hasSameTeamBeforeRound(tournament, whiteIds, blackIds, roundNumber)
    ? 50_000
    : 0
  const partnerPenalty = [...whiteIds, ...blackIds].reduce((sum, playerId) => {
    return (
      sum +
      teammateIdsForPlayer(
        {
          id: 'candidate',
          roundNumber,
          boardNumber: 0,
          isManual: false,
          isBye: false,
          kind: 'handAndBrain',
          handBrainSides: {
            white: { brainPlayerId: whiteIds[0], handPlayerId: whiteIds[1] },
            black: { brainPlayerId: blackIds[0], handPlayerId: blackIds[1] },
          },
        },
        playerId,
      ).reduce(
        (partnerSum, teammateId) =>
          partnerSum +
          countTeammateGamesBeforeRound(tournament, playerId, teammateId, roundNumber) * 5_000,
        0,
      )
    )
  }, 0)
  const pointPenalty =
    Math.abs(sideAveragePoints(whiteIds, summaries) - sideAveragePoints(blackIds, summaries)) *
    250

  return teamRepeatPenalty + partnerPenalty + pointPenalty
}

function createHandBrainPairingFromVirtualPairings(
  firstPair: PlannedPairing,
  secondPair: PlannedPairing,
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
  boardNumber: number,
): Pairing {
  const firstColors = firstPair.colors ?? assignColors(firstPair.left, firstPair.right, summaries, tournament, roundNumber)
  const secondColors = secondPair.colors ?? assignColors(secondPair.left, secondPair.right, summaries, tournament, roundNumber)
  const firstWhite = tournament.players.find((player) => player.id === firstColors.whitePlayerId) ?? firstPair.left
  const firstBlack = tournament.players.find((player) => player.id === firstColors.blackPlayerId) ?? firstPair.right
  const secondWhite = tournament.players.find((player) => player.id === secondColors.whitePlayerId) ?? secondPair.left
  const secondBlack = tournament.players.find((player) => player.id === secondColors.blackPlayerId) ?? secondPair.right
  const pairing: Pairing = {
    id: makeId('pairing'),
    roundNumber,
    boardNumber,
    kind: 'handAndBrain',
    isManual: false,
    isBye: false,
    handBrainSides: {
      white: assignHandBrainSide(firstWhite, secondWhite, summaries, tournament, roundNumber),
      black: assignHandBrainSide(firstBlack, secondBlack, summaries, tournament, roundNumber),
    },
  }

  const whiteIds = whiteSidePlayerIds(pairing)
  const blackIds = blackSidePlayerIds(pairing)
  const warnings: PairingWarning[] = []

  if (hasSameTeamBeforeRound(tournament, whiteIds, blackIds, roundNumber)) {
    warnings.push(warning('repeat-hand-brain-team', 'Diese Team-gegen-Team-Konstellation gab es bereits.', 'hard'))
  }

  if (
    [...whiteIds, ...blackIds].some((playerId) =>
      teammateIdsForPlayer(pairing, playerId).some(
        (teammateId) => countTeammateGamesBeforeRound(tournament, playerId, teammateId, roundNumber) > 0,
      ),
    )
  ) {
    warnings.push(warning('repeat-hand-brain-partner', 'Mindestens ein Duo war bereits auf derselben Seite.'))
  }

  return {
    ...pairing,
    warnings: [
      ...validatePairing(tournament, pairing, roundNumber, summaries),
      ...warnings,
      ...(firstPair.warnings ?? []),
      ...(secondPair.warnings ?? []),
    ],
  }
}

function createFirstRoundHandBrainVirtualPairings(players: Player[]): PlannedPairing[] {
  const sortedPlayers = [...players].sort(seedOrder)

  return Array.from({ length: Math.floor(sortedPlayers.length / 2) }, (_, index) => ({
    left: sortedPlayers[index * 2],
    right: sortedPlayers[index * 2 + 1],
    colors: {
      whitePlayerId: sortedPlayers[index * 2].id,
      blackPlayerId: sortedPlayers[index * 2 + 1].id,
    },
  }))
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

  if (pool.length % 4 === 1 || pool.length % 4 === 3) {
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
    byePairing.warnings = validatePairing(tournament, byePairing, roundNumber, summaries)
    pool = pool.filter((player) => player.id !== byePlayer.id)
  }

  if (pool.length % 4 === 2) {
    const singlePair = chooseSinglePairing(pool, tournament, summaries, roundNumber)

    if (singlePair) {
      const colors = assignColors(singlePair.left, singlePair.right, summaries, tournament, roundNumber)
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
      pairings.push(pairing)
      pool = pool.filter(
        (player) => player.id !== singlePair.left.id && player.id !== singlePair.right.id,
      )
    }
  }

  const virtualPairings =
    roundNumber === 1
      ? createFirstRoundHandBrainVirtualPairings(pool)
      : createSwissBracketPairings(pool, tournament, summaries, roundNumber)
  const remainingVirtualPairings = [...virtualPairings]

  while (remainingVirtualPairings.length >= 2) {
    const firstPair = remainingVirtualPairings.shift()

    if (!firstPair) {
      break
    }

    let bestIndex = 0
    let bestScore = Number.POSITIVE_INFINITY

    remainingVirtualPairings.forEach((candidatePair, index) => {
      const firstColors = firstPair.colors ?? assignColors(firstPair.left, firstPair.right, summaries, tournament, roundNumber)
      const candidateColors = candidatePair.colors ?? assignColors(candidatePair.left, candidatePair.right, summaries, tournament, roundNumber)
      const score = handBrainBoardPenalty(
        [firstColors.whitePlayerId, candidateColors.whitePlayerId],
        [firstColors.blackPlayerId, candidateColors.blackPlayerId],
        tournament,
        summaries,
        roundNumber,
      )

      if (score < bestScore) {
        bestIndex = index
        bestScore = score
      }
    })

    const [secondPair] = remainingVirtualPairings.splice(bestIndex, 1)

    pairings.push(
      createHandBrainPairingFromVirtualPairings(
        firstPair,
        secondPair,
        tournament,
        summaries,
        roundNumber,
        pairings.length + 1,
      ),
    )
  }

  if (byePairing) {
    pairings.push(byePairing)
  }

  return normalizeRoundPairings(pairings)
}

function normalizeRoundPairings(pairings: Pairing[]) {
  const playerUseCounts = new Map<string, number>()

  pairings.forEach((pairing) => {
    pairingPlayerIds(pairing).forEach((playerId) => {
      playerUseCounts.set(playerId, (playerUseCounts.get(playerId) ?? 0) + 1)
    })
  })

  return pairings.map((pairing, index) => {
    const duplicateIds = pairingPlayerIds(pairing).filter(
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
      if (pairing.isBye || !pairing.result) {
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
    return '½'
  }

  return '0'
}

function resultTitle(result?: GameResult) {
  if (!result) {
    return 'offen'
  }

  if (result === 'bye-0.5') {
    return 'Bye 0.5'
  }

  if (result === 'bye-1') {
    return 'Bye 1'
  }

  if (result === 'bye-0') {
    return 'Bye 0'
  }

  return result.replaceAll('forfeit-', 'kampflos ')
}

function createOpenRoundCell(roundNumber: number): StandingRoundCell {
  return {
    roundNumber,
    label: '-',
    title: `Runde ${roundNumber}: keine Partie`,
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
    tournament.numberOfRounds,
    ...tournament.rounds.map((round) => round.roundNumber),
  )

  return Array.from({ length: visibleRoundCount }, (_, index) => {
    const roundNumber = index + 1
    const round = tournament.rounds.find((entry) => entry.roundNumber === roundNumber)

    if (!round) {
      return createOpenRoundCell(roundNumber)
    }

    const pairing = round.pairings.find((entry) =>
      pairingPlayerIds(entry).includes(row.playerId),
    )

    if (!pairing) {
      return createOpenRoundCell(roundNumber)
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

    const color = playerColor(pairing, row.playerId)
    const opponentIds = opponentIdsForPlayer(pairing, row.playerId)

    if (opponentIds.length === 0 || color === '-') {
      return createOpenRoundCell(roundNumber)
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
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.buchholz - left.buchholz ||
        right.sonnebornBerger - left.sonnebornBerger ||
        right.wins - left.wins ||
        (right.directEncounterScore ?? -1) - (left.directEncounterScore ?? -1) ||
        left.initialSeed - right.initialSeed,
    )
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

export function setPlayerStatus(
  tournament: Tournament,
  playerId: string,
  status: PlayerStatus,
  fromRound?: number,
): Tournament {
  return {
    ...tournament,
    players: tournament.players.map((player) => {
      if (player.id !== playerId) {
        return player
      }

      if (fromRound && fromRound > tournament.currentRound) {
        return {
          ...player,
          statusOverrides: {
            ...player.statusOverrides,
            [fromRound]: status,
          },
        }
      }

      return { ...player, status }
    }),
  }
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

  return nextTournament
}

export function removePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
): Tournament {
  const playerWasUsed = tournament.rounds.some((round) =>
    round.pairings.some((pairing) => pairingPlayerIds(pairing).includes(playerId)),
  )

  if (playerWasUsed) {
    return tournament
  }

  return {
    ...tournament,
    players: tournament.players.filter((player) => player.id !== playerId),
  }
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
    return tournament.numberOfRounds >= 1 ? 1 : null
  }

  const latestRound = [...tournament.rounds].sort(
    (left, right) => right.roundNumber - left.roundNumber,
  )[0]

  if (!latestRound || latestRound.status !== 'completed') {
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
  const existingGames = existingPairings.filter(
    (pairing) =>
      !pairing.isBye &&
      pairing.result &&
      whiteSidePlayerIds(pairing).length > 0 &&
      blackSidePlayerIds(pairing).length > 0,
  )

  if (existingGames.length === 0) {
    return pairings
  }

  return pairings.map((pairing) => {
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

export function formatPoints(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export function standingsToCsv(rows: StandingRow[]) {
  const header = [
    'Platz',
    'Name',
    'Punkte',
    'Buchholz',
    'Sonneborn-Berger',
    'Siege',
    'Runden',
    'Byes',
    'Status',
  ]
  const escape = (value: string | number | null) =>
    `"${String(value ?? '').replaceAll('"', '""')}"`

  return [
    header.map(escape).join(','),
    ...rows.map((row) =>
      [
        row.rank,
        row.playerName,
        formatPoints(row.points),
        formatPoints(row.buchholz),
        formatPoints(row.sonnebornBerger),
        row.wins,
        row.roundHistory.map((entry) => entry.label).join(' '),
        row.receivedByes,
        row.status,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n')
}
