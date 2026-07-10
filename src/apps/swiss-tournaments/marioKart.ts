import type {
  MarioKartRacer,
  Pairing,
  Player,
  PlayerStatus,
  Round,
  StandingRow,
  Tournament,
} from '@/apps/swiss-tournaments/types'

const MARIO_KART_LOBBY_SIZE = 4
export const MARIO_KART_MAX_PLACEMENT = 15

const pointsByScoringCount: Record<number, number[]> = {
  1: [1],
  2: [1, 0],
  3: [1, 0.5, 0],
  4: [1, 0.7, 0.3, 0],
}

type MarioKartPlacementError = 'required' | 'range' | 'duplicate'

type MarioKartPlanningBlockedReason =
  | 'not-mario-kart'
  | 'not-enough-eligible-players'
  | 'not-enough-unreserved-players'

type MarioKartPlanningResult = {
  tournament: Tournament
  blockedReason?: MarioKartPlanningBlockedReason
  createdRoundNumber?: number
}

type MarioKartLedgerEntry = {
  player: Player
  assignedCycles: Set<number>
  physicalRaces: number
  completedScoringRaces: number
  points: number
  wins: number
  placements: number[]
  events: number
  extras: number
  fillIns: number
  lastFillInRound: number | null
  opponents: Map<string, number>
}

type MarioKartLedger = {
  byPlayerId: Map<string, MarioKartLedgerEntry>
  reservedPlayerIds: Set<string>
  physicalRaceNumberByRoundAndPlayer: Map<string, number>
  highestStartedCycle: number
}

type PlanningCandidate = {
  player: Player
  scoringCycleNumber: number
}

function roundPlayerKey(roundNumber: number, playerId: string) {
  return `${roundNumber}:${playerId}`
}

function sortedRounds(tournament: Tournament) {
  return [...tournament.rounds].sort(
    (left, right) => left.roundNumber - right.roundNumber,
  )
}

export function getMarioKartRacers(pairing: Pairing) {
  return pairing.kind === 'marioKart' ? pairing.marioKartRacers ?? [] : []
}

export function getMarioKartScoringRacers(pairing: Pairing) {
  return getMarioKartRacers(pairing).filter(
    (racer) => racer.scoringCycleNumber !== null,
  )
}

export function getMarioKartExtraRacers(pairing: Pairing) {
  return getMarioKartRacers(pairing).filter(
    (racer) => racer.scoringCycleNumber === null,
  )
}

function isPlacementInRange(placement: number | undefined) {
  return (
    Number.isInteger(placement) &&
    placement !== undefined &&
    placement >= 1 &&
    placement <= MARIO_KART_MAX_PLACEMENT
  )
}

export function getMarioKartPlacementErrors(pairing: Pairing) {
  const errors = new Map<string, MarioKartPlacementError>()
  const racers = getMarioKartRacers(pairing)
  const placementCounts = new Map<number, number>()

  racers.forEach((racer) => {
    if (typeof racer.placement === 'number') {
      placementCounts.set(
        racer.placement,
        (placementCounts.get(racer.placement) ?? 0) + 1,
      )
    }
  })

  racers.forEach((racer) => {
    if (racer.placement === undefined) {
      errors.set(racer.playerId, 'required')
    } else if (!isPlacementInRange(racer.placement)) {
      errors.set(racer.playerId, 'range')
    } else if ((placementCounts.get(racer.placement) ?? 0) > 1) {
      errors.set(racer.playerId, 'duplicate')
    }
  })

  return errors
}

export function isMarioKartPairingComplete(pairing: Pairing) {
  return (
    pairing.kind === 'marioKart' &&
    getMarioKartRacers(pairing).length === MARIO_KART_LOBBY_SIZE &&
    getMarioKartPlacementErrors(pairing).size === 0
  )
}

export function getMarioKartScoringPlacement(
  pairing: Pairing,
  racer: MarioKartRacer,
) {
  if (racer.scoringCycleNumber === null || !isPlacementInRange(racer.placement)) {
    return undefined
  }

  return (
    getMarioKartScoringRacers(pairing).filter(
      (other) =>
        typeof other.placement === 'number' &&
        typeof racer.placement === 'number' &&
        other.placement < racer.placement,
    ).length + 1
  )
}

