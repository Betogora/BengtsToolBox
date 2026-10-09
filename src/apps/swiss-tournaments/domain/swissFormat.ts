import type { PairingWarning, Player, PlayerScoreSummary, Tournament } from '@/apps/swiss-tournaments/types'
import { hasPlayedEachOtherBeforeRound, warning } from './pairingSupport'

export type PlannedPairing = {
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

export function playerOrder(
  left: Player,
  right: Player,
  summaries: Record<string, PlayerScoreSummary>,
) {
  return (
    summaries[right.id].points - summaries[left.id].points ||
    left.initialSeed - right.initialSeed
  )
}

export function seedOrder(left: Player, right: Player) {
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
  const sortedPlayers = [...players].sort((left, right) =>
    playerOrder(left, right, summaries),
  )
  const playerBits = new Map(sortedPlayers.map((player, index) => [player.id, 1n << BigInt(index)]))
  const memo = new Map<bigint, BracketPairingResult | null>([
    [0n, { pairs: [], floaters: [], score: 0 }],
  ])
  const candidatesByPlayerId = new Map<string, { candidate: Player; score: number }[]>()

  function search(remainingPlayers: Player[], stateKey: bigint): BracketPairingResult | null {
    const cached = memo.get(stateKey)
    if (cached !== undefined) return cached

    const [first, ...rest] = remainingPlayers
    let candidates = candidatesByPlayerId.get(first.id)
    if (!candidates) {
      candidates = sortedPlayers
        .filter((candidate) => candidate.id !== first.id && (
          allowRepeats ||
          !hasPlayedEachOtherBeforeRound(tournament, first.id, candidate.id, roundNumber)
        ))
        .map((candidate) => ({
          candidate,
          score: pairSearchScore(first, candidate, tournament, summaries, roundNumber, allowRepeats),
        }))
        .sort((left, right) => left.score - right.score)
      candidatesByPlayerId.set(first.id, candidates)
    }
    const remainingIds = new Set(rest.map((player) => player.id))
    const availableCandidates = candidates
      .filter((entry) => remainingIds.has(entry.candidate.id))
      .slice(0, Math.min(10, rest.length))
    let best: BracketPairingResult | null = null
    const restStateKey = stateKey & ~playerBits.get(first.id)!

    for (const entry of availableCandidates) {
      const nextStateKey = restStateKey & ~playerBits.get(entry.candidate.id)!
      let tail = memo.get(nextStateKey)
      if (tail === undefined) {
        tail = search(rest.filter((player) => player.id !== entry.candidate.id), nextStateKey)
      }
      if (!tail) continue

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

    memo.set(stateKey, best)
    return best
  }

  return search(sortedPlayers, (1n << BigInt(sortedPlayers.length)) - 1n)
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

function findNonRepeatPerfectPairing(
  players: Player[],
  tournament: Tournament,
  roundNumber: number,
  failedStates = new Set<string>(),
): PlannedPairing[] | null {
  if (players.length === 0) {
    return []
  }

  const stateKey = JSON.stringify(players.map((player) => player.id))
  if (failedStates.has(stateKey)) return null

  const [first, ...rest] = players

  for (const candidate of rest) {
    if (hasPlayedEachOtherBeforeRound(tournament, first.id, candidate.id, roundNumber)) {
      continue
    }

    const tail = findNonRepeatPerfectPairing(
      rest.filter((player) => player.id !== candidate.id),
      tournament,
      roundNumber,
      failedStates,
    )
    if (tail) return [{ left: first, right: candidate }, ...tail]
  }
  failedStates.add(stateKey)
  return null
}

export function createFirstRoundPairings(players: Player[]): PlannedPairing[] {
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

export function createSwissBracketPairings(
  players: Player[],
  tournament: Tournament,
  summaries: Record<string, PlayerScoreSummary>,
  roundNumber: number,
): PlannedPairing[] {
  const completeNonRepeatPairings = findNonRepeatPerfectPairing(players, tournament, roundNumber)
  const canAvoidRepeats = completeNonRepeatPairings !== null
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

  if ((hasRepeat || pairings.length * 2 !== players.length) && completeNonRepeatPairings) {
    const optimized = findBestGlobalPairings(
      players,
      tournament,
      summaries,
      roundNumber,
      false,
    )
    return optimized.length * 2 === players.length ? optimized : completeNonRepeatPairings
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
