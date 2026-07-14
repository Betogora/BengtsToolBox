import { tournamentDomain } from '@/apps/swiss-tournaments/domain/tournamentDomain'
import type {
  GameResult,
  Pairing,
  Player,
  Round,
  Tournament,
  TournamentFormat,
} from '@/apps/swiss-tournaments/types'

export type TournamentBenchmarkScenario = {
  id: string
  execute: () => string
}

export type TournamentBenchmarkMeasurement = {
  id: string
  signature: string
  medianMilliseconds: number
  p95Milliseconds: number
  maximumMilliseconds: number
  longTaskCount: number
  longTaskDurationMilliseconds: number
}

export type TournamentBenchmarkBrowserResult = {
  longTaskApiSupported: boolean
  userAgent: string
  hardwareConcurrency: number
  measurements: TournamentBenchmarkMeasurement[]
}

const longTaskThresholdMilliseconds = 50

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1}`,
    rating: 2400 - index * 25,
    initialSeed: index + 1,
    status: 'active',
    addedInRound: 1,
  }))
}

function makeTournament(
  format: TournamentFormat,
  players: Player[],
  rounds: Round[],
  numberOfRounds: number,
): Tournament {
  return {
    id: `benchmark-${format}`,
    name: `${format} benchmark`,
    format,
    numberOfRounds,
    currentRound: rounds.length,
    players,
    rounds,
    settings: {
      initialSeedingMode: 'rating',
      byeScore: format === 'marioKart' ? 0.5 : 1,
      byePolicy: 'protectLateEntrants',
      roundRobinCycles: 1,
    },
    position: 0,
    createdAtClientIso: '2026-07-13T00:00:00.000Z',
  }
}

function resultFor(roundIndex: number, boardIndex: number): GameResult {
  return ['1-0', '0-1', '0.5-0.5'][(roundIndex + boardIndex) % 3] as GameResult
}

function makeCircleRounds(players: Player[], roundCount: number): Round[] {
  let slots = [...players]

  return Array.from({ length: roundCount }, (_, roundIndex) => {
    const pairings = Array.from({ length: slots.length / 2 }, (_unused, boardIndex) => {
      const white = slots[boardIndex]
      const black = slots[slots.length - 1 - boardIndex]

      return {
        id: `circle-${roundIndex + 1}-${boardIndex + 1}`,
        roundNumber: roundIndex + 1,
        boardNumber: boardIndex + 1,
        kind: 'standard' as const,
        whitePlayerId: white.id,
        blackPlayerId: black.id,
        result: resultFor(roundIndex, boardIndex),
        isManual: false,
        isBye: false,
      }
    })

    slots = [slots[0], slots.at(-1)!, ...slots.slice(1, -1)]

    return {
      id: `circle-round-${roundIndex + 1}`,
      roundNumber: roundIndex + 1,
      pairings,
      status: 'completed',
    }
  })
}

function makeRoundRobinBoundaryTournament(): Tournament {
  const players = makePlayers(16)
  const leftPlayers = players.slice(0, 7)
  const rightPlayers = players.slice(7)
  const rounds = Array.from({ length: 9 }, (_, roundIndex) => ({
    id: `round-robin-boundary-${roundIndex + 1}`,
    roundNumber: roundIndex + 1,
    status: 'completed' as const,
    pairings: leftPlayers.map((left, leftIndex) => {
      const right = rightPlayers[(leftIndex + roundIndex) % rightPlayers.length]
      return {
        id: `cross-${roundIndex + 1}-${leftIndex + 1}`,
        roundNumber: roundIndex + 1,
        boardNumber: leftIndex + 1,
        kind: 'standard' as const,
        whitePlayerId: left.id,
        blackPlayerId: right.id,
        result: resultFor(roundIndex, leftIndex),
        isManual: false,
        isBye: false,
      }
    }),
  }))

  return makeTournament('roundRobin', players, rounds, 15)
}

function makeMarioKartHistoryTournament(): Tournament {
  const players = makePlayers(32)
  const cycleCount = 8
  const lobbyCount = players.length / 4
  const rounds: Round[] = []

  for (let cycle = 1; cycle <= cycleCount; cycle += 1) {
    const shiftedPlayers = players.map(
      (_player, index) => players[(index + cycle - 1) % players.length],
    )

    for (let lobbyIndex = 0; lobbyIndex < lobbyCount; lobbyIndex += 1) {
      const roundNumber = (cycle - 1) * lobbyCount + lobbyIndex + 1
      const lobbyPlayers = shiftedPlayers.slice(lobbyIndex * 4, lobbyIndex * 4 + 4)
      const pairing: Pairing = {
        id: `mario-kart-${cycle}-${lobbyIndex + 1}`,
        roundNumber,
        boardNumber: 1,
        kind: 'marioKart',
        marioKartCycleNumber: cycle,
        marioKartCycleLobbyNumber: lobbyIndex + 1,
        marioKartRacers: lobbyPlayers.map((player, racerIndex) => ({
          playerId: player.id,
          scoringCycleNumber: cycle,
          placement: ((racerIndex + cycle + lobbyIndex) % 4) + 1,
        })),
        isManual: false,
        isBye: false,
      }

      rounds.push({
        id: `mario-kart-round-${roundNumber}`,
        roundNumber,
        pairings: [pairing],
        status: 'completed',
      })
    }
  }

  return makeTournament('marioKart', players, rounds, cycleCount)
}

function hashSignature(value: string) {
  let hash = 0x811c9dc5

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function pairingSignature(pairings: Pairing[]) {
  const content = pairings
    .map((pairing) => {
      const participants = [
        pairing.whitePlayerId,
        pairing.blackPlayerId,
        pairing.byePlayerId,
        ...(pairing.marioKartRacers?.map((racer) => racer.playerId) ?? []),
      ]
        .filter(Boolean)
        .sort()
        .join(',')
      const warnings = (pairing.warnings ?? [])
        .map((warning) => `${warning.severity}:${warning.id}`)
        .sort()
        .join(',')
      return `${participants}[${warnings}]`
    })
    .sort()
    .join('|')

  return `${pairings.length}:${hashSignature(content)}`
}

function standingsSignature(tournament: Tournament) {
  const rows = tournamentDomain.inspect(tournament).standings
  const content = rows
    .map(
      (row) =>
        `${row.playerId}:${row.rank}:${row.points}:${row.wins}:${row.buchholz}:${row.sonnebornBerger}:${row.marioKartAveragePlacement}`,
    )
    .join('|')

  return `${rows.length}:${hashSignature(content)}`
}

function planNextPairings(tournament: Tournament) {
  const decision = tournamentDomain.transition(tournament, {
    command: { type: 'round.plan-next' },
  })

  if (decision.status !== 'changed') {
    return { label: decision.status, pairings: [] as Pairing[] }
  }

  return {
    label: 'created',
    pairings: decision.tournament.rounds.at(-1)?.pairings ?? [],
  }
}

export function getTournamentBenchmarkScenarios(): TournamentBenchmarkScenario[] {
  const swissPlayers = makePlayers(32)
  const swissPairingTournament = makeTournament(
    'swiss',
    swissPlayers,
    makeCircleRounds(swissPlayers, 8),
    9,
  )
  const swissStandingsTournament = makeTournament(
    'swiss',
    swissPlayers,
    makeCircleRounds(swissPlayers, 9),
    9,
  )
  const roundRobinBoundaryTournament = makeRoundRobinBoundaryTournament()
  const marioKartPlanningPlayers = makePlayers(30)
  const marioKartPlanningTournament = makeTournament(
    'marioKart',
    marioKartPlanningPlayers,
    [],
    8,
  )
  const marioKartHistoryTournament = makeMarioKartHistoryTournament()

  return [
    {
      id: 'swiss-pairing-32-round-9',
      execute: () => pairingSignature(planNextPairings(swissPairingTournament).pairings),
    },
    {
      id: 'round-robin-repair-16-state-limit',
      execute: () =>
        pairingSignature(planNextPairings(roundRobinBoundaryTournament).pairings),
    },
    {
      id: 'mario-kart-planning-30-combination-limit',
      execute: () => {
        const result = planNextPairings(marioKartPlanningTournament)
        return `${result.label}:${pairingSignature(result.pairings)}`
      },
    },
    {
      id: 'swiss-standings-32-rounds-9',
      execute: () => standingsSignature(swissStandingsTournament),
    },
    {
      id: 'mario-kart-standings-32-cycles-8',
      execute: () => standingsSignature(marioKartHistoryTournament),
    },
  ]
}

function percentile(values: number[], quantile: number) {
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.max(0, Math.ceil(sorted.length * quantile) - 1)
  return sorted[index]
}

function nextTask() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0))
}

async function executeInOwnTask(execute: () => string) {
  return new Promise<{ duration: number; signature: string; startedAt: number; endedAt: number }>(
    (resolve) => {
      setTimeout(() => {
        const startedAt = performance.now()
        const signature = execute()
        const endedAt = performance.now()
        resolve({ duration: endedAt - startedAt, signature, startedAt, endedAt })
      }, 0)
    },
  )
}

export async function runTournamentBenchmarkSuite(
  warmupIterations = 3,
  sampleIterations = 10,
): Promise<TournamentBenchmarkBrowserResult> {
  const scenarios = getTournamentBenchmarkScenarios()
  const longTasks: PerformanceEntry[] = []
  const longTaskApiSupported = PerformanceObserver.supportedEntryTypes.includes('longtask')
  const observer = longTaskApiSupported
    ? new PerformanceObserver((list) => longTasks.push(...list.getEntries()))
    : null

  observer?.observe({ type: 'longtask', buffered: true })

  const measurements: TournamentBenchmarkMeasurement[] = []

  for (const scenario of scenarios) {
    for (let index = 0; index < warmupIterations; index += 1) {
      await executeInOwnTask(scenario.execute)
      await nextTask()
    }

    longTasks.length = 0
    observer?.takeRecords()

    const samples: number[] = []
    const scenarioLongTasks: PerformanceEntry[] = []
    let expectedSignature: string | null = null

    for (let index = 0; index < sampleIterations; index += 1) {
      const result = await executeInOwnTask(scenario.execute)
      await nextTask()
      await nextTask()

      if (expectedSignature !== null && result.signature !== expectedSignature) {
        throw new Error(
          `${scenario.id} lieferte keine stabile Ergebnissignatur: ${expectedSignature} / ${result.signature}`,
        )
      }

      expectedSignature = result.signature
      samples.push(result.duration)
      scenarioLongTasks.push(
        ...longTasks.filter(
          (entry) =>
            entry.duration >= longTaskThresholdMilliseconds &&
            entry.startTime <= result.endedAt &&
            entry.startTime + entry.duration >= result.startedAt,
        ),
      )
      longTasks.length = 0
    }

    measurements.push({
      id: scenario.id,
      signature: expectedSignature ?? '',
      medianMilliseconds: percentile(samples, 0.5),
      p95Milliseconds: percentile(samples, 0.95),
      maximumMilliseconds: Math.max(...samples),
      longTaskCount: scenarioLongTasks.length,
      longTaskDurationMilliseconds: scenarioLongTasks.reduce(
        (sum, entry) => sum + entry.duration,
        0,
      ),
    })
  }

  observer?.disconnect()

  return {
    longTaskApiSupported,
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    measurements,
  }
}
