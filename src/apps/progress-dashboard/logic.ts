import type {
  PlayerScore,
  ProgressDataset,
  ProgressDrinkIcon,
  ProgressEvent,
  ProgressEventDelta,
  ProgressEventIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { createRandomId } from '@/apps/shared/utils'
import {
  getParticipantColorByPosition,
  normalizeParticipantColor,
  normalizeThemeColor,
} from '@/lib/theme'

export const defaultProgressDrinkIcon: ProgressDrinkIcon = 'beer'

export function getDrinkIconEventDelta(icon: ProgressDrinkIcon): ProgressEventDelta {
  return icon === 'schnaps' ? 0.5 : 1
}

export function createProgressPlayer(
  players: ProgressPlayer[],
  createId: () => string = createRandomId,
): ProgressPlayer {
  const position =
    players.reduce((max, player) => Math.max(max, player.position), 0) + 1

  return {
    id: `person-${createId()}`,
    name: `Person ${position}`,
    position,
    color: getParticipantColorByPosition(position),
    defaultEventIcon: defaultProgressDrinkIcon,
  }
}

export function getPlayerScores(
  players: ProgressPlayer[],
  events: ProgressEvent[],
): PlayerScore[] {
  const scores = new Map(players.map((player) => [player.id, { score: 0, reachedAt: -1 }]))
  getSortedEvents(events).forEach((event, index) => {
    const current = scores.get(event.playerId)
    if (!current) {
      return
    }

    const score = Math.max(0, current.score + event.valueDelta)
    // Ein Eintrag, der den Stand nicht ändert (Minus bei 0), verschiebt den Zeitpunkt nicht.
    if (score !== current.score) {
      scores.set(event.playerId, { score, reachedAt: index })
    }
  })

  return players.map((player) => ({
    player,
    ...(scores.get(player.id) ?? { score: 0, reachedAt: -1 }),
  }))
}

// Zeitstempel werden einmal je Ereignis gelesen statt in jedem Sortiervergleich.
export function getTimedEvents(events: ProgressEvent[]) {
  return events
    .map((event) => ({ event, time: Date.parse(event.createdAtClientIso) }))
    .sort(
      (left, right) =>
        left.time - right.time || left.event.position - right.event.position,
    )
}

export function getSortedEvents(events: ProgressEvent[]) {
  return getTimedEvents(events).map(({ event }) => event)
}

// Neueste Ereignisse zuerst.
export function getEventTable(events: ProgressEvent[]) {
  return events
    .map((event) => ({ event, time: Date.parse(event.createdAtClientIso) }))
    .sort(
      (left, right) =>
        right.time - left.time || right.event.position - left.event.position,
    )
    .map(({ event }) => event)
}

// Gleichstand teilt sich den Platz (1, 1, 3); innerhalb steht zuerst, wer den Stand früher erreicht hat.
export function rankPlayerScores<T extends PlayerScore>(scores: readonly T[]) {
  const sorted = [...scores].sort(
    (left, right) =>
      right.score - left.score ||
      left.reachedAt - right.reachedAt ||
      left.player.position - right.player.position,
  )

  return sorted.map((entry) => ({
    ...entry,
    rank: sorted.findIndex(({ score }) => score === entry.score) + 1,
  }))
}

export type PlayerStanding = {
  rank: number
  // Bei Platz 1 die Person dahinter, sonst die direkt davor.
  rival: { name: string; gap: number } | null
  lastEvent: ProgressEvent | null
}

// Platz, Abstand zum direkten Gegenüber und letzter Eintrag je Person für die Tooltips.
export function getPlayerStandings(
  scores: readonly PlayerScore[],
  events: ProgressEvent[],
) {
  const ranked = rankPlayerScores(scores)
  const lastEvents = new Map<string, ProgressEvent>()
  getSortedEvents(events).forEach((event) => lastEvents.set(event.playerId, event))

  return new Map<string, PlayerStanding>(
    ranked.map(({ player, rank, score }, index) => {
      const rival = ranked[index === 0 ? 1 : index - 1]

      return [
        player.id,
        {
          rank,
          rival: rival ? { name: rival.player.name, gap: Math.abs(score - rival.score) } : null,
          lastEvent: lastEvents.get(player.id) ?? null,
        },
      ]
    }),
  )
}

export const defaultUnit = 'Getränke'
const legacyDefaultChartTitle = 'Fortschritt über Zeit'
const emptyUnitDefaultChartTitle = 'Dashboard'

export function getDefaultChartTitle(unit: string) {
  const trimmedUnit = unit.trim()

  return trimmedUnit ? `${trimmedUnit}-Dashboard` : emptyUnitDefaultChartTitle
}

export function isDefaultChartTitle(title: string, unit: string) {
  const trimmedTitle = title.trim()

  return (
    !trimmedTitle ||
    trimmedTitle === legacyDefaultChartTitle ||
    trimmedTitle === getDefaultChartTitle(unit)
  )
}

function fallbackPlayerName(player: Pick<ProgressPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Person ${Number.isFinite(position) ? position : 1}`
}

export function sanitizeName(
  name: string,
  player: Pick<ProgressPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

export function sanitizeColor(color: string, fallback: string) {
  return normalizeParticipantColor(color, fallback)
}

function normalizeEventIcon(icon: unknown, valueDelta: number): ProgressEventIcon {
  if (
    icon === 'plus' ||
    icon === 'minus' ||
    icon === 'wine' ||
    icon === 'beer' ||
    icon === 'schnaps' ||
    icon === 'funnel'
  ) {
    return icon
  }

  return valueDelta < 0 ? 'minus' : 'plus'
}

function isProgressDrinkIcon(icon: unknown): icon is ProgressDrinkIcon {
  return icon === 'wine' || icon === 'beer' || icon === 'schnaps' || icon === 'funnel'
}

export function normalizeDrinkIcon(icon: unknown): ProgressDrinkIcon {
  return isProgressDrinkIcon(icon) ? icon : defaultProgressDrinkIcon
}

function normalizeDatasetName(name: string | undefined) {
  const trimmedName = name?.trim()

  if (!trimmedName || trimmedName === 'Aktueller Datensatz') {
    return 'Datensatz'
  }

  return trimmedName
}

export function normalizePlayer(player: ProgressPlayer, index: number): ProgressPlayer {
  const position = Number.isFinite(player.position)
    ? Number(player.position)
    : index + 1
  const fallbackColor = getParticipantColorByPosition(position)
  const name = sanitizeName(player.name ?? '', { id: player.id, position })
  const color = sanitizeColor(player.color ?? fallbackColor, fallbackColor)

  return {
    ...player,
    position,
    name,
    color,
    defaultEventIcon: normalizeDrinkIcon(player.defaultEventIcon),
  }
}

export function normalizeDataset(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
): ProgressDataset {
  const hasUnit = typeof dataset.unit === 'string'
  const unit = hasUnit ? dataset.unit : defaultUnit
  const chartTitle = dataset.chartTitle?.trim()

  return {
    ...dataset,
    chartTitle:
      !chartTitle || chartTitle === legacyDefaultChartTitle
        ? getDefaultChartTitle(unit)
        : chartTitle,
    createdAtClientIso: dataset.createdAtClientIso || new Date().toISOString(),
    archivedAtClientIso: dataset.archivedAtClientIso ?? null,
    events: (dataset.events ?? []).map((event, index) => ({
      ...event,
      playerColor:
        players.find((player) => player.id === event.playerId)?.color ??
        normalizeThemeColor(event.playerColor, index),
      valueDelta: Number.isFinite(Number(event.valueDelta))
        ? Number(event.valueDelta)
        : 1,
      icon: normalizeEventIcon(event.icon, Number(event.valueDelta) || 1),
      position: Number.isFinite(event.position) ? event.position : index + 1,
      createdAtClientIso: event.createdAtClientIso || new Date().toISOString(),
      createdAtLabel: event.createdAtLabel || event.createdAtClientIso,
    })),
    name: normalizeDatasetName(dataset.name),
    position: Number.isFinite(dataset.position) ? dataset.position : 1,
    status: dataset.status === 'archived' ? 'archived' : 'active',
    unit,
  }
}
