import { describe, expect, it } from 'vitest'

import {
  normalizeRandomizerRange,
  rollRandomInteger,
} from '@/apps/randomizer/random'

describe('normalizeRandomizerRange', () => {
  it('rounds down and orders both limits', () => {
    expect(normalizeRandomizerRange(9.9, 2.8)).toEqual({ min: 2, max: 9 })
  })

  it('uses the established defaults for non-finite limits', () => {
    expect(normalizeRandomizerRange(Number.NaN, Number.POSITIVE_INFINITY)).toEqual({
      min: 1,
      max: 6,
    })
  })
})

describe('rollRandomInteger', () => {
  it('includes the lower and upper limit', () => {
    expect(rollRandomInteger(2, 6, () => 0)).toBe(2)
    expect(rollRandomInteger(2, 6, () => 0.999_999)).toBe(6)
  })

  it('normalizes reversed limits before rolling', () => {
    expect(rollRandomInteger(6, 2, () => 0)).toBe(2)
  })
})
