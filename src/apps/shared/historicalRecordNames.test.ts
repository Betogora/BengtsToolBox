import { describe, expect, it } from 'vitest'

import {
  getGeneratedScoreboardBaseName,
  getGeneratedDatasetBaseName,
  sequenceHistoricalRecordNames,
  toRomanNumeral,
} from '@/apps/shared/historicalRecordNames'

type Record = {
  id: string
  name: string
  position: number
  timestamp: string
}

function sequence(records: Record[]) {
  return sequenceHistoricalRecordNames(records, {
    getGeneratedBaseName: (record, date) => {
      return getGeneratedDatasetBaseName(record.name, date)
    },
    getTimestamp: (record) => record.timestamp,
  })
}

describe('historical record names', () => {
  it('recognizes and normalizes legacy Scoreboard times', () => {
    const date = new Date(2026, 6, 13, 12, 34)

    expect(getGeneratedScoreboardBaseName('Scoring 13.07.26, 12:34', date)).toBe(
      'Scoring 13.07.26',
    )
    expect(getGeneratedScoreboardBaseName('Sommerfest', date)).toBeNull()
  })

  it('leaves a single generated record without a suffix and removes its legacy time', () => {
    const [record] = sequence([
      {
        id: 'one',
        name: 'Datensatz 2026-07-13 12:34',
        position: 1,
        timestamp: new Date(2026, 6, 13, 12, 34).toISOString(),
      },
    ])

    expect(record.name).toBe('Datensatz 2026-07-13')
  })

  it('numbers same-day records chronologically and resets on the next day', () => {
    const records = sequence([
      {
        id: 'third',
        name: 'Datensatz 2026-07-13 18:00',
        position: 3,
        timestamp: new Date(2026, 6, 13, 18).toISOString(),
      },
      {
        id: 'first',
        name: 'Datensatz 2026-07-13 09:00',
        position: 1,
        timestamp: new Date(2026, 6, 13, 9).toISOString(),
      },
      {
        id: 'next-day',
        name: 'Datensatz 2026-07-14 09:00',
        position: 4,
        timestamp: new Date(2026, 6, 14, 9).toISOString(),
      },
      {
        id: 'second',
        name: 'Datensatz 2026-07-13 12:00',
        position: 2,
        timestamp: new Date(2026, 6, 13, 12).toISOString(),
      },
    ])

    expect(records.map(({ id, name }) => [id, name])).toEqual([
      ['third', 'Datensatz 2026-07-13 III'],
      ['first', 'Datensatz 2026-07-13 I'],
      ['next-day', 'Datensatz 2026-07-14'],
      ['second', 'Datensatz 2026-07-13 II'],
    ])
  })

  it('uses position and id as stable fallbacks for equal timestamps', () => {
    const timestamp = new Date(2026, 6, 13, 12).toISOString()
    const records = sequence([
      { id: 'b', name: 'Datensatz 2026-07-13', position: 2, timestamp },
      { id: 'c', name: 'Datensatz 2026-07-13', position: 1, timestamp },
      { id: 'a', name: 'Datensatz 2026-07-13', position: 1, timestamp },
    ])

    expect(records.map(({ id, name }) => [id, name])).toEqual([
      ['b', 'Datensatz 2026-07-13 III'],
      ['c', 'Datensatz 2026-07-13 II'],
      ['a', 'Datensatz 2026-07-13 I'],
    ])
  })

  it('preserves manual names while they still occupy their chronological position', () => {
    const records = sequence([
      {
        id: 'manual',
        name: 'Sommerfest',
        position: 1,
        timestamp: new Date(2026, 6, 13, 9).toISOString(),
      },
      {
        id: 'automatic',
        name: 'Datensatz 2026-07-13 12:00',
        position: 2,
        timestamp: new Date(2026, 6, 13, 12).toISOString(),
      },
    ])

    expect(records.map(({ name }) => name)).toEqual([
      'Sommerfest',
      'Datensatz 2026-07-13 II',
    ])
  })

  it('is idempotent and supports subtractive Roman notation', () => {
    const records = sequence([
      {
        id: 'one',
        name: 'Datensatz 2026-07-13 I',
        position: 1,
        timestamp: new Date(2026, 6, 13, 9).toISOString(),
      },
      {
        id: 'two',
        name: 'Datensatz 2026-07-13 II',
        position: 2,
        timestamp: new Date(2026, 6, 13, 12).toISOString(),
      },
    ])

    expect(sequence(records)).toEqual(records)
    expect([1, 4, 9, 14].map(toRomanNumeral)).toEqual(['I', 'IV', 'IX', 'XIV'])
    expect(toRomanNumeral(0)).toBe('')
  })
})
