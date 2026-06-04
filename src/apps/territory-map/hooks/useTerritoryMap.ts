import { useEffect, useMemo } from 'react'

import type {
  TerritoryClaim,
  TerritoryClaimAction,
  TerritoryClaimsByMap,
  TerritoryMapId,
  TerritoryMapState,
  TerritoryPlayer,
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

export const territoryColorPresets = [...participantColorPresets]

const emptyClaimsByMap: TerritoryClaimsByMap = {
  world: {},
  germany: {},
}

const initialState: TerritoryMapState = {
  activeMap: 'world',
  claimsByMap: emptyClaimsByMap,
  lastClaimAction: null,
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

function normalizeClaimsByMap(
  claimsByMap: Partial<TerritoryClaimsByMap> | undefined,
): TerritoryClaimsByMap {
  return {
    world: Object.fromEntries(
      Object.entries(claimsByMap?.world ?? {}).map(([id, claim], index) => [
        id,
        {
          ...claim,
          playerColor: sanitizeColor(
            claim.playerColor,
            getTerritoryColorByIndex(index),
          ),
        },
      ]),
    ),
    germany: Object.fromEntries(
      Object.entries(claimsByMap?.germany ?? {}).map(([id, claim], index) => [
        id,
        {
          ...claim,
          playerColor: sanitizeColor(
            claim.playerColor,
            getTerritoryColorByIndex(index),
          ),
        },
      ]),
    ),
  }
}

function normalizeState(state: TerritoryMapState): TerritoryMapState {
  const activeMap = state.activeMap === 'germany' ? 'germany' : 'world'

  return {
    ...initialState,
    ...state,
    activeMap,
    claimsByMap: normalizeClaimsByMap(state.claimsByMap),
    lastClaimAction: state.lastClaimAction ?? null,
  }
}

export function useTerritoryMap(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.territoryMapState(sessionId),
    [sessionId],
  )
  const playersPath = useMemo(
    () => firebasePaths.territoryMapPlayers(sessionId),
    [sessionId],
  )
  const stateStore = useFirestoreDoc<TerritoryMapState>(
    statePath,
    initialState,
  )
  const playersStore = useFirestoreCollection<TerritoryPlayer>(
    playersPath,
    defaultPlayers,
  )

  const state = useMemo(() => normalizeState(stateStore.data), [stateStore.data])
  const players = useMemo(
    () => playersStore.data.map(normalizePlayer),
    [playersStore.data],
  )
  const currentClaims = state.claimsByMap[state.activeMap]
  const claimedCount = Object.keys(currentClaims).length

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

  const updatePlayerName = (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      name: sanitizeName(name, player),
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerColor = (playerId: string, color: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    const nextColor = sanitizeColor(color, player.color)

    return playersStore.mergeItem(playerId, {
      color: nextColor,
      lastUpdatedBy: session.userId,
    })
  }

  const removePlayer = async (playerId: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player || player.position <= 2) {
      return false
    }

    const claimsByMap = normalizeClaimsByMap(state.claimsByMap)

    await playersStore.deleteItem(playerId)
    await stateStore.save({
      ...state,
      claimsByMap: {
        world: Object.fromEntries(
          Object.entries(claimsByMap.world).filter(
            ([, claim]) => claim.playerId !== playerId,
          ),
        ),
        germany: Object.fromEntries(
          Object.entries(claimsByMap.germany).filter(
            ([, claim]) => claim.playerId !== playerId,
          ),
        ),
      },
      lastClaimAction: null,
      updatedBy: session.userId,
    })

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
    const previousClaim = state.claimsByMap[mapId][territoryId] ?? null
    const nextClaim: TerritoryClaim = {
      territoryId,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      claimedAtClientIso: now,
    }
    const action: TerritoryClaimAction = {
      id: `claim-${createRandomId()}`,
      mapId,
      territoryId,
      previousClaim,
      nextClaim,
      createdAtClientIso: now,
    }

    return stateStore
      .merge({
        claimsByMap: {
          ...state.claimsByMap,
          [mapId]: {
            ...state.claimsByMap[mapId],
            [territoryId]: nextClaim,
          },
        },
        lastClaimAction: action,
        updatedBy: session.userId,
      })
      .then(() => true)
  }

  const unclaimTerritory = (
    mapId: TerritoryMapId,
    territoryId: string,
    previousClaimOverride?: TerritoryClaim,
  ) => {
    const previousClaim =
      state.claimsByMap[mapId][territoryId] ?? previousClaimOverride ?? null

    if (!previousClaim) {
      return Promise.resolve(false)
    }

    const nextMapClaims = { ...state.claimsByMap[mapId] }
    delete nextMapClaims[territoryId]

    const now = new Date().toISOString()
    const action: TerritoryClaimAction = {
      id: `claim-${createRandomId()}`,
      mapId,
      territoryId,
      previousClaim,
      nextClaim: null,
      createdAtClientIso: now,
    }

    return stateStore
      .save({
        ...state,
        claimsByMap: {
          ...state.claimsByMap,
          [mapId]: nextMapClaims,
        },
        lastClaimAction: action,
        updatedBy: session.userId,
      })
      .then(() => true)
  }

  const undoLastClaim = () => {
    const action = state.lastClaimAction

    if (!action) {
      return Promise.resolve(false)
    }

    const nextMapClaims = { ...state.claimsByMap[action.mapId] }

    if (action.previousClaim) {
      nextMapClaims[action.territoryId] = action.previousClaim
    } else {
      delete nextMapClaims[action.territoryId]
    }

    return stateStore
      .save({
        ...state,
        claimsByMap: {
          ...state.claimsByMap,
          [action.mapId]: nextMapClaims,
        },
        lastClaimAction: null,
        updatedBy: session.userId,
      })
      .then(() => true)
  }

  const resetCurrentMap = () =>
    stateStore.save({
      ...state,
      claimsByMap: {
        ...state.claimsByMap,
        [state.activeMap]: {},
      },
      lastClaimAction: null,
      updatedBy: session.userId,
    })

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

  return {
    addPlayer,
    claimTerritory,
    claimedCount,
    currentClaims,
    error: stateStore.error ?? playersStore.error,
    isLoading: stateStore.isLoading || playersStore.isLoading,
    isRealtime: stateStore.isRealtime && playersStore.isRealtime,
    players,
    removePlayer,
    resetCurrentMap,
    session,
    setActiveMap,
    state,
    territoryColorPresets,
    unclaimTerritory,
    undoLastClaim,
    updatePlayerColor,
    updatePlayerName,
  }
}
