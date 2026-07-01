import { useMemo } from 'react'

import type {
  CoinflipResult,
  CoinflipSide,
  CoinflipState,
} from '@/apps/coinflip/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const initialCoinflipState: CoinflipState = {
  lastFlip: null,
  history: [],
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getCoinflipLabel(side: CoinflipSide) {
  return side === 'heads' ? 'Kopf' : 'Zahl'
}

export function useCoinflip(stateId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(() => firebasePaths.coinflipState(stateId), [stateId])
  const store = useFirestoreDoc<CoinflipState>(statePath, initialCoinflipState)

  const flip = () => {
    const side: CoinflipSide = Math.random() < 0.5 ? 'heads' : 'tails'
    const result: CoinflipResult = {
      id: createId(),
      side,
      createdAt: new Date().toISOString(),
    }

    return store.merge({
      lastFlip: result,
      history: [result, ...store.data.history].slice(0, 5),
      updatedBy: session.userId,
    })
  }

  const clearHistory = () =>
    store.merge({
      lastFlip: null,
      history: [],
      updatedBy: session.userId,
    })

  return {
    ...store,
    clearHistory,
    flip,
  }
}
