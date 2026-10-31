import { useMemo } from 'react'
import { encode } from 'uqr'

import { cn } from '@/lib/utils'

const border = 2
const finderSize = 7
const ink = '#1b2d3b'

type QrCodeProps = {
  className?: string
  label: string
  value: string
}

// Punktraster mit abgerundeten Positionsmarken, damit der Code weich statt kantig wirkt.
export function QrCode({ className, label, value }: QrCodeProps) {
  const { dots, finders, size } = useMemo(() => {
    const qr = encode(value, { ecc: 'M', border })
    const far = qr.size - border - finderSize
    const finderOrigins = [
      [border, border],
      [far, border],
      [border, far],
    ] as const
    const isInFinder = (x: number, y: number) =>
      finderOrigins.some(
        ([fx, fy]) => x >= fx && x < fx + finderSize && y >= fy && y < fy + finderSize,
      )
    const dotPositions: string[] = []

    qr.data.forEach((row, y) => {
      row.forEach((isDark, x) => {
        // Ein Pfad mit zwei Halbkreisen je Punkt hält das SVG auch bei langen URLs schlank.
        if (isDark && !isInFinder(x, y)) dotPositions.push(`M${x + 0.06} ${y + 0.5}a.44.44 0 1 0 .88 0a.44.44 0 1 0-.88 0`)
      })
    })

    return { dots: dotPositions.join(''), finders: finderOrigins, size: qr.size }
  }, [value])

  return (
    <svg
      role="img"
      aria-label={label}
      className={cn('block aspect-square', className)}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill="#ffffff" />
      <path d={dots} fill={ink} />
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x + 0.5} y={y + 0.5} width="6" height="6" rx="2" fill="none" stroke={ink} />
          <circle cx={x + 3.5} cy={y + 3.5} r="1.5" fill={ink} />
        </g>
      ))}
    </svg>
  )
}