export function getMarioKartTournamentPoints(
  pairing: Pairing,
  racer: MarioKartRacer,
) {
  const placement = getMarioKartScoringPlacement(pairing, racer)
  const scoringCount = getMarioKartScoringRacers(pairing).length

  if (!placement) {
    return 0
  }

  return pointsByScoringCount[scoringCount]?.[placement - 1] ?? 0
}

function makeLedgerEntry(player: Player): MarioKartLedgerEntry {
  return {
    player,
    assignedCycles: new Set<number>(),
    physicalRaces: 0,
    completedScoringRaces: 0,
    points: 0,
    wins: 0,
    placements: [],
    events: 0,
    extras: 0,
    fillIns: 0,
    lastFillInRound: null,
    opponents: new Map<string, number>(),
  }
}

function deriveMarioKartLedger(tournament: Tournament): MarioKartLedger {
  const byPlayerId = new Map(
    tournament.players.map((player) => [player.id, makeLedgerEntry(player)]),
  )
  const reservedPlayerIds = new Set<string>()
  const physicalRaceNumberByRoundAndPlayer = new Map<string, number>()
  let highestStartedCycle = 0

  sortedRounds(tournament).forEach((round) => {
    round.pairings.forEach((pairing) => {
      if (pairing.kind !== 'marioKart') {
        return
      }

      const racers = getMarioKartRacers(pairing)

      racers.forEach((racer) => {
        const entry = byPlayerId.get(racer.playerId)

        if (!entry) {
          return
        }

        entry.physicalRaces += 1
        physicalRaceNumberByRoundAndPlayer.set(
          roundPlayerKey(round.roundNumber, racer.playerId),
          entry.physicalRaces,
        )

        if (round.status === 'draft') {
          reservedPlayerIds.add(racer.playerId)
        }

        if (racer.event) {
          entry.events += 1
        }

        if (racer.scoringCycleNumber === null) {
          entry.extras += 1
        } else {
          entry.assignedCycles.add(racer.scoringCycleNumber)
          highestStartedCycle = Math.max(
            highestStartedCycle,
            racer.scoringCycleNumber,
          )

          if (
            pairing.marioKartCycleNumber !== undefined &&
            racer.scoringCycleNumber > pairing.marioKartCycleNumber
          ) {
            entry.fillIns += 1
            entry.lastFillInRound = round.roundNumber
          }
        }
      })

      racers.forEach((racer) => {
        const entry = byPlayerId.get(racer.playerId)

        if (!entry) {
          return
        }

        racers.forEach((opponent) => {
          if (opponent.playerId !== racer.playerId) {
            entry.opponents.set(
              opponent.playerId,
              (entry.opponents.get(opponent.playerId) ?? 0) + 1,
            )
          }
        })
      })

      if (round.status !== 'completed' || !isMarioKartPairingComplete(pairing)) {
        return
      }

      getMarioKartScoringRacers(pairing).forEach((racer) => {
        const entry = byPlayerId.get(racer.playerId)
        const placement = getMarioKartScoringPlacement(pairing, racer)

        if (!entry || !placement || racer.placement === undefined) {
          return
        }

        entry.completedScoringRaces += 1
        entry.points += getMarioKartTournamentPoints(pairing, racer)
        entry.placements.push(racer.placement)

        if (placement === 1) {
          entry.wins += 1
        }
      })
    })
  })

  return {
    byPlayerId,
    reservedPlayerIds,
    physicalRaceNumberByRoundAndPlayer,
    highestStartedCycle,
  }
}

function averagePlacement(entry: MarioKartLedgerEntry) {
  return entry.placements.length > 0
    ? entry.placements.reduce((sum, placement) => sum + placement, 0) /
        entry.placements.length
    : null
}

function directEncounterScore(
  tournament: Tournament,
  playerId: string,
  tiedPlayerIds: Set<string>,
) {
  let score = 0
  let encounters = 0

  sortedRounds(tournament).forEach((round) => {
    if (round.status !== 'completed') {
      return
    }

    round.pairings.forEach((pairing) => {
      if (!isMarioKartPairingComplete(pairing)) {
        return
      }

      const ownRacer = getMarioKartScoringRacers(pairing).find(
        (racer) => racer.playerId === playerId,
      )

      if (!ownRacer || ownRacer.placement === undefined) {
        return
      }

      const ownPlacement = ownRacer.placement

      getMarioKartScoringRacers(pairing).forEach((opponent) => {
        if (
          opponent.playerId === playerId ||
          !tiedPlayerIds.has(opponent.playerId) ||
          opponent.placement === undefined
        ) {
          return
        }

        encounters += 1
        score += ownPlacement < opponent.placement ? 1 : 0
      })
    })
  })

  return encounters > 0 ? score : null
}

