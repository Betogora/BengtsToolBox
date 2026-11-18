import { getLocalDateKey } from '@/apps/territory-map/eventDates'
import type { TerritoryMapId, TerritoryVisitEvent } from '@/apps/territory-map/types'

export const maxVisibleVisitDays = 5

export type TerritoryVisitDay = {
  dayKey: string
  dateIso: string
  playerNames: string[]
}

export type TerritoryVisitHistory = {
  days: TerritoryVisitDay[]
  hiddenDayCount: number
}

/**
 * Besuchstage eines Gebiets, neueste zuerst. Der erste Tag ist der, nach dem
 * die Karte das Gebiet einfärbt; ältere Tage werden nach `limit` gekürzt.
 */
export function getTerritoryVisitHistory(
  events: TerritoryVisitEvent[],
  mapId: TerritoryMapId,
  territoryId: string,
  limit = maxVisibleVisitDays,
): TerritoryVisitHistory {
  const days = new Map<string, TerritoryVisitDay & { playerIds: Set<string> }>()

  events
    .filter((event) => event.mapId === mapId && event.territoryId === territoryId)
    .map((event) => ({ event, dayKey: getLocalDateKey(event.createdAtClientIso) }))
    .filter(({ dayKey }) => dayKey)
    .sort((left, right) => left.event.position - right.event.position)
    .forEach(({ event, dayKey }) => {
      const day = days.get(dayKey) ?? {
        dayKey,
        dateIso: event.createdAtClientIso,
        playerIds: new Set<string>(),
        playerNames: [],
      }
      if (!day.playerIds.has(event.playerId)) {
        day.playerIds.add(event.playerId)
        day.playerNames.push(event.playerName)
      }
      days.set(dayKey, day)
    })

  const sortedDays = [...days.values()]
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
    .map(({ dayKey, dateIso, playerNames }) => ({ dayKey, dateIso, playerNames }))

  return {
    days: sortedDays.slice(0, limit),
    hiddenDayCount: Math.max(0, sortedDays.length - limit),
  }
}
