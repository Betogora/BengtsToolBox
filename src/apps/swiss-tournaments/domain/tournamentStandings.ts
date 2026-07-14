import type { GameResult, Pairing, StandingRoundCell, StandingRow, Tournament } from '@/apps/swiss-tournaments/types'
import { createMarioKartStandingRows, getMarioKartRacers as marioKartRacers, getMarioKartScoringRacers as marioKartScoringRacers, getMarioKartScoringPlacement } from '@/apps/swiss-tournaments/marioKart'
import { averageOpponentPoints, countMarioKartEvents, getSummaryBeforeRound, hasCompleteMarioKartResult, opponentIdsForPlayer, pairingKind, playerColor, playerRole, resultPoints, roundRobinRoundsForPlayerCount, scoringPairingPlayerIds } from './pairingSupport'
import { getRoundRobinEligiblePlayers } from './roundRobinFormat'

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

    const pairing = round.pairings.find(
      (entry) =>
        scoringPairingPlayerIds(entry).includes(row.playerId) ||
        (entry.kind === 'marioKart' &&
          marioKartRacers(entry).some((racer) => racer.playerId === row.playerId)),
    )

    if (!pairing) {
      return createOpenRoundCell(tournament, roundNumber)
    }

    if (pairing.isBye && pairing.byePlayerId === row.playerId) {
      const label = `BYE${resultLabelForPlayer(pairing, row.playerId)}`

      return {
        roundNumber,
        label,
        title: `Runde ${roundNumber}: Bye, Ergebnis ${resultTitle(pairing.result)}`,
        color: '-' as const,
        outcome: 'bye' as const,
      }
    }

    if (pairing.kind === 'marioKart') {
      const scoringRacers = marioKartScoringRacers(pairing)
      const ownRacer = marioKartRacers(pairing).find(
        (racer) => racer.playerId === row.playerId,
      )
      const isScoringRacer =
        ownRacer !== undefined && ownRacer.scoringCycleNumber !== null
      const scoringPlacement = ownRacer
        ? getMarioKartScoringPlacement(pairing, ownRacer)
        : undefined
      const opponentNames = (
        isScoringRacer
          ? opponentIdsForPlayer(pairing, row.playerId)
          : scoringRacers.map((racer) => racer.playerId)
      ).map((opponentId) => playerById.get(opponentId)?.name ?? 'unbekannt')
      const points = isScoringRacer ? resultPoints(pairing, row.playerId) : 0
      const placementLabel =
        isScoringRacer
          ? ownRacer?.placement
            ? `P${ownRacer.placement}`
            : 'P-'
          : 'Extra'
      const resultLabel =
        isScoringRacer && ownRacer?.placement
          ? `+${formatPoints(points)}`
          : isScoringRacer
            ? 'offen'
            : 'ohne Wertung'
      const lobbyLabel = getRoundDisplayLabel(tournament, roundNumber)
      const shortLobbyLabel =
        pairing.marioKartCycleNumber && pairing.marioKartCycleLobbyNumber
          ? `${pairing.marioKartCycleNumber}.${pairing.marioKartCycleLobbyNumber}`
          : `${pairing.boardNumber}`
      const eventLabel = ownRacer?.event ? ', Bier: ja' : ', Bier: nein'

      return {
        roundNumber,
        label: `${shortLobbyLabel} ${placementLabel} ${isScoringRacer && ownRacer?.placement ? `+${formatPoints(points)}` : '-'}${ownRacer?.event ? ' B' : ''}`,
        title: `${lobbyLabel}: gegen ${opponentNames.join(' / ') || 'unbekannt'}, ${resultLabel}${eventLabel}`,
        color: '-' as const,
        outcome: !isScoringRacer || !scoringPlacement
          ? 'open'
          : scoringPlacement === 1
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
  if (tournament.format === 'marioKart') {
    const rankedRows = createMarioKartStandingRows(tournament)
    const rankByPlayerId = new Map(
      rankedRows.map((row) => [row.playerId, row.rank] as const),
    )

    return rankedRows.map((row) => ({
      ...row,
      roundHistory: createRoundHistory(tournament, row, rankByPlayerId),
    }))
  }

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
      marioKartWins: summary.wins,
      marioKartAveragePlacement:
        summary.marioKartPlacements.length > 0
          ? summary.marioKartPlacements.reduce((sum, placement) => sum + placement, 0) /
            summary.marioKartPlacements.length
          : null,
      marioKartExtraRides: summary.marioKartExtraRides,
      marioKartPhysicalRaces: summary.marioKartPhysicalRaces,
      marioKartScoringRaces: summary.marioKartScoringRaces,
      marioKartEvents: countMarioKartEvents(tournament, player.id),
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
        'Durchschnittsplatz',
        'Physische Rennen',
        'Wertende Rennen',
        'Biere',
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
            row.marioKartAveragePlacement === null
              ? ''
              : formatPoints(row.marioKartAveragePlacement),
            row.marioKartPhysicalRaces,
            row.marioKartScoringRaces,
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