function sportingKey(row: StandingRow) {
  return [
    row.points,
    row.marioKartWins,
    row.marioKartAveragePlacement ?? 'none',
    row.directEncounterScore ?? 'none',
  ].join('|')
}

export function createMarioKartStandingRows(tournament: Tournament): StandingRow[] {
  const ledger = deriveMarioKartLedger(tournament)
  const rows = tournament.players.map((player) => {
    const entry = ledger.byPlayerId.get(player.id) ?? makeLedgerEntry(player)

    return {
      playerId: player.id,
      rank: 0,
      playerName: player.name,
      rating: player.rating,
      points: entry.points,
      buchholz: 0,
      sonnebornBerger: 0,
      wins: entry.wins,
      directEncounterScore: null,
      initialSeed: player.initialSeed,
      colorHistory: [],
      roundHistory: [],
      receivedByes: 0,
      receivedSingleGames: 0,
      marioKartWins: entry.wins,
      marioKartAveragePlacement: averagePlacement(entry),
      marioKartExtraRides: entry.extras,
      marioKartPhysicalRaces: entry.physicalRaces,
      marioKartScoringRaces: entry.completedScoringRaces,
      marioKartEvents: entry.events,
      status: player.status,
    } satisfies StandingRow
  })
  const directGroups = new Map<string, Set<string>>()

  rows.forEach((row) => {
    const key = [
      row.points,
      row.marioKartWins,
      row.marioKartAveragePlacement ?? 'none',
    ].join('|')
    directGroups.set(key, new Set([...(directGroups.get(key) ?? []), row.playerId]))
  })

  const ranked = rows
    .map((row) => {
      const key = [
        row.points,
        row.marioKartWins,
        row.marioKartAveragePlacement ?? 'none',
      ].join('|')

      return {
        ...row,
        directEncounterScore: directEncounterScore(
          tournament,
          row.playerId,
          directGroups.get(key) ?? new Set<string>(),
        ),
      }
    })
    .sort((left, right) => {
      const leftAverage =
        left.marioKartAveragePlacement ?? Number.POSITIVE_INFINITY
      const rightAverage =
        right.marioKartAveragePlacement ?? Number.POSITIVE_INFINITY

      return (
        right.points - left.points ||
        right.marioKartWins - left.marioKartWins ||
        leftAverage - rightAverage ||
        (right.directEncounterScore ?? -1) -
          (left.directEncounterScore ?? -1) ||
        left.initialSeed - right.initialSeed ||
        left.playerName.localeCompare(right.playerName, 'de')
      )
    })

  return ranked.reduce<StandingRow[]>((rowsWithRanks, row, index) => {
    const previous = rowsWithRanks[rowsWithRanks.length - 1]

    rowsWithRanks.push({
      ...row,
      rank:
        previous && sportingKey(previous) === sportingKey(row)
          ? previous.rank
          : index + 1,
    })

    return rowsWithRanks
  }, [])
}

export function createMarioKartBeerStandingRows(tournament: Tournament) {
  const rows = createMarioKartStandingRows(tournament).sort(
    (left, right) =>
      right.marioKartEvents - left.marioKartEvents || left.rank - right.rank,
  )

  return rows.map((row, index) => ({
    playerId: row.playerId,
    beers: row.marioKartEvents,
    rank:
      rows.findIndex(
        (entry) => entry.marioKartEvents === row.marioKartEvents,
      ) + 1 || index + 1,
  }))
}

function playerEligibleFromCycle(player: Player) {
  return Math.max(1, player.marioKartEligibleFromCycle ?? 1)
}

function skippedCycles(player: Player) {
  return new Set(player.marioKartSkippedCycleNumbers ?? [])
}

function skippedCycleNumbersThrough(
  player: Player,
  entry: MarioKartLedgerEntry | undefined,
  throughCycle: number,
) {
  const skipped = skippedCycles(player)

  for (let cycle = playerEligibleFromCycle(player); cycle <= throughCycle; cycle += 1) {
    if (!entry?.assignedCycles.has(cycle)) {
      skipped.add(cycle)
    }
  }

  return [...skipped].sort((left, right) => left - right)
}

