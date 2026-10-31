import type {
  ProgressDataset,
  ProgressEvent,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { getTimedEvents } from '@/apps/progress-dashboard/logic'

type ProgressChartSegment = {
  time: number
  value: number
}

type ProgressChartSeries = {
  eventValues: {
    event: ProgressEvent
    time: number
    value: number
  }[]
  player: ProgressPlayer
  score: number
  segments: ProgressChartSegment[]
}

function getArchivePlayerName(event: ProgressEvent, position: number) {
  return event.playerName.trim() || `Spieler ${position}`
}

function getArchivePlayerColor(event: ProgressEvent) {
  return event.playerColor || '#0d8e90'
}

/** Players of an archived dataset as recorded in its chronologically sorted events. */
export function getArchivePlayers(sortedEvents: ProgressEvent[]) {
  const playersById = new Map<string, ProgressPlayer>()

  sortedEvents.forEach((event) => {
    const existingPlayer = playersById.get(event.playerId)
    const position = existingPlayer?.position ?? playersById.size + 1

    playersById.set(event.playerId, {
      id: event.playerId,
      name: getArchivePlayerName(event, position),
      position,
      color: getArchivePlayerColor(event),
    })
  })

  return [...playersById.values()].sort(
    (left, right) => left.position - right.position,
  )
}

function createStepPath(
  segments: ProgressChartSegment[],
  xScale: (time: number) => number,
  yScale: (value: number) => number,
) {
  return segments
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L'

      return `${command} ${xScale(point.time).toFixed(1)} ${yScale(point.value).toFixed(1)}`
    })
    .join(' ')
}

type ProgressChartLayout = {
  height: number
  maxTimeTicks: number
  padding: ReturnType<typeof getFittedChartPadding>
  width: number
}

const niceValueSteps = [0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const niceTimeStepsMinutes = [5, 10, 15, 30, 60, 120, 180, 360, 720, 1440]

function getNiceValueAxis(maxValue: number) {
  const step = niceValueSteps.find((entry) => maxValue / entry <= 5) ?? 1000
  const max = Math.max(step, Math.ceil((maxValue * 1.05) / step) * step)

  return {
    max,
    ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, index) => index * step),
  }
}

function getNiceTimeTicks(min: number, max: number, maxTicks: number, locale: string) {
  const spanMinutes = (max - min) / 60_000
  const stepMinutes =
    niceTimeStepsMinutes.find((entry) => spanMinutes / entry <= maxTicks - 1) ?? 1440
  const step = stepMinutes * 60_000
  const first = new Date(min)
  first.setSeconds(0, 0)
  first.setMinutes(Math.ceil(first.getMinutes() / Math.min(stepMinutes, 60)) * Math.min(stepMinutes, 60))
  const ticks: { time: number; label: string }[] = []
  const withDay = spanMinutes > 20 * 60

  for (let time = first.getTime(); time <= max; time += step) {
    ticks.push({
      time,
      label: new Date(time).toLocaleString(locale, {
        ...(withDay ? { weekday: 'short' } : {}),
        hour: '2-digit',
        minute: '2-digit',
      }),
    })
  }

  return ticks
}

export function getProgressChartModel(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
) {
  const timedEvents = getTimedEvents(dataset.events)
  const validEventTimes = timedEvents
    .map(({ time }) => time)
    .filter(Number.isFinite)
  const hasValidEvents = validEventTimes.length > 0
  const datasetStartTime = Date.parse(dataset.createdAtClientIso)
  const fallbackTime = Number.isFinite(datasetStartTime) ? datasetStartTime : 0
  const minTime = hasValidEvents ? Math.min(...validEventTimes) : fallbackTime
  const maxTime = hasValidEvents ? Math.max(...validEventTimes) : fallbackTime
  const xDomainMin = minTime === maxTime ? minTime - 60_000 : minTime
  const xDomainMax = minTime === maxTime ? maxTime + 60_000 : maxTime
  const eventsByPlayerId = new Map<string, typeof timedEvents>()

  timedEvents.forEach((timedEvent) => {
    const playerEvents = eventsByPlayerId.get(timedEvent.event.playerId)

    if (playerEvents) {
      playerEvents.push(timedEvent)
    } else {
      eventsByPlayerId.set(timedEvent.event.playerId, [timedEvent])
    }
  })

  const series: ProgressChartSeries[] = players.map((player) => {
    const playerEvents = eventsByPlayerId.get(player.id) ?? []
    let score = 0
    const eventValues: ProgressChartSeries['eventValues'] = []
    const segments: ProgressChartSegment[] = [
      { time: xDomainMin, value: 0 },
    ]

    playerEvents.forEach(({ event, time }) => {
      if (!Number.isFinite(time)) {
        return
      }

      segments.push({ time, value: score })
      score = Math.max(0, score + event.valueDelta)
      segments.push({ time, value: score })
      eventValues.push({ event, time, value: score })
    })

    segments.push({ time: xDomainMax, value: score })

    return {
      eventValues,
      player,
      score,
      segments,
    }
  })
  const maxValue = Math.max(
    1,
    ...series.map((entry) => entry.score),
    ...series.flatMap((entry) =>
      entry.eventValues.map((eventValue) => eventValue.value),
    ),
  )

  return {
    hasValidEvents,
    maxValue,
    series,
    xDomainMax,
    xDomainMin,
  }
}

// Scales, ticks and paths depend on the drawing size; the model above does not.
export function getProgressChartLayout(
  model: ReturnType<typeof getProgressChartModel>,
  locale: string,
  layout: ProgressChartLayout,
) {
  const { height, padding: chartPadding, width: chartWidth } = layout
  const { maxValue, series, xDomainMax, xDomainMin } = model
  const { max: yDomainMax, ticks: yTicks } = getNiceValueAxis(maxValue)
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = height - chartPadding.top - chartPadding.bottom
  const xScale = (time: number) =>
    chartPadding.left +
    ((time - xDomainMin) / (xDomainMax - xDomainMin || 1)) * plotWidth
  const yScale = (value: number) =>
    chartPadding.top + plotHeight - (value / yDomainMax) * plotHeight
  const xTicks = getNiceTimeTicks(xDomainMin, xDomainMax, layout.maxTimeTicks, locale)
  const chartSeries = series.flatMap(({ player, segments }) => {
    if (segments.length < 2) {
      return []
    }

    return [
      {
        player,
        path: createStepPath(segments, xScale, yScale),
      },
    ]
  })
  const eventPoints = series.flatMap((entry) =>
    entry.eventValues.map((eventValue) => ({
      event: eventValue.event,
      value: eventValue.value,
      x: xScale(eventValue.time),
      y: yScale(eventValue.value),
    })),
  )

  return {
    chartSeries,
    eventPoints,
    xScale,
    xTicks,
    yScale,
    yTicks,
  }
}

export function getFittedChartPadding(width: number) {
  return { top: 14, right: 12, bottom: 32, left: width >= 560 ? 44 : 32 }
}
