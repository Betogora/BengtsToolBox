import type { CSSProperties } from 'react'

import {
  coinFlipDurationMs,
  getCoinFaceRotation,
} from '@/apps/coinflip/coin'
import { getCoinflipLabelKey } from '@/apps/coinflip/hooks/useCoinflip'
import type { CoinflipSide } from '@/apps/coinflip/types'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

type CoinGraphicProps = {
  className?: string
  isFlipping: boolean
  rotation: number
  side: CoinflipSide | null
}

type CoinFaceProps = {
  side: CoinflipSide
  style?: CSSProperties
}

const coinInk = '#06344f'
const coinRim = '#b9791e'
const coinOuter = '#d99b2c'
const coinInner = '#f2bd4d'

const faceBaseStyle: CSSProperties = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
}

function BrandenburgGateMark() {
  return (
    <g
      fill={coinInk}
      transform="translate(120 120) scale(0.82) translate(-120 -135)"
    >
      <path d="M92 82H148L154 92H86L92 82Z" opacity="0.82" />
      <circle cx="101" cy="94" r="4" />
      <circle cx="139" cy="94" r="4" />
      <rect x="104" y="89" width="32" height="8" rx="2" />
      <path d="M66 100H174L184 116H56L66 100Z" />
      <rect x="62" y="118" width="116" height="9" rx="2" />
      <rect x="68" y="130" width="12" height="37" rx="3" />
      <rect x="88" y="130" width="12" height="37" rx="3" />
      <rect x="108" y="130" width="12" height="37" rx="3" />
      <rect x="128" y="130" width="12" height="37" rx="3" />
      <rect x="148" y="130" width="12" height="37" rx="3" />
      <rect x="168" y="130" width="12" height="37" rx="3" />
      <rect x="58" y="168" width="124" height="9" rx="3" />
      <rect x="48" y="180" width="144" height="8" rx="3" opacity="0.86" />
    </g>
  )
}

function EuroMark() {
  return (
    <g fill={coinInk}>
      <text
        x="120"
        y="124"
        fontFamily="var(--btb-font-sans)"
        fontSize="82"
        fontWeight="750"
        letterSpacing="0"
        dominantBaseline="middle"
        textAnchor="middle"
      >
        1€
      </text>
    </g>
  )
}

function CoinFace({ side, style }: CoinFaceProps) {
  const isHeads = side === 'heads'

  return (
    <svg
      viewBox="0 0 240 240"
      className="absolute inset-0 size-full"
      aria-hidden="true"
      style={{ ...faceBaseStyle, ...style }}
    >
      <circle cx="120" cy="120" r="108" fill={coinRim} />
      <circle cx="120" cy="120" r="99" fill={coinOuter} />
      <circle
        cx="120"
        cy="120"
        r="84"
        fill={coinInner}
        stroke={coinRim}
        strokeWidth="4"
      />
      <circle
        cx="120"
        cy="120"
        r="77"
        fill="none"
        stroke={coinOuter}
        strokeDasharray="2 9"
        strokeLinecap="round"
        strokeWidth="5"
      />

      {isHeads ? <BrandenburgGateMark /> : <EuroMark />}
    </svg>
  )
}

export function CoinGraphic({
  className,
  isFlipping,
  rotation,
  side,
}: CoinGraphicProps) {
  const { t } = useI18n()
  const settledSide = side ?? 'heads'
  const accessibleState = isFlipping
    ? t('coinflip.graphic.flipping')
    : side
      ? t('coinflip.graphic.showing', {
          side: t(getCoinflipLabelKey(settledSide)),
        })
      : t('coinflip.graphic.ready')

  return (
    <div
      className={cn(
        'relative mx-auto aspect-square w-full max-w-[18rem]',
        className,
      )}
      role="img"
      aria-label={accessibleState}
    >
      <div
        className="absolute inset-[10%] rounded-full shadow-[0_24px_52px_rgba(6,52,79,0.18)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0"
        style={{ perspective: '900px' }}
        aria-hidden="true"
      >
        <div
          className="relative size-full"
          style={{
            transform: `rotateY(${rotation}deg)`,
            transformStyle: 'preserve-3d',
            transition: isFlipping
              ? `transform ${coinFlipDurationMs}ms cubic-bezier(0.14, 0.7, 0.18, 1)`
              : 'none',
          }}
        >
          <CoinFace side="heads" />
          <CoinFace
            side="tails"
            style={{ transform: `rotateY(${getCoinFaceRotation('tails')}deg)` }}
          />
        </div>
      </div>
    </div>
  )
}