function updatePlayer(
  tournament: Tournament,
  playerId: string,
  changes: Partial<Player>,
) {
  return {
    ...tournament,
    players: tournament.players.map((player) =>
      player.id === playerId ? { ...player, ...changes } : player,
    ),
  }
}

function nextOpenCycle(
  player: Player,
  entry: MarioKartLedgerEntry,
  maximumCycle: number,
) {
  const skipped = skippedCycles(player)

  for (
    let cycle = playerEligibleFromCycle(player);
    cycle <= maximumCycle;
    cycle += 1
  ) {
    if (!skipped.has(cycle) && !entry.assignedCycles.has(cycle)) {
      return cycle
    }
  }

  return null
}

function combinations<T>(values: T[], count: number, limit = 25_000) {
  const result: T[][] = []

  function visit(start: number, selected: T[]) {
    if (result.length >= limit) {
      return
    }

    if (selected.length === count) {
      result.push(selected)
      return
    }

    for (let index = start; index < values.length; index += 1) {
      visit(index + 1, [...selected, values[index]])
    }
  }

  if (count === 0) {
    return [[]]
  }

  visit(0, [])
  return result
}

function compareScores(left: number[], right: number[]) {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)

    if (difference !== 0) {
      return difference
    }
  }

  return 0
}

function groupScore(
  candidates: PlanningCandidate[],
  ledger: MarioKartLedger,
  targetCycle: number,
  avoidedPlayerIds: Set<string>,
) {
  const entries = candidates.map(
    (candidate) => ledger.byPlayerId.get(candidate.player.id)!,
  )
  const points = entries.map((entry) => entry.points)
  const averages = entries.map(
    (entry) => averagePlacement(entry) ?? Number.POSITIVE_INFINITY,
  )
  let repetitions = 0

  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      repetitions +=
        entries[left].opponents.get(candidates[right].player.id) ?? 0
    }
  }

  const finiteAverages = averages.filter(Number.isFinite)

  return [
    candidates.reduce(
      (sum, candidate) => sum + candidate.scoringCycleNumber,
      0,
    ),
    Math.max(...points) - Math.min(...points),
    repetitions,
    candidates.reduce(
      (sum, candidate) =>
        sum +
        (candidate.scoringCycleNumber > targetCycle
          ? ledger.byPlayerId.get(candidate.player.id)!.fillIns
          : 0),
      0,
    ),
    candidates.reduce(
      (sum, candidate) =>
        sum +
        (candidate.scoringCycleNumber > targetCycle
          ? Math.max(
              0,
              100 -
                (ledger.byPlayerId.get(candidate.player.id)!
                  .lastFillInRound ??
                  -100),
            )
          : 0),
      0,
    ),
    finiteAverages.length > 1
      ? Math.max(...finiteAverages) - Math.min(...finiteAverages)
      : 0,
    candidates.filter((candidate) => avoidedPlayerIds.has(candidate.player.id))
      .length,
    candidates.reduce((sum, candidate) => sum + candidate.player.initialSeed, 0),
  ]
}

function chooseBestCandidates(
  fixed: PlanningCandidate[],
  pool: PlanningCandidate[],
  count: number,
  ledger: MarioKartLedger,
  targetCycle: number,
  avoidedPlayerIds: Set<string>,
) {
  const choices = combinations(pool, count)

  return (
    choices.sort((left, right) =>
      compareScores(
        groupScore([...fixed, ...left], ledger, targetCycle, avoidedPlayerIds),
        groupScore([...fixed, ...right], ledger, targetCycle, avoidedPlayerIds),
      ),
    )[0] ?? []
  )
}

function chooseExtras(
  fixed: PlanningCandidate[],
  players: Player[],
  count: number,
  ledger: MarioKartLedger,
  targetCycle: number,
  avoidedPlayerIds: Set<string>,
) {
  const extraCandidates = players.map((player) => ({
    player,
    scoringCycleNumber: targetCycle,
  }))

  return chooseBestCandidates(
    fixed,
    extraCandidates,
    count,
    ledger,
    targetCycle,
    avoidedPlayerIds,
  ).map(({ player }) => player)
}

