import { describe, expect, it } from 'vitest'

import {
  evenlySpacedTicks,
  evenlySpacedTimestamps,
  maxTicksForWidth,
} from './chartTicks'

describe('chart ticks', () => {
  it('labels weeks with a constant step that always includes the latest week', () => {
    const weeks = Array.from({ length: 13 }, (_, index) => `w${index}`)

    expect(evenlySpacedTicks(weeks, 6)).toEqual(['w0', 'w3', 'w6', 'w9', 'w12'])
    expect(evenlySpacedTicks(weeks.slice(0, 4), 6)).toEqual(['w0', 'w1', 'w2', 'w3'])
    expect(evenlySpacedTicks([], 6)).toEqual([])
  })

  it('spreads timestamps evenly across the domain', () => {
    expect(evenlySpacedTimestamps(0, 300, 4)).toEqual([0, 100, 200, 300])
    expect(evenlySpacedTimestamps(5, 5, 4)).toEqual([5])
    expect(maxTicksForWidth(360)).toBe(5)
  })
})
