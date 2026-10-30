import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n'
import { canHover } from './chartUtils'

export function LegendDot({
  color,
  opacity = 1,
  hollow = false,
}: {
  color: string
  opacity?: number
  hollow?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className="size-2 shrink-0 rounded-full"
      style={
        hollow
          ? { border: `1.5px solid ${color}` }
          : { background: color, opacity }
      }
    />
  )
}

export function LegendLine({ color, dash, opacity = 1 }: { color: string; dash: string; opacity?: number }) {
  return (
    <svg aria-hidden="true" className="h-2 w-5 shrink-0" viewBox="0 0 20 8">
      <line x1="0" x2="20" y1="4" y2="4" stroke={color} strokeDasharray={dash} strokeOpacity={opacity} strokeWidth="2" />
    </svg>
  )
}

/** Value badge drawn onto an axis where a crosshair line meets it. */
export function AxisBadge({
  viewBox,
  axis,
  text,
  fill,
  textColor = '#fff',
}: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number }
  axis: 'x' | 'y'
  text: string
  fill: string
  textColor?: string
}) {
  if (!viewBox || viewBox.x === undefined || viewBox.y === undefined) {
    return null
  }
  const width = text.length * 6.6 + 12
  const height = 18
  const x =
    axis === 'y' ? viewBox.x - width - 4 : viewBox.x - width / 2
  const y =
    axis === 'y'
      ? viewBox.y - height / 2
      : viewBox.y + (viewBox.height ?? 0) + 4
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={width} height={height} rx={4} fill={fill} />
      <text
        x={x + width / 2}
        y={y + height / 2}
        dy="0.35em"
        fill={textColor}
        fontSize={11}
        fontWeight={600}
        textAnchor="middle"
      >
        {text}
      </text>
    </g>
  )
}

/** Data point with a generous invisible hit area for touch. */
export function ClickablePoint({
  cx,
  cy,
  color,
  radius,
  filled,
  opacity,
  pinned,
  onSelect,
  onHoverChange,
}: {
  cx: number
  cy: number
  color: string
  radius: number
  filled: boolean
  opacity: number
  pinned: boolean
  onSelect: () => void
  onHoverChange: (hovered: boolean) => void
}) {
  return (
    <g
      className="cursor-pointer"
      data-chart-point
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onMouseEnter={() => {
        if (canHover()) onHoverChange(true)
      }}
      onMouseLeave={() => onHoverChange(false)}
    >
      <circle cx={cx} cy={cy} r={11} fill="transparent" />
      {pinned && (
        <circle cx={cx} cy={cy} r={radius + 5} fill={color} fillOpacity={0.2} />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={pinned ? radius + 1.5 : radius}
        fill={filled || pinned ? color : 'var(--card)'}
        fillOpacity={filled && !pinned ? opacity : 1}
        stroke={color}
        strokeOpacity={pinned ? 1 : Math.min(1, opacity * 2)}
        strokeWidth={filled && !pinned ? 0 : 2}
      />
    </g>
  )
}

export function PointDetail({
  color,
  children,
  onClose,
}: {
  color?: string
  children: ReactNode
  onClose?: () => void
}) {
  const { t } = useI18n()
  return (
    <div
      className="tri-point-detail mt-2 flex min-h-11 items-center gap-3 rounded-md border bg-muted/40 py-1.5 pl-3 pr-1.5"
      data-point-detail
    >
      {color && <LegendDot color={color} />}
      <div className="type-caption flex min-w-0 flex-1 flex-wrap items-baseline gap-x-4 gap-y-0.5 tabular-nums">
        {children}
      </div>
      {onClose && (
        <Button
          aria-label={t('triathlon.charts.unpin')}
          className="size-8 shrink-0 text-muted-foreground"
          size="icon"
          variant="ghost"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </Button>
      )}
    </div>
  )
}

export function DetailItem({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
      {label && <span className="inline-flex items-baseline text-muted-foreground">{label}</span>}
      <span className="font-semibold text-foreground">{children}</span>
    </span>
  )
}