function promoteHistoricalExtras(
  tournament: Tournament,
  bonusCycle: number,
  availablePlayerIds: Set<string>,
) {
  const ledger = deriveMarioKartLedger(tournament)
  const unassignedAvailableIds = new Set(
    [...availablePlayerIds].filter(
      (playerId) => !ledger.byPlayerId.get(playerId)?.assignedCycles.has(bonusCycle),
    ),
  )
  const promotedByRoundAndPlayer = new Set<string>()

  for (const round of sortedRounds(tournament)) {
    if (unassignedAvailableIds.size <= MARIO_KART_LOBBY_SIZE) {
      break
    }

    if (round.status !== 'completed') {
      continue
    }

    for (const pairing of round.pairings) {
      if (!isMarioKartPairingComplete(pairing)) {
        continue
      }

      for (const racer of getMarioKartExtraRacers(pairing)) {
        if (!unassignedAvailableIds.has(racer.playerId)) {
          continue
        }

        promotedByRoundAndPlayer.add(
          roundPlayerKey(round.roundNumber, racer.playerId),
        )
        unassignedAvailableIds.delete(racer.playerId)

        if (unassignedAvailableIds.size <= MARIO_KART_LOBBY_SIZE) {
          break
        }
      }
    }
  }

  if (promotedByRoundAndPlayer.size === 0) {
    return tournament
  }

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) => ({
      ...round,
      pairings: round.pairings.map((pairing) => ({
        ...pairing,
        marioKartRacers: getMarioKartRacers(pairing).map((racer) =>
          promotedByRoundAndPlayer.has(
            roundPlayerKey(round.roundNumber, racer.playerId),
          )
            ? { ...racer, scoringCycleNumber: bonusCycle }
            : racer,
        ),
      })),
    })),
  }
}

function markInactiveCyclesSkipped(tournament: Tournament, throughCycle: number) {
  const ledger = deriveMarioKartLedger(tournament)

  return {
    ...tournament,
    players: tournament.players.map((player) => {
      if (player.status !== 'inactive') {
        return player
      }

      return {
        ...player,
        marioKartSkippedCycleNumbers: skippedCycleNumbersThrough(
          player,
          ledger.byPlayerId.get(player.id),
          throughCycle,
        ),
      }
    }),
  }
}

function activeAvailablePlayers(tournament: Tournament, ledger: MarioKartLedger) {
  return tournament.players
    .filter((player) => player.status === 'active')
    .filter((player) => !ledger.reservedPlayerIds.has(player.id))
}

export function getMarioKartPlanningAvailability(tournament: Tournament) {
  if (tournament.format !== 'marioKart') {
    return {
      canCreate: false,
      availablePlayerCount: 0,
      blockedReason: 'not-mario-kart' as const,
    }
  }

  const ledger = deriveMarioKartLedger(tournament)
  const activePlayers = tournament.players.filter(
    (player) => player.status === 'active',
  )
  const availablePlayers = activeAvailablePlayers(tournament, ledger)

  if (activePlayers.length < MARIO_KART_LOBBY_SIZE) {
    return {
      canCreate: false,
      availablePlayerCount: availablePlayers.length,
      blockedReason: 'not-enough-eligible-players' as const,
    }
  }

  if (availablePlayers.length < MARIO_KART_LOBBY_SIZE) {
    return {
      canCreate: false,
      availablePlayerCount: availablePlayers.length,
      blockedReason: 'not-enough-unreserved-players' as const,
    }
  }

  return {
    canCreate: true,
    availablePlayerCount: availablePlayers.length,
  }
}

function nextBonusCycle(tournament: Tournament, ledger: MarioKartLedger) {
  const existingBonusCycles = new Set<number>()

  ledger.byPlayerId.forEach((entry) => {
    entry.assignedCycles.forEach((cycle) => {
      if (cycle > tournament.numberOfRounds) {
        existingBonusCycles.add(cycle)
      }
    })
  })

  for (const cycle of [...existingBonusCycles].sort((left, right) => left - right)) {
    const hasOpenPlayer = tournament.players.some((player) => {
      const entry = ledger.byPlayerId.get(player.id)

      return (
        player.status === 'active' &&
        !skippedCycles(player).has(cycle) &&
        !entry?.assignedCycles.has(cycle)
      )
    })

    if (hasOpenPlayer) {
      return { cycle, isNew: false }
    }
  }

  return {
    cycle: Math.max(tournament.numberOfRounds, ledger.highestStartedCycle) + 1,
    isNew: true,
  }
}

