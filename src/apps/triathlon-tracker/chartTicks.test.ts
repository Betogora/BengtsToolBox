import { describe, expect, it } from 'vitest'

import {
  evenlySpacedTicks,
  evenlySpacedTimestamps,
  maxTicksForWidth,
  niceVolumeTicks,
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

  it.each([
    [0, [0, 1]],
    [Number.NaN, [0, 1]],
    [0.7, [0, 1]],
    [2.85, [0, 1, 2, 3]],
    [5.4, [0, 2, 4, 6]],
    [12, [0, 5, 10, 15]],
    [38, [0, 10, 20, 30, 40]],
  ])('teilt %f in ganze 1-2-5-Schritte', (maximum, ticks) => {
    expect(niceVolumeTicks(maximum)).toEqual(ticks)
  })
})
