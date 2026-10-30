import { describe, expect, it } from 'vitest'

import { dateTimeFormat, numberFormat } from '@/lib/i18n/formatters'

describe('Intl-Formatierer-Cache', () => {
  const date = new Date('2026-10-30T12:00:00Z')

  it('verwendet Formatierer bei gleicher Sprache und gleichen Optionen wieder', () => {
    expect(dateTimeFormat('de-DE', { month: 'long' })).toBe(dateTimeFormat('de-DE', { month: 'long' }))
    expect(numberFormat('de-DE')).toBe(numberFormat('de-DE', undefined))
  })

  it('trennt Sprachen und Optionen und formatiert wie ein frischer Formatierer', () => {
    expect(dateTimeFormat('de-DE', { month: 'long' }).format(date)).toBe('Oktober')
    expect(dateTimeFormat('en-GB', { month: 'long' }).format(date)).toBe('October')
    expect(dateTimeFormat('de-DE', { month: 'short' }).format(date)).toBe(
      new Intl.DateTimeFormat('de-DE', { month: 'short' }).format(date),
    )
    expect(numberFormat('de-DE', { maximumFractionDigits: 2 }).format(1.23456)).toBe('1,23')
    expect(numberFormat('de-DE', { maximumFractionDigits: 0 }).format(1.23456)).toBe('1')
  })
})