export function planNextMarioKartLobby(
  tournament: Tournament,
  avoidedPlayerIds = new Set<string>(),
): MarioKartPlanningResult {
  const availability = getMarioKartPlanningAvailability(tournament)

  if (!availability.canCreate) {
    return {
      tournament,
      blockedReason: availability.blockedReason,
    }
  }

  let workingTournament = tournament
  let ledger = deriveMarioKartLedger(workingTournament)
  let availablePlayers = activeAvailablePlayers(workingTournament, ledger)
  let candidates = availablePlayers
    .map((player) => {
      const cycle = nextOpenCycle(
        player,
        ledger.byPlayerId.get(player.id)!,
        tournament.numberOfRounds,
      )

      return cycle === null
        ? null
        : { player, scoringCycleNumber: cycle }
    })
    .filter((candidate): candidate is PlanningCandidate => candidate !== null)

  if (candidates.length === 0) {
    const bonus = nextBonusCycle(workingTournament, ledger)

    if (bonus.isNew) {
      workingTournament = promoteHistoricalExtras(
        workingTournament,
        bonus.cycle,
        new Set(availablePlayers.map((player) => player.id)),
      )
      ledger = deriveMarioKartLedger(workingTournament)
      availablePlayers = activeAvailablePlayers(workingTournament, ledger)
    }

    candidates = availablePlayers
      .filter(
        (player) =>
          !skippedCycles(player).has(bonus.cycle) &&
          !ledger.byPlayerId.get(player.id)?.assignedCycles.has(bonus.cycle),
      )
      .map((player) => ({
        player,
        scoringCycleNumber: bonus.cycle,
      }))
  }

  const targetCycle = Math.min(
    ...candidates.map((candidate) => candidate.scoringCycleNumber),
  )
  const primaryCandidates = candidates.filter(
    (candidate) => candidate.scoringCycleNumber === targetCycle,
  )
  const selectedPrimary =
    primaryCandidates.length > MARIO_KART_LOBBY_SIZE
      ? chooseBestCandidates(
          [],
          primaryCandidates,
          MARIO_KART_LOBBY_SIZE,
          ledger,
          targetCycle,
          avoidedPlayerIds,
        )
      : primaryCandidates
  const selectedIds = new Set(
    selectedPrimary.map((candidate) => candidate.player.id),
  )
  const neededScoringFillers = MARIO_KART_LOBBY_SIZE - selectedPrimary.length
  const laterCandidates = candidates.filter(
    (candidate) =>
      candidate.scoringCycleNumber > targetCycle &&
      !selectedIds.has(candidate.player.id),
  )
  const selectedFillers = chooseBestCandidates(
    selectedPrimary,
    laterCandidates,
    Math.min(neededScoringFillers, laterCandidates.length),
    ledger,
    targetCycle,
    avoidedPlayerIds,
  )
  const scoringCandidates = [...selectedPrimary, ...selectedFillers]
  const scoringIds = new Set(
    scoringCandidates.map((candidate) => candidate.player.id),
  )
  const extrasNeeded = MARIO_KART_LOBBY_SIZE - scoringCandidates.length
  const extraPool = availablePlayers.filter(
    (player) => !scoringIds.has(player.id),
  )
  const extras = chooseExtras(
    scoringCandidates,
    extraPool,
    extrasNeeded,
    ledger,
    targetCycle,
    avoidedPlayerIds,
  )

  if (scoringCandidates.length + extras.length !== MARIO_KART_LOBBY_SIZE) {
    return {
      tournament,
      blockedReason: 'not-enough-unreserved-players',
    }
  }

  const roundNumber =
    workingTournament.rounds.reduce(
      (highest, round) => Math.max(highest, round.roundNumber),
      0,
    ) + 1
  const cycleLobbyNumber =
    workingTournament.rounds.reduce(
      (count, round) =>
        count +
        round.pairings.filter(
          (pairing) =>
            pairing.kind === 'marioKart' &&
            pairing.marioKartCycleNumber === targetCycle,
        ).length,
      0,
    ) + 1
  const racers: MarioKartRacer[] = [
    ...scoringCandidates.map((candidate) => ({
      playerId: candidate.player.id,
      scoringCycleNumber: candidate.scoringCycleNumber,
    })),
    ...extras.map((player) => ({
      playerId: player.id,
      scoringCycleNumber: null,
    })),
  ]
  const pairing: Pairing = {
    id: `mario-kart-pairing-${roundNumber}`,
    roundNumber,
    boardNumber: 1,
    kind: 'marioKart',
    marioKartCycleNumber: targetCycle,
    marioKartCycleLobbyNumber: cycleLobbyNumber,
    marioKartRacers: racers,
    isManual: false,
    isBye: false,
  }
  const round: Round = {
    id: `mario-kart-round-${roundNumber}`,
    roundNumber,
    pairings: [pairing],
    status: 'draft',
  }
  const nextTournament = markInactiveCyclesSkipped(
    {
      ...workingTournament,
      currentRound: roundNumber,
      rounds: [...workingTournament.rounds, round].sort(
        (left, right) => left.roundNumber - right.roundNumber,
      ),
    },
    Math.max(targetCycle, ...racers.flatMap((racer) =>
      racer.scoringCycleNumber === null ? [] : [racer.scoringCycleNumber],
    )),
  )

  return {
    tournament: nextTournament,
    createdRoundNumber: roundNumber,
  }
}

