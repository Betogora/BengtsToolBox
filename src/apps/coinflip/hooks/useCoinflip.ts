import { useMemo } from 'react'

import type {
  CoinflipResult,
  CoinflipSide,
  CoinflipState,
} from '@/apps/coinflip/types'
import { getRandomCoinSide } from '@/apps/coinflip/coin'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const initialCoinflipState: CoinflipState = {
  lastFlip: null,
  history: [],
}

export function getCoinflipLabelKey(side: CoinflipSide) {
  return side === 'heads' ? 'coinflip.face.heads' : 'coinflip.face.tails'
}

export function useCoinflip(stateId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(() => firebasePaths.coinflipState(stateId), [stateId])
  const store = useFirestoreDoc<CoinflipState>(statePath, initialCoinflipState)

  const prepareFlipResult = (): CoinflipResult => ({
    id: `coinflip-${createRandomId()}`,
    side: getRandomCoinSide(),
    createdAt: new Date().toISOString(),
  })

  const commitFlipResult = (result: CoinflipResult) =>
    store.merge({
      lastFlip: result,
      history: [result, ...store.data.history].slice(0, 5),
      updatedBy: session.userId,
    })

  const flip = () => commitFlipResult(prepareFlipResult())

  const clearHistory = () =>
    store.merge({
      lastFlip: null,
      history: [],
      updatedBy: session.userId,
    })

  return {
    ...store,
    clearHistory,
    commitFlipResult,
    flip,
    prepareFlipResult,
  }
}
