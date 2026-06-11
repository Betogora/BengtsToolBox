import type {
  ByeScore,
  Color,
  CreateTournamentInput,
  GameResult,
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
}

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

  return sorted.map((player, index) => ({
    id: makeId('player'),
    name: player.name,
    rating: player.rating,
    initialSeed: index + 1,
    status: 'active',
    addedInRound: 1,
  }))
}

export function createTournament(
  input: CreateTournamentInput,
  position: number,
): Tournament {
  const name = input.name.trim() || 'Neues Schachturnier'
  const numberOfRounds = Math.max(1, Math.floor(input.numberOfRounds) || 1)

  return {
    id: makeId('tournament'),
    name,
    numberOfRounds,
    currentRound: 0,
    players: seedPlayers(input.players, input.initialSeedingMode),
    rounds: [],
    settings: {
      ...defaultSettings,
      initialSeedingMode: input.initialSeedingMode,
      byeScore: input.byeScore,
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

  const isWhite = pairing.whitePlayerId === playerId
  const isBlack = pairing.blackPlayerId === playerId

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
  return tournament.rounds
    .filter((round) => round.roundNumber < beforeRoundNumber)
    .some((round) =>
      round.pairings.some(
        (pairing) =>
          !pairing.isBye &&
          ((pairing.whitePlayerId === leftId && pairing.blackPlayerId === rightId) ||
            (pairing.whitePlayerId === rightId && pairing.blackPlayerId === leftId)),
      ),
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
      opponents: [],
      defeatedOpponents: [],
      drawnOpponents: [],
      colors: [],
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
            entry.whitePlayerId === player.id ||
            entry.blackPlayerId === player.id ||
            entry.byePlayerId === player.id,
        )

        if (!pairing) {
          summaries[player.id].colors.push('-')
          return
        }

        seen.add(player.id)
        summaries[player.id].points += resultPoints(pairing, player.id)

        if (pairing.isBye) {
          summaries[player.id].colors.push('-')
          summaries[player.id].byes += 1
          return
        }

        const opponentId =
          pairing.whitePlayerId === player.id
            ? pairing.blackPlayerId
            : pairing.whitePlayerId

        if (opponentId) {
          summaries[player.id].opponents.push(opponentId)
        }

        summaries[player.id].colors.push(pairing.whitePlayerId === player.id ? 'W' : 'B')

        if (isWin(pairing, player.id)) {
          summaries[player.id].wins += 1

          if (opponentId) {
            summaries[player.id].defeatedOpponents.push(opponentId)
          }
        } else if (pairing.result === '0.5-0.5' && opponentId) {
          summaries[player.id].drawnOpponents.push(opponentId)
        }
      })

      Object.keys(summaries).forEach((playerId) => {
        if (!seen.has(playerId) && summaries[playerId].colors.length < round.roundNumber) {
          summaries[playerId].colors.push('-')
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
        ((pairing.whitePlayerId === playerId &&
          pairing.blackPlayerId === opponentId) ||
          (pairing.whitePlayerId === opponentId &&
            pairing.blackPlayerId === playerId)),
    )

  if (!previousPairing) {
    return null
  }

  return previousPairing.whitePlayerId === playerId ? 'W' : 'B'
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

  if (hasPlayedEachOtherBeforeRound(tournament, white.id, black.id, roundNumber)) {
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
) {
  const lowestByeCount = Math.min(...players.map((player) => summaries[player.id].byes))
  const eligiblePlayers = players.filter(
    (player) => summaries[player.id].byes === lowestByeCount,
  )

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

export function generatePairings(
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
    const byePlayer = chooseByePlayer(pool, summaries)
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

  const playerUseCounts = new Map<string, number>()

  pairings.forEach((pairing) => {
    ;[pairing.whitePlayerId, pairing.blackPlayerId, pairing.byePlayerId]
      .filter((playerId): playerId is string => typeof playerId === 'string')
      .forEach((playerId) => {
        playerUseCounts.set(playerId, (playerUseCounts.get(playerId) ?? 0) + 1)
      })
  })

  return pairings.map((pairing, index) => {
    const duplicateIds = [
      pairing.whitePlayerId,
      pairing.blackPlayerId,
      pairing.byePlayerId,
    ].filter(
      (playerId): playerId is string =>
        typeof playerId === 'string' && (playerUseCounts.get(playerId) ?? 0) > 1,
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

function getDirectScore(tournament: Tournament, playerId: string, tiedIds: string[]) {
  let score = 0
  let games = 0

  tournament.rounds.forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.isBye || !pairing.result) {
        return
      }

      const opponentId =
        pairing.whitePlayerId === playerId
          ? pairing.blackPlayerId
          : pairing.blackPlayerId === playerId
            ? pairing.whitePlayerId
            : undefined

      if (!opponentId || !tiedIds.includes(opponentId)) {
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

  return Array.from({ length: tournament.numberOfRounds }, (_, index) => {
    const roundNumber = index + 1
    const round = tournament.rounds.find((entry) => entry.roundNumber === roundNumber)

    if (!round) {
      return createOpenRoundCell(roundNumber)
    }

    const pairing = round.pairings.find(
      (entry) =>
        entry.whitePlayerId === row.playerId ||
        entry.blackPlayerId === row.playerId ||
        entry.byePlayerId === row.playerId,
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

    const isWhite = pairing.whitePlayerId === row.playerId
    const opponentId = isWhite ? pairing.blackPlayerId : pairing.whitePlayerId

    if (!opponentId) {
      return createOpenRoundCell(roundNumber)
    }

    const opponentRank = rankByPlayerId.get(opponentId)
    const opponent = playerById.get(opponentId)
    const color = isWhite ? 'W' : 'B'
    const resultLabel = pairing.result ? resultLabelForPlayer(pairing, row.playerId) : '-'
    const label = `${opponentRank ?? '?'}${color}${resultLabel}`
    const points = resultPoints(pairing, row.playerId)

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
    const buchholz = summary.opponents.reduce(
      (sum, opponentId) => sum + (summaries[opponentId]?.points ?? 0),
      0,
    )
    const sonnebornBerger =
      summary.defeatedOpponents.reduce(
        (sum, opponentId) => sum + (summaries[opponentId]?.points ?? 0),
        0,
      ) +
      summary.drawnOpponents.reduce(
        (sum, opponentId) => sum + (summaries[opponentId]?.points ?? 0) / 2,
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
  result: GameResult,
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
            pairings: round.pairings.map((pairing) =>
              pairing.id === pairingId ? { ...pairing, result } : pairing,
            ),
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
    Math.min(tournament.numberOfRounds, tournament.currentRound + 1 || 1)
  const player: Player = {
    id: makeId('player'),
    name: name.trim() || `Spieler ${nextSeed}`,
    rating: Number.isFinite(rating) ? rating : undefined,
    initialSeed: nextSeed,
    status: 'active',
    addedInRound: nextRound,
  }

  return {
    ...tournament,
    players: [...tournament.players, player],
  }
}

export function removePlayerFromTournament(
  tournament: Tournament,
  playerId: string,
): Tournament {
  return {
    ...tournament,
    players: tournament.players.filter((player) => player.id !== playerId),
  }
}

export function resetTournamentProgress(tournament: Tournament): Tournament {
  return {
    ...tournament,
    currentRound: 0,
    rounds: [],
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

  const nextRound = latestRound.roundNumber + 1

  return nextRound <= tournament.numberOfRounds ? nextRound : null
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

  if (existing?.pairings.some((pairing) => pairing.result && !pairing.isBye)) {
    return tournament
  }

  const round: Round = {
    id: existing?.id ?? makeId('round'),
    roundNumber,
    pairings: generatePairings(tournament, roundNumber, fixedPairings),
    status: existing?.status ?? 'draft',
  }

  return {
    ...tournament,
    currentRound: Math.max(tournament.currentRound, roundNumber),
    rounds: [
      ...tournament.rounds.filter((entry) => entry.roundNumber !== roundNumber),
      round,
    ].sort((left, right) => left.roundNumber - right.roundNumber),
  }
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
    ...colors,
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
