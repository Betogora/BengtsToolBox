import { useEffect, useMemo, useRef, useState } from 'react'

import { useI18n } from '@/lib/i18n'
import { evenlySpacedTimestamps, maxTicksForWidth } from './chartTicks'
import type { PerformancePlot, SelectedPoint } from './chartTypes'

export function formatClock(value: number) {
  const rounded = Math.max(0, Math.round(value))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60
  return hours > 0
    ? `${hours}:${`${minutes}`.padStart(2, '0')}:${`${seconds}`.padStart(2, '0')}`
    : `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

export function disciplineKey(value: unknown) {
  const normalized = String(value).replace(/Hours|Kilometers/, '')
  if (normalized === 'swim') return 'triathlon.discipline.swim' as const
  if (normalized === 'bike') return 'triathlon.discipline.bike' as const
  if (normalized === 'strength') return 'triathlon.discipline.strength' as const
  return 'triathlon.discipline.run' as const
}

// Gleiche Fläche und Schrift wie der Toolbox-Tooltip (.btb-tooltip in globals.css).
export const tooltipContentStyle = {
  background: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--popover-foreground)',
  maxWidth: 'min(320px, calc(100vw - 32px))',
  padding: '8px 11px 9px',
  fontSize: 12,
  lineHeight: '16px',
  whiteSpace: 'normal' as const,
  boxShadow: 'var(--btb-shadow-overlay)',
}

export const tooltipLabelStyle = {
  fontWeight: 650,
  marginBottom: 2,
}

export const tooltipItemStyle = {
  color: 'var(--popover-foreground)',
  fontWeight: 500,
  padding: 0,
  whiteSpace: 'normal' as const,
}

/** Dotted horizontal guides only, like a printed chart. */
export const gridProps = {
  stroke: 'var(--border-strong, var(--border))',
  strokeDasharray: '1 5',
  strokeLinecap: 'round' as const,
  vertical: false,
}
export const tickStyle = { fill: 'var(--muted-foreground)', fontSize: 11 }
/** Lighter sport tints mark measured history and secondary series. */
export const activityOpacity = 0.45
export const secondaryOpacity = 0.55
export const dimmedOpacity = 0.25
const halfDayMs = 43_200_000
const dayMs = 2 * halfDayMs

export function canHover() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(hover: hover)').matches === true
  )
}

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(Math.round(element.getBoundingClientRect().width))
    // Deferring the update to the next frame avoids ResizeObserver loop errors
    // when the re-rendered tick labels change the observed layout again.
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() =>
        setWidth(Math.round(entry.contentRect.width)),
      )
    })
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])
  return [ref, width] as const
}

/** Direct series label at the end of a line instead of a legend box. */
export function endLabel(lastIndex: number, text: string, color: string, opacity = 1) {
  return function EndLabel(props: { x?: number | string; y?: number | string; index?: number }) {
    const x = Number(props.x)
    const y = Number(props.y)
    if (props.index !== lastIndex || !Number.isFinite(x) || !Number.isFinite(y)) {
      return <g key={`end-${props.index}`} />
    }
    return (
      <text
        key={`end-${props.index}`}
        x={x + 8}
        y={y}
        dy="0.35em"
        fill={color}
        fillOpacity={opacity}
        fontSize={11}
        fontWeight={600}
      >
        {text}
      </text>
    )
  }
}

export function lastIndexWhere<T>(items: readonly T[], predicate: (item: T) => boolean) {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index])) return index
  }
  return -1
}

export function useValueFormatters(plot: Pick<PerformancePlot, 'id' | 'modelUnit' | 'unit'>) {
  const { formatNumber } = useI18n()
  const isPace = plot.id !== 'bike'
  const unitLabel = isPace
    ? plot.id === 'swim'
      ? '100 m'
      : 'km'
    : plot.unit === 'watts'
      ? 'W'
      : 'km/h'
  const axisValue = (value: number) =>
    isPace
      ? formatClock(value)
      : formatNumber(value, {
          maximumFractionDigits: plot.unit === 'watts' ? 0 : 1,
        })
  const valueWithUnit = (value: number) =>
    isPace ? `${formatClock(value)} /${unitLabel}` : `${axisValue(value)} ${unitLabel}`
  const modelValue = (value: number) =>
    plot.modelUnit === 'seconds'
      ? formatClock(value)
      : `${formatNumber(value, { maximumFractionDigits: 0 })} W`
  const difference = (value: number, reference: number) => {
    const change = value - reference
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±'
    return `${sign}${valueWithUnit(Math.abs(change))}`
  }
  const delta = (value: number, reference: number) => {
    const change = value - reference
    const sign = change > 0 ? '+' : change < 0 ? '−' : '±'
    const percent = formatNumber(Math.abs((value / reference - 1) * 100), {
      maximumFractionDigits: 1,
    })
    return `${difference(value, reference)} (${sign}${percent} %)`
  }
  return { isPace, unitLabel, axisValue, valueWithUnit, modelValue, difference, delta }
}

/**
 * Pin and hover state plus the padded date axis of a scatter card. The axis
 * only follows the plotted span and the canvas width, not the hover state.
 */
export function usePinnedTimeAxis(span: readonly [number, number] | null) {
  const [pinned, setPinned] = useState<SelectedPoint | null>(null)
  const [hovered, setHovered] = useState<SelectedPoint | null>(null)
  const [canvasRef, width] = useElementWidth<HTMLDivElement>()
  const start = span?.[0] ?? null
  const end = span?.[1] ?? null
  // An empty plot spans the last four weeks so its date axis stays readable.
  const emptyEndDate = new Date().toISOString().slice(0, 10)
  const axis = useMemo(() => {
    const emptyEnd = Date.parse(`${emptyEndDate}T12:00:00Z`)
    const startTimestamp = start ?? emptyEnd - 27 * dayMs
    const endTimestamp = end ?? emptyEnd
    return {
      domain: [startTimestamp - halfDayMs, endTimestamp + halfDayMs] as [
        number,
        number,
      ],
      ticks: evenlySpacedTimestamps(
        startTimestamp,
        endTimestamp,
        Math.min(5, maxTicksForWidth(width - 60, 84)),
      ),
    }
  }, [emptyEndDate, end, start, width])
  const togglePin = (point: SelectedPoint) =>
    setPinned((current) => (current?.key === point.key ? null : point))
  return {
    pinned,
    setPinned,
    hovered,
    setHovered,
    togglePin,
    canvasRef,
    ...axis,
  }
}
