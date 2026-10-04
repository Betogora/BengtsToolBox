import { describe, expect, it } from 'vitest'
import type { ActualTraining } from '@/apps/triathlon-tracker/types'
import { getPersonalRecords } from './personalRecords'

function training(overrides: Partial<ActualTraining> = {}): ActualTraining {
  return {
    id: 'run', position: 1, localDate: '2025-01-10', startMinutes: null,
    discipline: 'run', context: 'road', durationSeconds: 1_200, distanceMeters: 5_000,
    averageHeartRateBpm: null, averagePowerWatts: null, rpe: null, intervals: [],
    ...overrides,
  }
}

describe('measured personal records', () => {
  const options = { discipline: 'run', context: 'road', asOfLocalDate: '2026-10-03' } as const

  it('keeps all-time records and separates exact whole-session results from distance estimates', () => {
    const result = getPersonalRecords([
      training(),
      training({ id: 'half', distanceMeters: 21_097.5, durationSeconds: 6_000 }),
      training({ id: 'longer', distanceMeters: 5_010, durationSeconds: 900 }),
      training({ id: 'shorter', distanceMeters: 4_999, durationSeconds: 800 }),
      training({ id: 'slow', durationSeconds: 1_500 }),
      training({ id: 'tie', durationSeconds: 1_200, localDate: '2026-10-01' }),
    ], options)
    expect(result.distanceRecords).toEqual([
      { targetDistanceMeters: 1_000, record: null },
      { targetDistanceMeters: 5_000, record: { trainingId: 'run', localDate: '2025-01-10', durationSeconds: 1_200 } },
      { targetDistanceMeters: 10_000, record: null },
      { targetDistanceMeters: 21_097.5, record: { trainingId: 'half', localDate: '2025-01-10', durationSeconds: 6_000 } },
      { targetDistanceMeters: 42_195, record: null },
    ])
    expect(result.powerRecords).toEqual([])
  })

  it('excludes other contexts, structured intervals, future and retrospectively unavailable results', () => {
    const excluded = [
      training({ context: 'track' }),
      training({ intervals: [{ id: 'work', position: 1, kind: 'work', durationSeconds: 1_200, distanceMeters: 5_000, averageHeartRateBpm: null, averagePowerWatts: null }] }),
      training({ localDate: '2026-10-04' }),
      training({ analyticsAvailableFromLocalDate: '2026-10-04' }),
      training({ distanceAnalyticsAvailableFromLocalDate: '2026-10-04' }),
      training({ durationSeconds: Number.NaN }),
      training({ durationSeconds: Number.POSITIVE_INFINITY }),
      training({ durationSeconds: 0 }),
    ]
    expect(getPersonalRecords(excluded, options).distanceRecords.every((slot) => slot.record === null)).toBe(true)
    expect(getPersonalRecords([training({ context: null })], options).distanceRecords[1].record?.trainingId).toBe('run')
  })

  it('uses only complete 5- and 20-minute rides for power records and keeps metric histories independent', () => {
    const rides = [
      training({ id: 'five', discipline: 'bike', context: 'indoor', durationSeconds: 300, distanceMeters: null, averagePowerWatts: 350 }),
      training({ id: 'twenty', discipline: 'bike', context: 'indoor', durationSeconds: 1_200, averagePowerWatts: 280, distanceAnalyticsAvailableFromLocalDate: '2026-10-04' }),
      training({ id: 'longer', discipline: 'bike', context: 'indoor', durationSeconds: 1_800, averagePowerWatts: 400 }),
      training({ id: 'future-power', discipline: 'bike', context: 'indoor', durationSeconds: 300, averagePowerWatts: 450, powerAnalyticsAvailableFromLocalDate: '2026-10-04' }),
    ]
    const result = getPersonalRecords(rides, { ...options, discipline: 'bike', context: 'indoor' })
    expect(result.powerRecords).toEqual([
      { targetDurationSeconds: 300, record: { trainingId: 'five', localDate: '2025-01-10', averagePowerWatts: 350 } },
      { targetDurationSeconds: 1_200, record: { trainingId: 'twenty', localDate: '2025-01-10', averagePowerWatts: 280 } },
    ])
    expect(result.distanceRecords.every((slot) => slot.record === null)).toBe(true)
  })
})
