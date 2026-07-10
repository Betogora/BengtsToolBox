import { describe, expect, it } from 'vitest'

import {
  getCoinFaceRotation,
  getCoinFlipRotationDegrees,
  getRandomCoinSide,
  normalizeCoinRotation,
} from '@/apps/coinflip/coin'

describe('coinflip logic', () => {
  it('maps even values to heads and odd values to tails', () => {
    expect(getRandomCoinSide(() => 0)).toBe('heads')
    expect(getRandomCoinSide(() => 4_294_967_295)).toBe('tails')
  })

  it('normalizes rotations and exposes stable face rotations', () => {
    expect(normalizeCoinRotation(-180)).toBe(180)
    expect(normalizeCoinRotation(540)).toBe(180)
    expect(getCoinFaceRotation('heads')).toBe(0)
    expect(getCoinFaceRotation('tails')).toBe(180)
    expect(getCoinFlipRotationDegrees()).toBe(2160)
  })
})
