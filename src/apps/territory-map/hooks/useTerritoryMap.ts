import { useEffect, useMemo } from 'react'

import type {
  TerritoryClaim,
  TerritoryClaimAction,
  TerritoryClaimsByMap,
  TerritoryMapId,
  TerritoryMapState,
  TerritoryPlayer,
} from '@/apps/territory-map/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

export const territoryColorPresets = [
  '#027a9f',
  '#12b296',
  '#feaa01',
  '#7c3aed',
  '#dc2626',
  '#16a34a',
]

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
    name: 'Spieler 1',
    color: territoryColorPresets[0],
    position: 1,
  },
  {
    id: 'person-2',
    name: 'Spieler 2',
    color: territoryColorPresets[1],
    position: 2,
  },
]

function createRandomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeColor(color: string, fallback: string) {
  const trimmed = color.trim()

  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback
}

function fallbackPlayerName(player: Pick<TerritoryPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Spieler ${Number.isFinite(position) ? position : 1}`
}

function sanitizeName(
  name: string,
  player: Pick<TerritoryPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

function normalizePlayer(
  player: TerritoryPlayer,
  index: number,
): TerritoryPlayer {
  const position = Number.isFinite(Number(player.position))
    ? Number(player.position)
    : index + 1
  const fallbackColor =
    territoryColorPresets[index % territoryColorPresets.length]

  return {
    ...player,
    position,
    name: sanitizeName(player.name ?? '', { id: player.id, position }),
    color: sanitizeColor(player.color ?? fallbackColor, fallbackColor),
  }
}

function normalizeClaimsByMap(
  claimsByMap: Partial<TerritoryClaimsByMap> | undefined,
): TerritoryClaimsByMap {
  return {
    world: claimsByMap?.world ?? {},
    germany: claimsByMap?.germany ?? {},
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

  const addPlayer = (name: string, color: string) => {
    const nextPosition =
      players.reduce((max, player) => Math.max(max, player.position), 0) + 1
    const id = `person-${nextPosition}`
    const fallbackColor =
      territoryColorPresets[(nextPosition - 1) % territoryColorPresets.length]

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
      .merge({
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
    stateStore.merge({
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
    resetCurrentMap,
    session,
    setActiveMap,
    state,
    territoryColorPresets,
    undoLastClaim,
    updatePlayerColor,
    updatePlayerName,
  }
}
