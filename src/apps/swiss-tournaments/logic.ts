import type {
  BulkPlayerInput,
  ByeScore,
  Color,
  CreateTournamentInput,
  GameResult,
  Pairing,
  PairingWarning,
  Player,
  PlayerScoreSummary,
  PlayerStatus,
  Round,
  StandingRow,
  Tournament,
} from '@/apps/swiss-tournaments/types'
import { createRandomId } from '@/apps/shared/utils'

const defaultSettings = {
  initialSeedingMode: 'rating' as const,
  byeScore: 1 as const,
  allowMultipleByesPerPlayer: false,
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

export function parseBulkPlayers(text: string): BulkPlayerInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [rawName, rawRating] = line.split(',').map((part) => part.trim())
      const rating = Number(rawRating)

      return {
        name: rawName,
        rating:
          rawRating && Number.isFinite(rating) && rating > 0
            ? Math.round(rating)
            : undefined,
      }
    })
    .filter((player) => player.name.length > 0)
}

function seedPlayers(
  players: BulkPlayerInput[],
  mode: Tournament['settings']['initialSeedingMode'],
): Player[] {
  const hasRatings = players.some((player) => Number.isFinite(player.rating))
  const sorted = [...players].sort((left, right) => {
    if (mode === 'rating' && hasRatings) {
      return (
        (right.rating ?? Number.NEGATIVE_INFINITY) -
          (left.rating ?? Number.NEGATIVE_INFINITY) ||
        left.name.localeCompare(right.name, 'de')
      )
    }

    if (mode === 'manual') {
      return players.indexOf(left) - players.indexOf(right)
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
    players: seedPlayers(parseBulkPlayers(input.bulkPlayersText), input.initialSeedingMode),
    rounds: [],
    settings: {
      ...defaultSettings,
      initialSeedingMode: input.initialSeedingMode,
      byeScore: input.byeScore,
      allowMultipleByesPerPlayer: input.allowMultipleByesPerPlayer,
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

function playedEachOther(tournament: Tournament, leftId: string, rightId: string) {
  return tournament.rounds.some((round) =>
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
  let penalty = 0

  if (lastColors.length > 0 && lastColors[lastColors.length - 1] === color) {
    penalty += 2
  }

  if (lastColors.length === 2 && lastColors.every((entry) => entry === color)) {
    penalty += 8
  }

  if (color === 'W') {
    penalty += Math.max(0, whiteCount + 1 - blackCount - 1)
  } else {
    penalty += Math.max(0, blackCount + 1 - whiteCount - 1)
  }

  return penalty + player.initialSeed / 1000
}

function assignColors(
  whiteCandidate: Player,
  blackCandidate: Player,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const asGiven =
    colorPenalty(whiteCandidate, 'W', summaries[whiteCandidate.id]) +
    colorPenalty(blackCandidate, 'B', summaries[blackCandidate.id])
  const swapped =
    colorPenalty(whiteCandidate, 'B', summaries[whiteCandidate.id]) +
    colorPenalty(blackCandidate, 'W', summaries[blackCandidate.id])

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

    if (player && summaries[player.id].byes > 0) {
      warnings.push(warning('multiple-byes', `${player.name} hat bereits ein Bye erhalten.`))
    }

    return warnings
  }

  const white = tournament.players.find((player) => player.id === pairing.whitePlayerId)
  const black = tournament.players.find((player) => player.id === pairing.blackPlayerId)

  if (!white || !black) {
    warnings.push(warning('missing-player', 'Diese Paarung ist unvollstaendig.', 'hard'))
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

  if (playedEachOther(tournament, white.id, black.id)) {
    warnings.push(warning('repeat-pairing', 'Diese Spieler haben bereits gegeneinander gespielt.', 'hard'))
  }

  const pointDiff = Math.abs(summaries[white.id].points - summaries[black.id].points)

  if (pointDiff > 1) {
    warnings.push(warning('large-point-gap', 'Die Punktdifferenz ist ungewoehnlich hoch.'))
  }

  const nextColors: Array<[Player, 'W' | 'B']> = [
    [white, 'W' as const],
    [black, 'B' as const],
  ]

  nextColors.forEach(([player, color]) => {
    const recent = summaries[player.id].colors.filter((entry) => entry !== '-').slice(-2)

    if (recent.length === 2 && recent.every((entry) => entry === color)) {
      warnings.push(warning('third-color', `${player.name} wuerde zum dritten Mal in Folge ${color === 'W' ? 'Weiss' : 'Schwarz'} erhalten.`))
    }
  })

  return warnings
}

function chooseByePlayer(
  players: Player[],
  summaries: Record<string, PlayerScoreSummary>,
  allowMultipleByes: boolean,
) {
  return [...players].sort((left, right) => {
    const leftByePenalty = !allowMultipleByes && summaries[left.id].byes > 0 ? 1000 : 0
    const rightByePenalty = !allowMultipleByes && summaries[right.id].byes > 0 ? 1000 : 0

    return (
      summaries[left.id].points - summaries[right.id].points ||
      leftByePenalty - rightByePenalty ||
      left.initialSeed - right.initialSeed
    )
  })[0]
}

function pairingScore(
  left: Player,
  right: Player,
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
) {
  const repeatPenalty = playedEachOther(tournament, left.id, right.id) ? 10_000 : 0
  const pointPenalty = Math.abs(summaries[left.id].points - summaries[right.id].points) * 100
  const color = assignColors(left, right, summaries)
  const white = color.whitePlayerId === left.id ? left : right
  const black = color.blackPlayerId === left.id ? left : right
  const colorCost =
    colorPenalty(white, 'W', summaries[white.id]) +
    colorPenalty(black, 'B', summaries[black.id])

  return repeatPenalty + pointPenalty + colorCost + (left.initialSeed + right.initialSeed) / 10_000
}

function findBestPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
) {
  if (players.length === 0) {
    return [] as Array<[Player, Player]>
  }

  const [first, ...rest] = players
  const candidates = rest
    .map((candidate) => ({
      candidate,
      score: pairingScore(first, candidate, tournament, summaries),
    }))
    .sort((left, right) => left.score - right.score)
    .slice(0, Math.min(8, rest.length))

  let best: Array<[Player, Player]> = []
  let bestScore = Number.POSITIVE_INFINITY

  for (const entry of candidates) {
    const remaining = rest.filter((player) => player.id !== entry.candidate.id)
    const tail = findBestPairings(remaining, tournament, summaries)
    const score =
      entry.score +
      tail.reduce(
        (sum, [left, right]) => sum + pairingScore(left, right, tournament, summaries),
        0,
      )

    if (score < bestScore) {
      best = [[first, entry.candidate], ...tail]
      bestScore = score
    }
  }

  return best
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
    .sort(
      (left, right) =>
        summaries[right.id].points - summaries[left.id].points ||
        left.initialSeed - right.initialSeed,
    )

  const pairings: Pairing[] = fixedPairings.map((pairing, index) => ({
    ...pairing,
    boardNumber: index + 1,
    roundNumber,
    isManual: true,
    warnings: validatePairing(tournament, pairing, roundNumber, summaries),
  }))
  let pool = activePlayers

  if (pool.length % 2 === 1) {
    const byePlayer = chooseByePlayer(
      pool,
      summaries,
      tournament.settings.allowMultipleByesPerPlayer,
    )
    const byePairing: Pairing = {
      id: makeId('pairing'),
      roundNumber,
      boardNumber: pairings.length + 1,
      result: byeResult(getRoundByeScore(tournament, roundNumber)),
      isManual: false,
      isBye: true,
      byePlayerId: byePlayer.id,
    }
    byePairing.warnings = validatePairing(tournament, byePairing, roundNumber, summaries)
    pairings.push(byePairing)
    pool = pool.filter((player) => player.id !== byePlayer.id)
  }

  findBestPairings(pool, tournament, summaries).forEach(([left, right]) => {
    const colors = assignColors(left, right, summaries)
    const pairing: Pairing = {
      id: makeId('pairing'),
      roundNumber,
      boardNumber: pairings.length + 1,
      ...colors,
      isManual: false,
      isBye: false,
    }
    pairing.warnings = validatePairing(tournament, pairing, roundNumber, summaries)
    pairings.push(pairing)
  })

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

  return rowsWithDirect
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
}

export function updateResult(
  tournament: Tournament,
  roundNumber: number,
  pairingId: string,
  result: GameResult,
): Tournament {
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

export function upsertRound(
  tournament: Tournament,
  roundNumber: number,
  fixedPairings: Pairing[] = [],
): Tournament {
  const existing = tournament.rounds.find((round) => round.roundNumber === roundNumber)

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

export function setRoundStatus(
  tournament: Tournament,
  roundNumber: number,
  status: Round['status'],
): Tournament {
  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber ? { ...round, status } : round,
    ),
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
      ? assignColors(white, black, summaries)
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
    'Direkter Vergleich',
    'Farben',
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
        row.directEncounterScore === null ? '' : formatPoints(row.directEncounterScore),
        row.colorHistory.join(' '),
        row.receivedByes,
        row.status,
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n')
}
