import { useMemo } from 'react'

import {
  normalizeRandomizerRange,
  rollRandomInteger,
} from '@/apps/randomizer/random'
import type { RandomizerState, RollResult } from '@/apps/randomizer/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

const initialRandomizerState: RandomizerState = {
  min: 1,
  max: 6,
  lastRoll: null,
  history: [],
}

export function useRandomizer(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.randomizerState(activeLobbyId),
    [activeLobbyId],
  )
  const store = useFirestoreDoc<RandomizerState>(
    statePath,
    initialRandomizerState,
  )

  const updateRange = (min: number, max: number) => {
    const range = normalizeRandomizerRange(min, max)

    return store.merge({
      ...range,
      updatedBy: session.userId,
    })
  }

  const roll = () => {
    const value = rollRandomInteger(store.data.min, store.data.max)
    const result: RollResult = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      value,
      createdAt: new Date().toISOString(),
    }

    return store.merge({
      lastRoll: value,
      history: [result, ...store.data.history].slice(0, 5),
      updatedBy: session.userId,
    })
  }

  const clearHistory = () =>
    store.merge({
      lastRoll: null,
      history: [],
      updatedBy: session.userId,
    })

  return {
    ...store,
    error: store.error ?? session.error,
    clearHistory,
    roll,
    updateRange,
  }
}
