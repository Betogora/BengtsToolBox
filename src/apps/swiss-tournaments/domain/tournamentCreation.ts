import type { CreateTournamentInput, Player, PlayerInput, Tournament } from '@/apps/swiss-tournaments/types'
import { makeId, normalizeRoundRobinCycles, roundRobinRoundsForPlayerCount } from './pairingSupport'

const defaultSettings = {
  initialSeedingMode: 'rating' as const,
  byeScore: 1 as const,
  byePolicy: 'protectLateEntrants' as const,
  roundRobinCycles: 1,
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
    players:
      format === 'marioKart'
        ? seededPlayers.map((player) => ({
            ...player,
            marioKartEligibleFromCycle: 1,
            marioKartSkippedCycleNumbers: [],
          }))
        : seededPlayers,
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
