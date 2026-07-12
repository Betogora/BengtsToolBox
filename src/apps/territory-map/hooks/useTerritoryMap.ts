import { useEffect, useMemo } from 'react'

import { territoryOptionsByMap } from '@/apps/territory-map/data/territories'
import type {
  TerritoryClaim,
  TerritoryClaimOwner,
  TerritoryClaimsByMap,
  TerritoryDataset,
  TerritoryMapId,
  TerritoryMapState,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import {
  getParticipantColorByPosition,
  normalizeParticipantColor,
  participantColorPresets,
} from '@/lib/theme'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

export const territoryColorPresets = [...participantColorPresets]

const activeDatasetId = 'dataset-current'

const initialState: TerritoryMapState = {
  activeMap: 'world',
}

const defaultPlayers: TerritoryPlayer[] = [
  {
    id: 'person-1',
    name: 'Bengt',
    color: territoryColorPresets[0],
    position: 1,
  },
  {
    id: 'person-2',
    name: 'Paul',
    color: territoryColorPresets[1],
    position: 2,
  },
  {
    id: 'person-3',
    name: 'Sushi-Tourist 3',
    color: territoryColorPresets[2],
    position: 3,
  },
]

function createDataset(position = 1): TerritoryDataset {
  const now = new Date().toISOString()

  return {
    id: activeDatasetId,
    position,
    name: 'Datensatz',
    status: 'active',
    createdAtClientIso: now,
    archivedAtClientIso: null,
    events: [],
  }
}

function omitDatasetId(dataset: TerritoryDataset): Omit<TerritoryDataset, 'id'> {
  const { id, ...value } = dataset

  void id

  return value
}

function sanitizeColor(color: string, fallback: string) {
  return normalizeParticipantColor(color, fallback)
}

function getTerritoryColorByIndex(index: number) {
  return getParticipantColorByPosition(index + 1)
}

function fallbackPlayerName(player: Pick<TerritoryPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Sushi-Tourist ${Number.isFinite(position) ? position : 1}`
}

function sanitizeName(
  name: string,
  player: Pick<TerritoryPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()
  const legacyDefaultName = trimmedName.match(/^Esser\s+(\d+)$/)

  if (legacyDefaultName) {
    return `Sushi-Tourist ${legacyDefaultName[1]}`
  }

  return trimmedName || fallbackPlayerName(player)
}

function isDefaultPlayerName(name: string, position: number) {
  return (
    name === defaultPlayers.find((player) => player.position === position)?.name ||
    name === `Sushi-Tourist ${position}` ||
    name === `Esser ${position}`
  )
}

function normalizePlayer(
  player: TerritoryPlayer,
  index: number,
): TerritoryPlayer {
  const position = Number.isFinite(Number(player.position))
    ? Number(player.position)
    : index + 1
  const fallbackColor = getTerritoryColorByIndex(index)
  const name = sanitizeName(player.name ?? '', { id: player.id, position })
  const color = isDefaultPlayerName(name, position)
    ? getTerritoryColorByIndex(position - 1)
    : sanitizeColor(player.color ?? fallbackColor, fallbackColor)

  return {
    ...player,
    position,
    name,
    color,
  }
}

function normalizeState(state: TerritoryMapState): TerritoryMapState {
  const activeMap = state.activeMap === 'germany' ? 'germany' : 'world'

  return {
    ...initialState,
    ...state,
    activeMap,
  }
}

function getTerritoryName(mapId: TerritoryMapId, territoryId: string) {
  return (
    territoryOptionsByMap[mapId].find((territory) => territory.id === territoryId)
      ?.name ?? territoryId
  )
}

function compareEventsAscending(
  left: Pick<TerritoryVisitEvent, 'createdAtClientIso' | 'position'>,
  right: Pick<TerritoryVisitEvent, 'createdAtClientIso' | 'position'>,
) {
  return (
    getLocalDateKey(left.createdAtClientIso).localeCompare(
      getLocalDateKey(right.createdAtClientIso),
    ) ||
    left.position - right.position
  )
}

function getLocalDateKey(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function normalizeEvent(
  event: TerritoryVisitEvent,
  index: number,
  players: TerritoryPlayer[],
): TerritoryVisitEvent {
  const mapId = event.mapId === 'germany' ? 'germany' : 'world'
  const player = players.find((entry) => entry.id === event.playerId)
  const fallbackColor = getTerritoryColorByIndex(index)
  const createdAtClientIso = event.createdAtClientIso || new Date().toISOString()

  return {
    ...event,
    mapId,
    territoryName:
      getTerritoryName(mapId, event.territoryId) ??
      event.territoryName ??
      event.territoryId,
    playerName: player?.name ?? event.playerName,
    playerColor: player?.color ?? sanitizeColor(event.playerColor, fallbackColor),
    createdAtClientIso,
    createdAtLabel: event.createdAtLabel || createdAtClientIso,
    position: Number.isFinite(event.position) ? event.position : index + 1,
  }
}

function normalizeDataset(
  dataset: TerritoryDataset,
  players: TerritoryPlayer[],
): TerritoryDataset {
  return {
    ...dataset,
    position: Number.isFinite(dataset.position) ? dataset.position : 1,
    name: dataset.name?.trim() || 'Datensatz',
    status: dataset.status === 'archived' ? 'archived' : 'active',
    createdAtClientIso: dataset.createdAtClientIso || new Date().toISOString(),
    archivedAtClientIso: dataset.archivedAtClientIso ?? null,
    events: (dataset.events ?? []).map((event, index) =>
      normalizeEvent(event, index, players),
    ),
  }
}

function getCurrentClaims(events: TerritoryVisitEvent[]): TerritoryClaimsByMap {
  const claimsByMap: TerritoryClaimsByMap = {
    world: {},
    germany: {},
  }
  const latestDaysByTerritory: Record<TerritoryMapId, Record<string, string>> = {
    world: {},
    germany: {},
  }
  const ownersByTerritory: Record<
    TerritoryMapId,
    Record<string, Map<string, TerritoryClaimOwner>>
  > = {
    world: {},
    germany: {},
  }

  ;[...events].sort(compareEventsAscending).forEach((event) => {
    const eventDay = getLocalDateKey(event.createdAtClientIso)
    const currentDay = latestDaysByTerritory[event.mapId][event.territoryId]

    if (!eventDay) {
      return
    }

    if (!currentDay || eventDay > currentDay) {
      latestDaysByTerritory[event.mapId][event.territoryId] = eventDay
      ownersByTerritory[event.mapId][event.territoryId] = new Map()
    }

    if (eventDay !== latestDaysByTerritory[event.mapId][event.territoryId]) {
      return
    }

    const owners = ownersByTerritory[event.mapId][event.territoryId]

    owners.set(event.playerId, {
      playerId: event.playerId,
      playerName: event.playerName,
      playerColor: event.playerColor,
    })

    const firstOwner = [...owners.values()][0]

    claimsByMap[event.mapId][event.territoryId] = {
      territoryId: event.territoryId,
      playerId: firstOwner.playerId,
      playerName: firstOwner.playerName,
      playerColor: firstOwner.playerColor,
      owners: [...owners.values()],
      claimedAtClientIso: event.createdAtClientIso,
    }
  })

  return claimsByMap
}

function getLatestEventIdsForTerritoryDay(
  events: TerritoryVisitEvent[],
  mapId: TerritoryMapId,
  territoryId: string,
) {
  const territoryEvents = events.filter(
    (event) => event.mapId === mapId && event.territoryId === territoryId,
  )
  const latestDay = territoryEvents
    .map((event) => getLocalDateKey(event.createdAtClientIso))
    .filter(Boolean)
    .sort()
    .at(-1)

  return latestDay
    ? territoryEvents
        .filter((event) => getLocalDateKey(event.createdAtClientIso) === latestDay)
        .map((event) => event.id)
    : []
}

export function useTerritoryMap(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.territoryMapState(activeLobbyId),
    [activeLobbyId],
  )
  const playersPath = useMemo(
    () => firebasePaths.territoryMapPlayers(activeLobbyId),
    [activeLobbyId],
  )
  const datasetsPath = useMemo(
    () => firebasePaths.territoryMapDatasets(activeLobbyId),
    [activeLobbyId],
  )
  const stateStore = useFirestoreDoc<TerritoryMapState>(
    statePath,
    initialState,
  )
  const playersStore = useFirestoreCollection<TerritoryPlayer>(
    playersPath,
    defaultPlayers,
  )
  const datasetsStore = useFirestoreCollection<TerritoryDataset>(
    datasetsPath,
    [],
  )

  const state = useMemo(() => normalizeState(stateStore.data), [stateStore.data])
  const players = useMemo(
    () => playersStore.data.map(normalizePlayer),
    [playersStore.data],
  )
  const datasets = useMemo(
    () => datasetsStore.data.map((dataset) => normalizeDataset(dataset, players)),
    [datasetsStore.data, players],
  )
  const activeDataset =
    datasets.find((dataset) => dataset.id === activeDatasetId) ??
    datasets.find((dataset) => dataset.status === 'active') ??
    createDataset()
  const claimsByMap = useMemo(
    () => getCurrentClaims(activeDataset.events),
    [activeDataset.events],
  )
  const currentClaims = claimsByMap[state.activeMap]

  useEffect(() => {
    if (playersStore.isLoading || playersStore.data.length > 0) {
      return
    }

    playersStore.saveItems(
      defaultPlayers.map((player) => ({
        ...player,
        lastUpdatedBy: session.userId,
      })),
    )
  }, [playersStore, session.userId])

  useEffect(() => {
    if (datasetsStore.isLoading || datasetsStore.data.length > 0) {
      return
    }

    const dataset = {
      ...createDataset(),
      lastUpdatedBy: session.userId,
    }

    datasetsStore.saveItems([dataset])
  }, [datasetsStore, session.userId])

  const saveActiveDataset = (partialValue: Partial<TerritoryDataset>) => {
    const nextDataset = {
      ...activeDataset,
      ...partialValue,
      lastUpdatedBy: session.userId,
    }
    const value = omitDatasetId(nextDataset)
    const hasStoredDataset = datasets.some((dataset) => dataset.id === activeDataset.id)

    return hasStoredDataset
      ? datasetsStore.mergeItem(activeDataset.id, value)
      : datasetsStore.setItem(activeDataset.id, value)
  }

  const setActiveMap = (activeMap: TerritoryMapId) =>
    stateStore.merge({
      activeMap,
      updatedBy: session.userId,
    })

  const addPlayer = (name = '', color = '') => {
    const nextPosition =
      players.reduce((max, player) => Math.max(max, player.position), 0) + 1
    const id = `person-${nextPosition}`
    const fallbackColor = getTerritoryColorByIndex(nextPosition - 1)

    const player: TerritoryPlayer = {
      id,
      name: sanitizeName(name, { id, position: nextPosition }),
      color: sanitizeColor(color, fallbackColor),
      position: nextPosition,
      lastUpdatedBy: session.userId,
    }

    return playersStore
      .setItem(id, {
        name: player.name,
        color: player.color,
        position: nextPosition,
        lastUpdatedBy: session.userId,
      })
      .then(() => player)
  }

  const updatePlayerName = async (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return
    }

    const nextName = sanitizeName(name, player)

    await playersStore.mergeItem(playerId, {
      name: nextName,
      lastUpdatedBy: session.userId,
    })
    await saveActiveDataset({
      events: activeDataset.events.map((event) =>
        event.playerId === playerId
          ? {
              ...event,
              playerName: nextName,
              lastUpdatedBy: session.userId,
            }
          : event,
      ),
    })
  }

  const updatePlayerColor = async (playerId: string, color: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return
    }

    const nextColor = sanitizeColor(color, player.color)

    await playersStore.mergeItem(playerId, {
      color: nextColor,
      lastUpdatedBy: session.userId,
    })
    await saveActiveDataset({
      events: activeDataset.events.map((event) =>
        event.playerId === playerId
          ? {
              ...event,
              playerColor: nextColor,
              lastUpdatedBy: session.userId,
            }
          : event,
      ),
    })
  }

  const removePlayer = async (playerId: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player || player.position <= 2) {
      return false
    }

    await playersStore.deleteItem(playerId)

    return true
  }

  const claimTerritory = (
    mapId: TerritoryMapId,
    territoryId: string,
    playerId: string,
    playerOverride?: TerritoryPlayer,
  ) => {
    const player =
      playerOverride ?? players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve(false)
    }

    const now = new Date().toISOString()
    const nextPosition =
      activeDataset.events.reduce(
        (max, event) => Math.max(max, event.position),
        0,
      ) + 1
    const event: TerritoryVisitEvent = {
      id: `event-${createRandomId()}`,
      mapId,
      territoryId,
      territoryName: getTerritoryName(mapId, territoryId),
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      createdAtClientIso: now,
      createdAtLabel: now,
      position: nextPosition,
      lastUpdatedBy: session.userId,
    }

    return saveActiveDataset({
      events: [...activeDataset.events, event],
    }).then(() => true)
  }

  const deleteEvent = (eventId: string) =>
    saveActiveDataset({
      events: activeDataset.events.filter((event) => event.id !== eventId),
    })

  const unclaimTerritory = (
    mapId: TerritoryMapId,
    territoryId: string,
    previousClaimOverride?: TerritoryClaim,
  ) => {
    void previousClaimOverride

    const eventIds = getLatestEventIdsForTerritoryDay(
      activeDataset.events,
      mapId,
      territoryId,
    )

    return eventIds.length > 0
      ? saveActiveDataset({
          events: activeDataset.events.filter(
            (event) => !eventIds.includes(event.id),
          ),
        }).then(() => true)
      : Promise.resolve(false)
  }

  const updateEvent = (
    eventId: string,
    partialValue: Partial<
      Pick<
        TerritoryVisitEvent,
        'createdAtClientIso' | 'playerId' | 'territoryId'
      >
    >,
  ) =>
    saveActiveDataset({
      events: activeDataset.events.map((event) => {
        if (event.id !== eventId) {
          return event
        }

        const nextPlayer = partialValue.playerId
          ? players.find((player) => player.id === partialValue.playerId)
          : undefined
        const nextTerritoryId = partialValue.territoryId ?? event.territoryId

        return {
          ...event,
          ...partialValue,
          ...(nextPlayer
            ? {
                playerId: nextPlayer.id,
                playerName: nextPlayer.name,
                playerColor: nextPlayer.color,
              }
            : {}),
          territoryId: nextTerritoryId,
          territoryName: getTerritoryName(event.mapId, nextTerritoryId),
          createdAtLabel:
            partialValue.createdAtClientIso ?? event.createdAtClientIso,
          lastUpdatedBy: session.userId,
        }
      }),
    })

  return {
    activeDataset,
    addPlayer,
    claimTerritory,
    claimsByMap,
    currentClaims,
    deleteEvent,
    error: stateStore.error ?? playersStore.error ?? datasetsStore.error,
    isLoading:
      stateStore.isLoading || playersStore.isLoading || datasetsStore.isLoading,
    isRealtime:
      stateStore.isRealtime && playersStore.isRealtime && datasetsStore.isRealtime,
    players,
    removePlayer,
    session,
    setActiveMap,
    state,
    territoryColorPresets,
    unclaimTerritory,
    updateEvent,
    updatePlayerColor,
    updatePlayerName,
  }
}
