import type { Pairing, Player, PlayerScoreSummary, Tournament } from '@/apps/swiss-tournaments/types'
import { assignColors, byeResult, colorPenalty, compareNumberLists, countGamesBetween, countGamesBetweenBeforeRound, getPlayerStatusForRound, getRoundByeScore, getSummaryBeforeRound, makeId, normalizeRoundPairings, normalizeRoundRobinCycles, roundRobinRoundsForPlayerCount, validatePairing } from './pairingSupport'
import { seedOrder } from './swissFormat'
import type { PlannedPairing } from './swissFormat'

const roundRobinDummyId = '__round-robin-bye__'

const maxExactRoundRobinRepairPlayers = 16

const maxExactRoundRobinRepairStates = 50_000

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

export function getRoundRobinEligiblePlayers(tournament: Tournament, roundNumber: number) {
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

export function generateRoundRobinPairings(
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
