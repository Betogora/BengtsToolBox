import { describe, expect, it } from 'vitest'

import {
  getEntryDisplayText,
  getRenderableWheelEntries,
  parseWeightDraft,
} from '@/apps/decision-wheel/utils'

describe('decision wheel utilities', () => {
  it('uses trimmed labels and a numbered fallback', () => {
    expect(getEntryDisplayText({ text: '  Alpha  ' }, 0)).toBe('Alpha')
    expect(getEntryDisplayText({ text: '   ' }, 2)).toBe('Option 3')
  })

  it('accepts positive weight drafts and rounds them', () => {
    expect(parseWeightDraft('2.6')).toBe(3)
    expect(parseWeightDraft('0')).toBeNull()
    expect(parseWeightDraft('not-a-number')).toBeNull()
  })

  it('omits entries with invalid current or draft weights', () => {
    const entries = [
      { id: 'a', text: 'A', color: '#111111', weight: 1 },
      { id: 'b', text: 'B', color: '#222222', weight: 0 },
      { id: 'c', text: 'C', color: '#333333', weight: 3 },
    ]

    expect(getRenderableWheelEntries(entries, { a: '2', c: '' })).toEqual([
      { ...entries[0], weight: 2 },
    ])
  })
})
