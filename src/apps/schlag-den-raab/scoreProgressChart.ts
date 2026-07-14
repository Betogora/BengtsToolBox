import type {
  SchlagDenRaabGame,
  SchlagDenRaabPlayerId,
} from '@/apps/schlag-den-raab/types'

export const regularGameTotalPoints = 120
export const scoreProgressStartAngle = -90

export type ScoreProgressSlice = {
  endAngle: number
  game: SchlagDenRaabGame
  labelAngle: number
  playerId: SchlagDenRaabPlayerId
  startAngle: number
}

export type ScoreProgressChartData = {
  gamesByPlayer: Record<SchlagDenRaabPlayerId, SchlagDenRaabGame[]>
  slices: ScoreProgressSlice[]
  totals: Record<SchlagDenRaabPlayerId, number>
}

const playerDirections: Record<SchlagDenRaabPlayerId, -1 | 1> = {
  'player-1': -1,
  'player-2': 1,
}

function isRegularWonGame(game: SchlagDenRaabGame) {
  return game.position >= 1 && game.position <= 15 && game.winnerId !== null
}

export function getScoreProgressChartData(
  games: SchlagDenRaabGame[],
): ScoreProgressChartData {
  const gamesByPlayer: Record<
    SchlagDenRaabPlayerId,
    SchlagDenRaabGame[]
  > = {
    'player-1': [],
    'player-2': [],
  }

  games.filter(isRegularWonGame).forEach((game) => {
    gamesByPlayer[game.winnerId!].push(game)
  })

  const totals: Record<SchlagDenRaabPlayerId, number> = {
    'player-1': 0,
    'player-2': 0,
  }
  const slices: ScoreProgressSlice[] = []

  ;(['player-1', 'player-2'] as const).forEach((playerId) => {
    const direction = playerDirections[playerId]

    gamesByPlayer[playerId].sort((left, right) => left.position - right.position)
    gamesByPlayer[playerId].forEach((game) => {
      const startAngle =
        scoreProgressStartAngle +
        direction * (totals[playerId] / regularGameTotalPoints) * 360

      totals[playerId] += game.points

      const endAngle =
        scoreProgressStartAngle +
        direction * (totals[playerId] / regularGameTotalPoints) * 360

      slices.push({
        endAngle,
        game,
        labelAngle: (startAngle + endAngle) / 2,
        playerId,
        startAngle,
      })
    })
  })

  return {
    gamesByPlayer,
    slices,
    totals,
  }
}
