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
import { useI18n } from '@/lib/i18n'
import { getReadableTextColor } from '@/lib/theme'

type WheelGraphicProps = {
  entries: DecisionWheelEntry[]
  highlightedEntryId?: string | null
  rotation: number
  isSpinning: boolean
}

export function WheelGraphic({
  entries,
  highlightedEntryId = null,
  rotation,
  isSpinning,
}: WheelGraphicProps) {
  const { t } = useI18n()
  const segments = useMemo(() => getSegments(entries), [entries])
  const labelFontSize = useMemo(
    () => getWheelLabelFontSize(segments),
    [segments],
  )
  const hasHighlightedSegment =
    highlightedEntryId !== null &&
    segments.some((segment) => segment.id === highlightedEntryId)

  if (entries.length === 0) {
    return (
      <div className="type-ui flex aspect-square w-full items-center justify-center rounded-full border border-dashed bg-secondary text-center text-muted-foreground sm:max-w-[30rem]">
        {t('decisionWheel.wheel.empty')}
      </div>
    )
  }

  return (
    <div className="relative mx-auto aspect-square w-full sm:max-w-[30rem]">
      <div
        className="pointer-events-none absolute inset-[3%] rounded-full shadow-[0_18px_44px_rgba(1,26,39,0.16)]"
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 64 82"
        className="absolute left-1/2 top-0 z-10 h-[18%] min-h-16 w-[14%] min-w-14 -translate-x-1/2 -translate-y-1 drop-shadow-sm"
        aria-hidden="true"
      >
        <path
          d="M15 5H49L38 61C36.7 68 34.5 72 32 72C29.5 72 27.3 68 26 61L15 5Z"
          fill="#ff8175"
          stroke="#ffffff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="8"
        />
      </svg>
      <svg
        viewBox={`0 0 ${wheelSize} ${wheelSize}`}
        className="relative z-[1] size-full"
        role="img"
        aria-label={t('decisionWheel.wheel.label')}
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
          const isHighlighted =
            hasHighlightedSegment && segment.id === highlightedEntryId
          const isDimmed = hasHighlightedSegment && !isHighlighted
          const labelText = canRenderWheelLabel(segment, availableLabelWidth)
            ? shortenWheelLabelToWidth(
                getEntryDisplayText(segment, index, (number) =>
                  t('decisionWheel.fallbackOption', { number }),
                ),
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
          const segmentStrokeWidth = isHighlighted ? '4' : '2'
          const labelStrokeProps =
            labelTextColor === '#FFFFFF'
              ? {
                  paintOrder: 'stroke',
                  stroke: 'rgba(54, 50, 55, 0.38)',
                  strokeWidth: 2,
                }
              : {}

          return (
            <g
              key={segment.id}
              opacity={isDimmed ? 0.34 : 1}
              style={{
                filter: isHighlighted
                  ? 'drop-shadow(0 2px 4px rgb(1 26 39 / 0.18))'
                  : undefined,
                transition: 'opacity 180ms ease, filter 180ms ease',
              }}
            >
              {segmentSize >= 359.99 ? (
                <>
                  <circle
                    cx={wheelCenter}
                    cy={wheelCenter}
                    r={wheelRadius}
                    fill={segment.color}
                    stroke="#ffffff"
                    strokeWidth={segmentStrokeWidth}
                  />
                  {isHighlighted && (
                    <circle
                      cx={wheelCenter}
                      cy={wheelCenter}
                      r={wheelRadius - 1}
                      fill="none"
                      pointerEvents="none"
                      stroke="var(--foreground)"
                      strokeOpacity="0.24"
                      strokeWidth="2"
                    />
                  )}
                </>
              ) : (
                <>
                  <path
                    d={createSegmentPath(segment.startAngle, segment.endAngle)}
                    fill={segment.color}
                    stroke="#ffffff"
                    strokeWidth={segmentStrokeWidth}
                  />
                  {isHighlighted && (
                    <path
                      d={createSegmentPath(segment.startAngle, segment.endAngle)}
                      fill="none"
                      pointerEvents="none"
                      stroke="var(--foreground)"
                      strokeOpacity="0.24"
                      strokeWidth="2"
                    />
                  )}
                </>
              )}
              {labelText && (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={labelTextColor}
                  fontFamily="var(--btb-font-sans)"
                  fontSize={labelFontSize}
                  fontWeight="650"
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
