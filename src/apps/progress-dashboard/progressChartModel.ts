import type {
  PlayerScore,
  ProgressDataset,
  ProgressEvent,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { getTimedEvents, rankPlayerScores } from '@/apps/progress-dashboard/logic'

export const chartWidth = 1040
export const chartHeight = 420
export const chartPadding = {
  top: 38,
  right: 36,
  bottom: 96,
  left: 128,
}
export const mobileSparklineWidth = 240
export const mobileSparklineHeight = 56
export const mobileSparklinePadding = {
  top: 8,
  right: 8,
  bottom: 8,
  left: 8,
}

export type ProgressChartSegment = {
  time: number
  value: number
}

export type ProgressChartSeries = {
  eventValues: {
    event: ProgressEvent
    time: number
    value: number
  }[]
  player: ProgressPlayer
  score: number
  segments: ProgressChartSegment[]
}

type ArchivePlayerSummary = {
  eventCount: number
  firstEventAt: string | null
  lastEventAt: string | null
  player: ProgressPlayer
  score: number
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

export function getArchivePlayerSummaries(
  sortedEvents: ProgressEvent[],
  players: ProgressPlayer[],
) {
  const summariesByPlayerId = new Map<string, ArchivePlayerSummary>(
    players.map((player) => [
      player.id,
      {
        eventCount: 0,
        firstEventAt: null,
        lastEventAt: null,
        player,
        score: 0,
      },
    ]),
  )

  sortedEvents.forEach((event) => {
    const summary = summariesByPlayerId.get(event.playerId)

    if (!summary) {
      return
    }

    summary.eventCount += 1
    summary.firstEventAt = summary.firstEventAt ?? event.createdAtClientIso
    summary.lastEventAt = event.createdAtClientIso
    summary.score = Math.max(0, summary.score + event.valueDelta)
  })

  return rankPlayerScores([...summariesByPlayerId.values()])
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
  maxTimeTicks?: number
  niceTicks?: boolean
  padding: typeof chartPadding
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
  const rankedSeries = rankPlayerScores(series)
  const rankedScores: PlayerScore[] = rankedSeries.map(({ player, score }) => ({
    player,
    score,
  }))

  return {
    hasValidEvents,
    maxValue,
    rankedScores,
    rankedSeries,
    series,
    xDomainMax,
    xDomainMin,
  }
}

// Scales, ticks and paths depend on the drawing size; the model above does not.
export function getProgressChartLayout(
  model: ReturnType<typeof getProgressChartModel>,
  locale: string,
  layout: ProgressChartLayout = {
    height: chartHeight,
    padding: chartPadding,
    width: chartWidth,
  },
) {
  const { height, padding: chartPadding, width: chartWidth } = layout
  const { maxValue, series, xDomainMax, xDomainMin } = model
  const niceValueAxis = layout.niceTicks ? getNiceValueAxis(maxValue) : null
  const yDomainMax = niceValueAxis?.max ?? Math.max(1, Math.ceil(maxValue * 1.12))
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = height - chartPadding.top - chartPadding.bottom
  const plotCenterX = chartPadding.left + plotWidth / 2
  const plotCenterY = chartPadding.top + plotHeight / 2
  const xScale = (time: number) =>
    chartPadding.left +
    ((time - xDomainMin) / (xDomainMax - xDomainMin || 1)) * plotWidth
  const yScale = (value: number) =>
    chartPadding.top + plotHeight - (value / yDomainMax) * plotHeight
  const yTicks =
    niceValueAxis?.ticks ??
    Array.from({ length: 5 }, (_, index) => (yDomainMax / 4) * index)
  const xTicks = layout.niceTicks
    ? getNiceTimeTicks(xDomainMin, xDomainMax, layout.maxTimeTicks ?? 5, locale)
    : Array.from({ length: 5 }, (_, index) => {
    const time = xDomainMin + ((xDomainMax - xDomainMin) / 4) * index

    return {
      time,
      label: new Date(time).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })
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
      x: xScale(eventValue.time),
      y: yScale(eventValue.value),
    })),
  )

  return {
    chartSeries,
    eventPoints,
    plotCenterX,
    plotCenterY,
    xScale,
    xTicks,
    yScale,
    yTicks,
    yDomainMax,
  }
}

export function getProgressChartData(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
  locale: string,
  layout?: ProgressChartLayout,
) {
  const model = getProgressChartModel(dataset, players)

  return { ...model, ...getProgressChartLayout(model, locale, layout) }
}

export type ProgressChartData = ReturnType<typeof getProgressChartData>

export function getPlayerTimelinePath(
  segments: ProgressChartSegment[],
  chartData: Pick<ProgressChartData, 'xDomainMax' | 'xDomainMin' | 'yDomainMax'>,
) {
  const plotWidth =
    mobileSparklineWidth - mobileSparklinePadding.left - mobileSparklinePadding.right
  const plotHeight =
    mobileSparklineHeight - mobileSparklinePadding.top - mobileSparklinePadding.bottom
  const xScale = (time: number) =>
    mobileSparklinePadding.left +
    ((time - chartData.xDomainMin) /
      (chartData.xDomainMax - chartData.xDomainMin || 1)) *
      plotWidth
  const yScale = (value: number) =>
    mobileSparklinePadding.top +
    plotHeight -
    (value / chartData.yDomainMax) * plotHeight

  return createStepPath(segments, xScale, yScale)
}

export function getFittedChartPadding(width: number) {
  return { top: 28, right: 12, bottom: 32, left: width >= 560 ? 44 : 32 }
}
