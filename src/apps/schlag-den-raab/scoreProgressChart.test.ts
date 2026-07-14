import { describe, expect, it } from 'vitest'

import {
  getScoreProgressChartData,
  regularGameTotalPoints,
  scoreProgressStartAngle,
} from '@/apps/schlag-den-raab/scoreProgressChart'
import type {
  SchlagDenRaabGame,
  SchlagDenRaabPlayerId,
} from '@/apps/schlag-den-raab/types'

function game(
  position: number,
  winnerId: SchlagDenRaabPlayerId | null,
): SchlagDenRaabGame {
  return {
    id: `game-${position}`,
    points: position,
    position,
    title: `Spiel ${position}`,
    winnerId,
  }
}

describe('Schlag den Raab score progress chart', () => {
  it('keeps an empty evening neutral', () => {
    const chart = getScoreProgressChartData([game(1, null), game(2, null)])

    expect(chart.slices).toEqual([])
    expect(chart.totals).toEqual({ 'player-1': 0, 'player-2': 0 })
  })

  it('uses each game value as its share of the fixed 120 point circle', () => {
    const chart = getScoreProgressChartData([game(15, 'player-1')])
    const slice = chart.slices[0]

    expect(regularGameTotalPoints).toBe(120)
    expect(slice?.startAngle).toBe(scoreProgressStartAngle)
    expect(slice?.endAngle).toBeCloseTo(-135)
    expect(Math.abs((slice?.endAngle ?? 0) - (slice?.startAngle ?? 0))).toBeCloseTo(
      (15 / 120) * 360,
    )
  })

  it('builds player one counterclockwise and player two clockwise from twelve o clock', () => {
    const chart = getScoreProgressChartData([
      game(15, 'player-1'),
      game(14, 'player-2'),
    ])
    const playerOneSlice = chart.slices.find(
      (slice) => slice.playerId === 'player-1',
    )
    const playerTwoSlice = chart.slices.find(
      (slice) => slice.playerId === 'player-2',
    )

    expect(playerOneSlice?.endAngle).toBeLessThan(scoreProgressStartAngle)
    expect(playerTwoSlice?.endAngle).toBeGreaterThan(scoreProgressStartAngle)
  })

  it('sorts won games by canonical position instead of entry order', () => {
    const chart = getScoreProgressChartData([
      game(8, 'player-1'),
      game(7, 'player-1'),
    ])
    const playerOneSlices = chart.slices.filter(
      (slice) => slice.playerId === 'player-1',
    )

    expect(playerOneSlices.map((slice) => slice.game.position)).toEqual([7, 8])
    expect(playerOneSlices[0]?.startAngle).toBe(-90)
    expect(playerOneSlices[1]?.startAngle).toBeCloseTo(-111)
    expect(chart.totals['player-1']).toBe(15)
  })

  it('ends at six o clock for 60 points and passes it above 60', () => {
    const sixtyPoints = [4, 5, 6, 7, 8, 9, 10, 11]
    const atThreshold = getScoreProgressChartData(
      sixtyPoints.map((position) => game(position, 'player-1')),
    )
    const aboveThreshold = getScoreProgressChartData([
      ...sixtyPoints.map((position) => game(position, 'player-1')),
      game(1, 'player-1'),
    ])

    expect(atThreshold.totals['player-1']).toBe(60)
    expect(atThreshold.slices.at(-1)?.endAngle).toBeCloseTo(-270)
    expect(aboveThreshold.slices.at(-1)?.endAngle).toBeLessThan(-270)
  })

  it('fills the regular circle at 60 to 60 and ignores game 16', () => {
    const playerOnePositions = new Set([4, 5, 6, 7, 8, 9, 10, 11])
    const chart = getScoreProgressChartData([
      ...Array.from({ length: 15 }, (_, index) => {
        const position = index + 1
        return game(
          position,
          playerOnePositions.has(position) ? 'player-1' : 'player-2',
        )
      }),
      game(16, 'player-2'),
    ])

    expect(chart.totals).toEqual({ 'player-1': 60, 'player-2': 60 })
    expect(chart.slices).toHaveLength(15)
    expect(chart.slices.some((slice) => slice.game.position === 16)).toBe(false)
    expect(chart.slices.filter((slice) => slice.playerId === 'player-2').at(-1)?.endAngle)
      .toBeCloseTo(90)
  })
})
