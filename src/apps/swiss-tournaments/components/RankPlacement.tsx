import { useId } from 'react'

import {
  marioKartRankGradients,
  ordinalSuffix,
} from '@/apps/swiss-tournaments/components/tournamentUiPresentation'
import { cn } from '@/lib/utils'

export function RankPlacement({
  className,
  isMarioKart,
  rank,
}: {
  className?: string
  isMarioKart: boolean
  rank: number
}) {
  const gradientId = `mario-kart-rank-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const shadowId = `mario-kart-rank-shadow-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  if (!isMarioKart || !Number.isInteger(rank) || rank < 1) {
    return <>{rank}</>
  }

  const rankText = String(rank)
  const rankDigitCount = rankText.length
  const gradientStops = marioKartRankGradients[rank] ?? marioKartRankGradients.default
  const isCompactRank = rankDigitCount <= 2
  const viewBoxWidth = rankDigitCount === 1 ? 86 : rankDigitCount === 2 ? 96 : 116
  const numberFontSize = isCompactRank ? (rankDigitCount === 1 ? 45 : 40) : 34
  const suffixFontSize = isCompactRank ? (rankDigitCount === 1 ? 17 : 14) : 12
  const letterSpacing = rankDigitCount === 1 ? -3 : -4

  return (
    <span
      aria-label={String(rank)}
      className={cn('inline-flex h-[30px] w-16 max-w-full items-center align-middle', className)}
    >
      <span className="sr-only">{rank}</span>
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${viewBoxWidth} 46`}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="8"
            x2={viewBoxWidth - 8}
            y1="2"
            y2="45"
            gradientUnits="userSpaceOnUse"
          >
            {gradientStops.map((color, index) => (
              <stop
                key={color}
                offset={index === 0 ? '0' : index === 1 ? '0.48' : index === 2 ? '0.72' : '1'}
                stopColor={color}
              />
            ))}
          </linearGradient>
          <filter id={shadowId} x="-20%" y="-30%" width="140%" height="160%">
            <feDropShadow
              dx="2"
              dy="2"
              floodColor="#1b2228"
              floodOpacity="0.58"
              stdDeviation="1.1"
            />
          </filter>
        </defs>
        <g filter={`url(#${shadowId})`} transform="translate(3 0) skewX(-8)">
          <text
            dominantBaseline="alphabetic"
            fill={`url(#${gradientId})`}
            fontFamily="Arial Black, Impact, sans-serif"
            fontWeight="900"
            paintOrder="stroke"
            stroke="#26313a"
            strokeLinejoin="round"
            strokeWidth={rankDigitCount === 1 ? 5 : 4.5}
            x={rankDigitCount === 1 ? 6 : 4}
            y={rankDigitCount === 1 ? 40 : 39}
          >
            <tspan
              fontSize={numberFontSize}
              letterSpacing={letterSpacing}
            >
              {rankText}
            </tspan>
            <tspan
              dx="3"
              dy="-1"
              fontSize={suffixFontSize}
              letterSpacing="-1"
              strokeWidth={rankDigitCount === 1 ? 3.5 : 3}
            >
              {ordinalSuffix(rank)}
            </tspan>
          </text>
        </g>
      </svg>
    </span>
  )
}