export function isLatestEmptyMarioKartLobby(
  tournament: Tournament,
  roundNumber: number,
) {
  const activeRounds = sortedRounds(tournament).filter(
    (round) => round.status === 'draft',
  )
  const latestActiveRound = activeRounds[activeRounds.length - 1]

  return Boolean(
    latestActiveRound?.roundNumber === roundNumber &&
      latestActiveRound.pairings.length === 1 &&
      getMarioKartRacers(latestActiveRound.pairings[0]).every(
        (racer) => racer.placement === undefined && !racer.event,
      ),
  )
}

export function deleteLatestEmptyMarioKartLobby(
  tournament: Tournament,
  roundNumber: number,
) {
  if (!isLatestEmptyMarioKartLobby(tournament, roundNumber)) {
    return tournament
  }

  const rounds = tournament.rounds.filter(
    (round) => round.roundNumber !== roundNumber,
  )

  return {
    ...tournament,
    currentRound: rounds.reduce(
      (highest, round) => Math.max(highest, round.roundNumber),
      0,
    ),
    rounds,
  }
}

export function rerollLatestEmptyMarioKartLobby(
  tournament: Tournament,
  roundNumber: number,
) {
  if (!isLatestEmptyMarioKartLobby(tournament, roundNumber)) {
    return tournament
  }

  const avoidedPlayerIds = new Set(
    tournament.rounds
      .find((round) => round.roundNumber === roundNumber)
      ?.pairings.flatMap((pairing) =>
        getMarioKartRacers(pairing).map((racer) => racer.playerId),
      ) ?? [],
  )
  const withoutLobby = deleteLatestEmptyMarioKartLobby(tournament, roundNumber)

  return planNextMarioKartLobby(withoutLobby, avoidedPlayerIds).tournament
}

type RacerResultPatch = Pick<MarioKartRacer, 'placement' | 'event'>

function patchRacerResult(racer: MarioKartRacer, partial: RacerResultPatch) {
  const next = { ...racer }

  for (const key of ['placement', 'event'] as const) {
    if (!(key in partial)) {
      continue
    }

    const value = partial[key]

    if (value === undefined || value === false) {
      delete next[key]
    } else {
      Object.assign(next, { [key]: value })
    }
  }

  return next
}

export function updateMarioKartRacer(
  tournament: Tournament,
  roundNumber: number,
  playerId: string,
  partial: { placement?: number; event?: boolean },
) {
  const targetRound = tournament.rounds.find(
    (round) => round.roundNumber === roundNumber,
  )

  if (
    !targetRound ||
    (targetRound.status === 'completed' &&
      ('placement' in partial || !('event' in partial)))
  ) {
    return tournament
  }

  const nextRound: Round = {
    ...targetRound,
    pairings: targetRound.pairings.map((pairing) => {
      if (pairing.kind !== 'marioKart') {
        return pairing
      }

      return {
        ...pairing,
        marioKartRacers: getMarioKartRacers(pairing).map((racer) =>
          racer.playerId === playerId ? patchRacerResult(racer, partial) : racer,
        ),
      }
    }),
  }
  const completed =
    targetRound.status === 'completed' ||
    nextRound.pairings.every(isMarioKartPairingComplete)

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...nextRound,
            status: completed ? ('completed' as const) : ('draft' as const),
          }
        : round,
    ),
  }
}

