import type { CoinflipSide } from '@/apps/coinflip/types'

export const coinFlipDurationMs = 1700
export const coinFlipSettleDelayMs = coinFlipDurationMs + 120

const coinFlipFullTurns = 6

export function normalizeCoinRotation(value: number) {
  return ((value % 360) + 360) % 360
}

export function getCoinFaceRotation(side: CoinflipSide) {
  return side === 'heads' ? 0 : 180
}

function getRandomUint32() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function'
  ) {
    const values = new Uint32Array(1)
    crypto.getRandomValues(values)

    return values[0]
  }

  return Math.floor(Math.random() * 0x100000000)
}

export function getRandomCoinSide(): CoinflipSide {
  return (getRandomUint32() & 1) === 0 ? 'heads' : 'tails'
}

export function getCoinFlipRotationDegrees() {
  return coinFlipFullTurns * 360
}
