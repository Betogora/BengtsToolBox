import { useMemo } from 'react'

import type { RandomizerState, RollResult } from '@/apps/randomizer/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const initialRandomizerState: RandomizerState = {
  min: 1,
  max: 6,
  lastRoll: null,
  history: [],
}

export function useRandomizer(stateId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(() => firebasePaths.randomizerState(stateId), [stateId])
  const store = useFirestoreDoc<RandomizerState>(
    statePath,
    initialRandomizerState,
  )

  const updateRange = (min: number, max: number) => {
    const normalizedMin = Number.isFinite(min) ? Math.floor(min) : 1
    const normalizedMax = Number.isFinite(max) ? Math.floor(max) : 6
    const safeMin = Math.min(normalizedMin, normalizedMax)
    const safeMax = Math.max(normalizedMin, normalizedMax)

    return store.merge({
      min: safeMin,
      max: safeMax,
      updatedBy: session.userId,
    })
  }

  const roll = () => {
    const min = Math.min(store.data.min, store.data.max)
    const max = Math.max(store.data.min, store.data.max)
    const value = Math.floor(Math.random() * (max - min + 1)) + min
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
      history: [result, ...store.data.history].slice(0, 10),
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
    clearHistory,
    roll,
    updateRange,
  }
}
