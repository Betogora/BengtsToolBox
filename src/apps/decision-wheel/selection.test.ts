import { describe, expect, it } from 'vitest'

import { pickWeightedWinner } from '@/apps/decision-wheel/selection'
import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'

const entries: DecisionWheelEntry[] = [
  { id: 'first', text: 'First', color: '#111111', weight: 1 },
  { id: 'second', text: 'Second', color: '#222222', weight: 3 },
]

describe('pickWeightedWinner', () => {
  it('selects entries at the weighted interval boundaries', () => {
    expect(pickWeightedWinner(entries, () => 0)?.id).toBe('first')
    expect(pickWeightedWinner(entries, () => 0.249_999)?.id).toBe('first')
    expect(pickWeightedWinner(entries, () => 0.25)?.id).toBe('second')
    expect(pickWeightedWinner(entries, () => 0.999_999)?.id).toBe('second')
  })

  it('returns no winner for an empty list', () => {
    expect(pickWeightedWinner([], () => 0.5)).toBeUndefined()
  })
})