export function correctClosedMarioKartLobby(
  tournament: Tournament,
  roundNumber: number,
  racers: Array<Pick<MarioKartRacer, 'playerId' | 'placement' | 'event'>>,
) {
  const targetRound = tournament.rounds.find(
    (round) => round.roundNumber === roundNumber,
  )
  const pairing = targetRound?.pairings.find(
    (entry) => entry.kind === 'marioKart',
  )

  if (!targetRound || targetRound.status !== 'completed' || !pairing) {
    return tournament
  }

  const existingIds = getMarioKartRacers(pairing).map((racer) => racer.playerId)
  const nextIds = racers.map((racer) => racer.playerId)

  if (
    existingIds.length !== MARIO_KART_LOBBY_SIZE ||
    nextIds.length !== MARIO_KART_LOBBY_SIZE ||
    existingIds.some((playerId) => !nextIds.includes(playerId))
  ) {
    return tournament
  }

  const correctedPairing: Pairing = {
    ...pairing,
    marioKartRacers: getMarioKartRacers(pairing).map((racer) => {
      const correction = racers.find(
        (entry) => entry.playerId === racer.playerId,
      )!
      return patchRacerResult(racer, correction)
    }),
  }

  if (!isMarioKartPairingComplete(correctedPairing)) {
    return tournament
  }

  return {
    ...tournament,
    rounds: tournament.rounds.map((round) =>
      round.roundNumber === roundNumber
        ? {
            ...round,
            pairings: round.pairings.map((entry) =>
              entry.id === pairing.id ? correctedPairing : entry,
            ),
          }
        : round,
    ),
  }
}

function currentEntryCycle(tournament: Tournament, playerId?: string) {
  const ledger = deriveMarioKartLedger(tournament)
  const startedCycles = Array.from(
    new Set(
      [...ledger.byPlayerId.values()].flatMap((entry) => [
        ...entry.assignedCycles,
      ]),
    ),
  ).sort((left, right) => left - right)
  const currentPlayers = tournament.players.filter(
    (player) => player.status === 'active' && player.id !== playerId,
  )
  const unfinishedCycles = startedCycles.filter((cycle) =>
    currentPlayers.some((player) => {
      const entry = ledger.byPlayerId.get(player.id)

      return (
        playerEligibleFromCycle(player) <= cycle &&
        !skippedCycles(player).has(cycle) &&
        !entry?.assignedCycles.has(cycle)
      )
    }),
  )

  return (
    unfinishedCycles[unfinishedCycles.length - 1] ??
    (startedCycles[startedCycles.length - 1] ?? 0) + 1
  )
}

export function getMarioKartEntryCycle(tournament: Tournament) {
  return currentEntryCycle(tournament)
}

export function setMarioKartPlayerStatus(
  tournament: Tournament,
  playerId: string,
  status: PlayerStatus,
) {
  const player = tournament.players.find((entry) => entry.id === playerId)

  if (!player || player.status === 'withdrawn' || player.status === status) {
    return tournament
  }

  if (status !== 'active') {
    const ledger = deriveMarioKartLedger(tournament)

    return updatePlayer(tournament, playerId, {
      status,
      marioKartSkippedCycleNumbers: skippedCycleNumbersThrough(
        player,
        ledger.byPlayerId.get(playerId),
        ledger.highestStartedCycle,
      ),
    })
  }

  const entryCycle = currentEntryCycle(tournament, playerId)
  const ledger = deriveMarioKartLedger(tournament)

  return updatePlayer(tournament, playerId, {
    status: 'active',
    marioKartEligibleFromCycle: entryCycle,
    marioKartSkippedCycleNumbers: skippedCycleNumbersThrough(
      player,
      ledger.byPlayerId.get(playerId),
      entryCycle - 1,
    ),
  })
}

export function getMarioKartPhysicalRaceNumber(
  tournament: Tournament,
  roundNumber: number,
  playerId: string,
) {
  return (
    deriveMarioKartLedger(tournament).physicalRaceNumberByRoundAndPlayer.get(
      roundPlayerKey(roundNumber, playerId),
    ) ?? 0
  )
}
