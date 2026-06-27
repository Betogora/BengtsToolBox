import type { CSSProperties } from 'react'
import { useMemo } from 'react'

import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'
import { getEntryDisplayText } from '@/apps/decision-wheel/utils'
import {
  canRenderWheelLabel,
  createSegmentPath,
  getSegmentLabelWidth,
  getSegments,
  getSegmentSize,
  getWheelLabelFontSize,
  labelRadiusFactor,
  shortenWheelLabelToWidth,
  spinDurationMs,
  wheelCenter,
  wheelRadius,
  wheelSize,
} from '@/apps/decision-wheel/wheel'
import { getReadableTextColor } from '@/lib/theme'

type WheelGraphicProps = {
  entries: DecisionWheelEntry[]
  rotation: number
  isSpinning: boolean
}

export function WheelGraphic({
  entries,
  rotation,
  isSpinning,
}: WheelGraphicProps) {
  const segments = useMemo(() => getSegments(entries), [entries])
  const labelFontSize = useMemo(
    () => getWheelLabelFontSize(segments),
    [segments],
  )

  if (entries.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-full border border-dashed bg-secondary text-center text-sm text-muted-foreground sm:max-w-[30rem]">
        Keine Optionen im Rad.
      </div>
    )
  }

  return (
    <div className="relative mx-auto aspect-square w-full sm:max-w-[30rem]">
      <div
        className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[26px] border-x-transparent border-t-foreground"
        aria-hidden="true"
      />
      <svg
        viewBox={`0 0 ${wheelSize} ${wheelSize}`}
        className="size-full drop-shadow-sm"
        role="img"
        aria-label="Glücksrad"
        style={
          {
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.72, 0.18, 1)`
              : 'none',
          } as CSSProperties
        }
      >
        <circle cx={wheelCenter} cy={wheelCenter} r={wheelRadius + 5} fill="#ffffff" />
        {segments.map((segment, index) => {
          const segmentSize = getSegmentSize(segment)
          const availableLabelWidth = getSegmentLabelWidth(segment)
          const labelText = canRenderWheelLabel(segment, availableLabelWidth)
            ? shortenWheelLabelToWidth(
                getEntryDisplayText(segment, index),
                availableLabelWidth,
                labelFontSize,
              )
            : ''
          const labelPosition = {
            x:
              wheelCenter +
              wheelRadius *
                labelRadiusFactor *
                Math.cos(((segment.midAngle - 90) * Math.PI) / 180),
            y:
              wheelCenter +
              wheelRadius *
                labelRadiusFactor *
                Math.sin(((segment.midAngle - 90) * Math.PI) / 180),
          }
          const labelTextColor = getReadableTextColor(segment.color)
          const labelStrokeProps =
            labelTextColor === '#FFFFFF'
              ? {
                  paintOrder: 'stroke',
                  stroke: 'rgba(54, 50, 55, 0.38)',
                  strokeWidth: 2,
                }
              : {}

          return (
            <g key={segment.id}>
              {segmentSize >= 359.99 ? (
                <circle
                  cx={wheelCenter}
                  cy={wheelCenter}
                  r={wheelRadius}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ) : (
                <path
                  d={createSegmentPath(segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
              {labelText && (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={labelTextColor}
                  fontSize={labelFontSize}
                  fontWeight="700"
                  transform={`rotate(${segment.midAngle}, ${labelPosition.x}, ${labelPosition.y})`}
                  {...labelStrokeProps}
                >
                  {labelText}
                </text>
              )}
            </g>
          )
        })}
        <circle cx={wheelCenter} cy={wheelCenter} r="24" fill="#ffffff" />
        <circle cx={wheelCenter} cy={wheelCenter} r="13" fill="var(--foreground)" />
      </svg>
    </div>
  )
}
