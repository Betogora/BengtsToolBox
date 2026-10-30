import { describe, expect, it } from 'vitest'

import {
  addDaysToLocalDate,
  addMonthsToLocalDate,
  getCurrentLocalDate,
  getIsoWeekNumber,
  getRollingMonthWindowStart,
  getWeekLocalDates,
  getWeekStartLocalDate,
  isInLocalDateWindow,
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
    const windowStart = getRollingMonthWindowStart('2026-08-22')

    expect(isInLocalDateWindow('2025-08-22', windowStart, '2026-08-22')).toBe(true)
    expect(isInLocalDateWindow('2025-08-21', windowStart, '2026-08-22')).toBe(false)
    expect(isInLocalDateWindow('2026-08-23', windowStart, '2026-08-22')).toBe(false)
  })

  it.each([
    ['2026-10-12', 42], ['2026-11-22', 47], ['2026-12-28', 53],
    ['2027-01-03', 53], ['2027-01-04', 1], ['2025-12-29', 1],
  ])('ordnet %s der Kalenderwoche %i zu', (date, week) => {
    expect(getIsoWeekNumber(date)).toBe(week)
  })
})
