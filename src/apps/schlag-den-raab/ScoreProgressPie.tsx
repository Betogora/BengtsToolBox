import { useId } from 'react'

import {
  getScoreProgressChartData,
  type ScoreProgressSlice,
} from '@/apps/schlag-den-raab/scoreProgressChart'
import type {
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
} from '@/apps/schlag-den-raab/types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const chartCenter = 180
const chartRadius = 138
const labelRadius = 96
const minimumDirectLabelPoints = 4

function pointOnCircle(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180

  return {
    x: chartCenter + Math.cos(radians) * radius,
    y: chartCenter + Math.sin(radians) * radius,
  }
}

function getSlicePath(slice: ScoreProgressSlice) {
  const start = pointOnCircle(slice.startAngle, chartRadius)
  const end = pointOnCircle(slice.endAngle, chartRadius)
  const sweepFlag = slice.playerId === 'player-2' ? 1 : 0

  return [
    `M ${chartCenter} ${chartCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${chartRadius} ${chartRadius} 0 0 ${sweepFlag} ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

export function ScoreProgressPie({
  games,
  players,
}: {
  games: SchlagDenRaabGame[]
  players: SchlagDenRaabPlayer[]
}) {
  const { t } = useI18n()
  const titleId = useId()
  const descriptionId = useId()
  const headingId = useId()
  const chart = getScoreProgressChartData(games)
  const playerOne = players.find((player) => player.id === 'player-1')
  const playerTwo = players.find((player) => player.id === 'player-2')
  const playerOneGames = chart.gamesByPlayer['player-1']
    .map((game) => game.position)
    .join(', ')
  const playerTwoGames = chart.gamesByPlayer['player-2']
    .map((game) => game.position)
    .join(', ')
  const noGamesLabel = t('raab.progress.noGames')
  const description = t('raab.progress.ariaDescription', {
    playerOne: playerOne?.name ?? t('raab.playerFallback', { number: 1 }),
    playerOneGames: playerOneGames || noGamesLabel,
    playerOneScore: chart.totals['player-1'],
    playerTwo: playerTwo?.name ?? t('raab.playerFallback', { number: 2 }),
    playerTwoGames: playerTwoGames || noGamesLabel,
    playerTwoScore: chart.totals['player-2'],
  })

  return (
    <section className="raab-progress" aria-labelledby={headingId}>
      <h3 id={headingId} className="type-action text-center">
        {t('raab.progress.title')}
      </h3>

      <div className="raab-progress-chart-wrap">
        <svg
          aria-labelledby={`${titleId} ${descriptionId}`}
          className="raab-progress-chart"
          role="img"
          viewBox="0 36 360 288"
        >
          <title id={titleId}>{t('raab.progress.title')}</title>
          <desc id={descriptionId}>{description}</desc>

          <circle
            className="raab-progress-unclaimed"
            cx={chartCenter}
            cy={chartCenter}
            r={chartRadius}
          />

          {chart.slices.map((slice) => {
            const player = players.find(
              (entry) => entry.id === slice.playerId,
            )

            return (
              <path
                key={slice.game.id}
                className={cn(
                  'raab-progress-slice',
                  `raab-progress-slice-${slice.playerId}`,
                )}
                d={getSlicePath(slice)}
              >
                <title>
                  {t('raab.progress.sliceTitle', {
                    game: slice.game.title,
                    player:
                      player?.name ??
                      t('raab.playerFallback', {
                        number: slice.playerId === 'player-1' ? 1 : 2,
                      }),
                    points: slice.game.points,
                  })}
                </title>
              </path>
            )
          })}

          <line
            aria-hidden="true"
            className="raab-progress-axis raab-progress-axis-start"
            x1={chartCenter}
            x2={chartCenter}
            y1={chartCenter}
            y2={chartCenter - chartRadius}
          />
          <line
            aria-hidden="true"
            className="raab-progress-axis raab-progress-axis-threshold"
            x1={chartCenter}
            x2={chartCenter}
            y1={chartCenter}
            y2={chartCenter + chartRadius}
          />

          {chart.slices
            .filter((slice) => slice.game.points >= minimumDirectLabelPoints)
            .map((slice) => {
              const labelPosition = pointOnCircle(
                slice.labelAngle,
                labelRadius,
              )

              return (
                <text
                  key={`${slice.game.id}-label`}
                  aria-hidden="true"
                  className={cn(
                    'raab-progress-slice-label',
                    `raab-progress-slice-label-${slice.playerId}`,
                  )}
                  x={labelPosition.x}
                  y={labelPosition.y}
                >
                  {slice.game.position}
                </text>
              )
            })}

          <circle
            aria-hidden="true"
            className="raab-progress-start-marker"
            cx={chartCenter}
            cy={chartCenter - chartRadius}
            r="4"
          />
          <circle
            aria-hidden="true"
            className="raab-progress-threshold-marker"
            cx={chartCenter}
            cy={chartCenter + chartRadius}
            r="5"
          />
          <circle
            aria-hidden="true"
            className="raab-progress-outline"
            cx={chartCenter}
            cy={chartCenter}
            r={chartRadius}
          />
        </svg>
      </div>

      <div className="raab-progress-legends">
        {players.map((player) => {
          const wonGames = chart.gamesByPlayer[player.id]

          return (
            <div
              key={player.id}
              className={cn(
                'raab-progress-legend',
                `raab-progress-legend-${player.id}`,
              )}
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="raab-progress-color-dot"
                    />
                    <span className="type-action truncate">{player.name}</span>
                  </div>
                </div>
                <span className="raab-progress-score">
                  {chart.totals[player.id]}
                </span>
              </div>
              <div className="type-caption mt-3 text-muted-foreground">
                {t('raab.progress.wonGames')}
              </div>
              {wonGames.length > 0 ? (
                <ol className="mt-1.5 flex flex-wrap gap-1.5">
                  {wonGames.map((game) => (
                    <li
                      key={game.id}
                      className="raab-progress-game-chip"
                      title={game.title}
                    >
                      {game.position}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="type-ui mt-1.5 text-muted-foreground">
                  {noGamesLabel}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
