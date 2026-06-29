import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'
import { getEntryDisplayText } from '@/apps/decision-wheel/utils'

export type WheelSegment = DecisionWheelEntry & {
  startAngle: number
  endAngle: number
  midAngle: number
}

export const wheelSize = 260
export const wheelCenter = wheelSize / 2
export const wheelRadius = 118
export const labelRadiusFactor = 0.58
export const spinDurationMs = 4400
export const spinSettleDelayMs = spinDurationMs + 150
export const spinFullRotationDegrees = 1800

const labelMinFontSize = 7
const labelMaxFontSize = 16
const labelFontSizeStep = 0.5
const labelPadding = 8
const labelMinSegmentAngle = 16
const labelEllipsis = '...'
const wheelLabelFontFamily =
  'Manrope Variable, Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
const wheelLabelFontWeight = 650

let wheelLabelMeasureContext: CanvasRenderingContext2D | null | undefined

export function normalizeRotation(value: number) {
  return ((value % 360) + 360) % 360
}

function polarToCartesian(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: wheelCenter + wheelRadius * Math.cos(radians),
    y: wheelCenter + wheelRadius * Math.sin(radians),
  }
}

export function createSegmentPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${wheelCenter} ${wheelCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${wheelRadius} ${wheelRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

export function getSegments(entries: DecisionWheelEntry[]): WheelSegment[] {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let currentAngle = 0

  if (totalWeight <= 0) {
    return []
  }

  return entries.map((entry) => {
    const size = (entry.weight / totalWeight) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + size

    currentAngle = endAngle

    return {
      ...entry,
      startAngle,
      endAngle,
      midAngle: startAngle + size / 2,
    }
  })
}

export function getSegmentSize(segment: WheelSegment) {
  return segment.endAngle - segment.startAngle
}

export function getSegmentLabelWidth(segment: WheelSegment) {
  const labelRadius = wheelRadius * labelRadiusFactor
  const segmentSize = Math.max(0, Math.min(360, getSegmentSize(segment)))
  const wheelBoundaryWidth =
    2 * Math.sqrt(Math.max(0, wheelRadius ** 2 - labelRadius ** 2))
  const segmentChordWidth =
    segmentSize >= 180
      ? wheelBoundaryWidth
      : 2 * labelRadius * Math.sin((segmentSize * Math.PI) / 360)

  return Math.max(0, Math.min(wheelBoundaryWidth, segmentChordWidth) - labelPadding)
}

function getWheelLabelMeasureContext() {
  if (wheelLabelMeasureContext !== undefined) {
    return wheelLabelMeasureContext
  }

  if (typeof document === 'undefined') {
    wheelLabelMeasureContext = null
    return wheelLabelMeasureContext
  }

  wheelLabelMeasureContext = document.createElement('canvas').getContext('2d')

  return wheelLabelMeasureContext
}

function estimateWheelLabelWidth(value: string, fontSize: number) {
  return Array.from(value).reduce((width, character) => {
    if (character === ' ') {
      return width + fontSize * 0.35
    }

    if (/^[.,'|!ijlI]$/.test(character)) {
      return width + fontSize * 0.32
    }

    if (/^[mwMW@#%&]$/.test(character)) {
      return width + fontSize * 0.9
    }

    if (/^[A-Z0-9]$/.test(character)) {
      return width + fontSize * 0.64
    }

    return width + fontSize * 0.56
  }, 0)
}

function measureWheelLabel(value: string, fontSize: number) {
  const context = getWheelLabelMeasureContext()

  if (!context) {
    return estimateWheelLabelWidth(value, fontSize)
  }

  context.font = `${wheelLabelFontWeight} ${fontSize}px ${wheelLabelFontFamily}`

  return context.measureText(value).width
}

export function canRenderWheelLabel(
  segment: WheelSegment,
  availableWidth: number,
) {
  return (
    getSegmentSize(segment) > labelMinSegmentAngle &&
    availableWidth >= measureWheelLabel(`M${labelEllipsis}`, labelMinFontSize)
  )
}

export function getWheelLabelFontSize(segments: WheelSegment[]) {
  const labelCandidates = segments
    .map((segment, index) => ({
      availableWidth: getSegmentLabelWidth(segment),
      text: getEntryDisplayText(segment, index),
      segment,
    }))
    .filter(({ availableWidth, segment }) =>
      canRenderWheelLabel(segment, availableWidth),
    )

  if (labelCandidates.length === 0) {
    return labelMaxFontSize
  }

  for (
    let fontSize = labelMaxFontSize;
    fontSize >= labelMinFontSize;
    fontSize -= labelFontSizeStep
  ) {
    const roundedFontSize = Number(fontSize.toFixed(2))
    const allLabelsFit = labelCandidates.every(
      ({ availableWidth, text }) =>
        measureWheelLabel(text, roundedFontSize) <= availableWidth,
    )

    if (allLabelsFit) {
      return roundedFontSize
    }
  }

  return labelMinFontSize
}

export function shortenWheelLabelToWidth(
  value: string,
  availableWidth: number,
  fontSize: number,
) {
  if (measureWheelLabel(value, fontSize) <= availableWidth) {
    return value
  }

  if (measureWheelLabel(labelEllipsis, fontSize) > availableWidth) {
    return ''
  }

  const characters = Array.from(value)
  let lowerBound = 0
  let upperBound = characters.length

  while (lowerBound < upperBound) {
    const currentLength = Math.ceil((lowerBound + upperBound) / 2)
    const candidate = `${characters.slice(0, currentLength).join('')}${labelEllipsis}`

    if (measureWheelLabel(candidate, fontSize) <= availableWidth) {
      lowerBound = currentLength
    } else {
      upperBound = currentLength - 1
    }
  }

  return lowerBound > 0
    ? `${characters.slice(0, lowerBound).join('')}${labelEllipsis}`
    : labelEllipsis
}
