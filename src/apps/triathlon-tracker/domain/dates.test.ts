import { describe, expect, it } from 'vitest'

import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
  getWeekLocalDates,
  getWeekStartLocalDate,
  isInRollingMonthWindow,
  isValidLocalDate,
} from './dates'

describe('tracker calendar dates', () => {
  it('uses Europe/Berlin for the current local date', () => {
    expect(getCurrentLocalDate(new Date('2026-03-29T22:30:00.000Z'))).toBe(
      '2026-03-30',
    )
  })

  it('uses Monday as week start across a daylight-saving boundary', () => {
    expect(getWeekStartLocalDate('2026-03-29')).toBe('2026-03-23')
    expect(addDaysToLocalDate('2026-03-29', 1)).toBe('2026-03-30')
    expect(getWeekLocalDates('2026-03-29')).toEqual([
      '2026-03-23',
      '2026-03-24',
      '2026-03-25',
      '2026-03-26',
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
    ])
  })

  it('clamps month shifts and validates real calendar dates', () => {
    expect(addMonthsToLocalDate('2024-03-31', -1)).toBe('2024-02-29')
    expect(isValidLocalDate('2026-02-29')).toBe(false)
    expect(isValidLocalDate('2024-02-29')).toBe(true)
  })

  it('defines a closed rolling twelve-month window without future data', () => {
    expect(isInRollingMonthWindow('2025-08-22', '2026-08-22')).toBe(true)
    expect(isInRollingMonthWindow('2025-08-21', '2026-08-22')).toBe(false)
    expect(isInRollingMonthWindow('2026-08-23', '2026-08-22')).toBe(false)
  })
})
