import { useId, useState } from 'react'

import {
  getScoreProgressChartData,
  type ScoreProgressSlice,
} from '@/apps/schlag-den-raab/scoreProgressChart'
import type {
  SchlagDenRaabGame,
  SchlagDenRaabPlayer,
} from '@/apps/schlag-den-raab/types'
import { Tooltip } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const chartCenter = 180
const chartRadius = 138
const labelRadius = 96
const minimumDirectLabelPoints = 4

// Farben der Tortenstücke, als Farbpunkt im Tooltip.
const sliceColor = {
  'player-1': 'var(--brand-primary)',
  'player-2': 'var(--brand-accent)',
} as const

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
  const [activeGameId, setActiveGameId] = useState<string | null>(null)
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
            const active = activeGameId === slice.game.id
            // Der Tooltip zeigt auf die Mitte des Stücks, nicht auf den Rand seines Rahmens.
            const anchor = pointOnCircle(slice.labelAngle, labelRadius)

            return (
              <g key={slice.game.id}>
                <path
                  className={cn(
                    'raab-progress-slice transition-opacity',
                    `raab-progress-slice-${slice.playerId}`,
                    active && 'opacity-85',
                  )}
                  d={getSlicePath(slice)}
                  data-game={slice.game.position}
                  onPointerEnter={() => setActiveGameId(slice.game.id)}
                  onPointerLeave={() =>
                    setActiveGameId((current) =>
                      current === slice.game.id ? null : current,
                    )
                  }
                />
                <Tooltip
                  open={active}
                  swatch={sliceColor[slice.playerId]}
                  title={slice.game.title}
                  description={t('raab.progress.sliceDetail', {
                    player:
                      player?.name ??
                      t('raab.playerFallback', {
                        number: slice.playerId === 'player-1' ? 1 : 2,
                      }),
                    points: slice.game.points,
                    position: slice.game.position,
                  })}
                >
                  <circle
                    aria-hidden="true"
                    className="pointer-events-none"
                    cx={anchor.x}
                    cy={anchor.y}
                    fill="transparent"
                    r="1"
                  />
                </Tooltip>
              </g>
            )
          })}

          <line
            aria-hidden="true"
            className="raab-progress-axis raab-progress-axis-start pointer-events-none"
            x1={chartCenter}
            x2={chartCenter}
            y1={chartCenter}
            y2={chartCenter - chartRadius}
          />
          <line
            aria-hidden="true"
            className="raab-progress-axis raab-progress-axis-threshold pointer-events-none"
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
                    'raab-progress-slice-label pointer-events-none',
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
            className="raab-progress-start-marker pointer-events-none"
            cx={chartCenter}
            cy={chartCenter - chartRadius}
            r="4"
          />
          <circle
            aria-hidden="true"
            className="raab-progress-threshold-marker pointer-events-none"
            cx={chartCenter}
            cy={chartCenter + chartRadius}
            r="5"
          />
          <circle
            aria-hidden="true"
            className="raab-progress-outline pointer-events-none"
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
                    <Tooltip
                      key={game.id}
                      title={game.title}
                      description={t('raab.progress.chipDetail', {
                        points: game.points,
                        position: game.position,
                      })}
                    >
                      <li className="raab-progress-game-chip cursor-default">
                        {game.position}
                        <span className="sr-only">: {game.title}</span>
                      </li>
                    </Tooltip>
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
