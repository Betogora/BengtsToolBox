import { describe, expect, it } from 'vitest'

import type {
  ActualTraining,
  PlannedTraining,
  TrackerSettings,
} from '@/apps/triathlon-tracker/types'
import {
  averagePaceSeconds,
  durationSecondsFromAveragePace,
  formatPace,
  parsePace,
} from './units'
import {
  validateActualTraining,
  validatePlannedTraining,
  validateSettings,
} from './validation'
import { summarizeWeek, summarizeWeeks } from './weeklyStats'

function actual(
  overrides: Partial<ActualTraining> = {},
): ActualTraining {
  return {
    id: 'actual-1',
    position: 1,
    localDate: '2026-08-17',
    startMinutes: 390,
    discipline: 'run',
    context: 'road',
    durationSeconds: 1_800,
    distanceMeters: 5_000,
    averageHeartRateBpm: 150,
    averagePowerWatts: null,
    rpe: 7,
    intervals: [],
    ...overrides,
  }
}

const plan: PlannedTraining = {
  id: 'plan-1',
  position: 1,
  localDate: '2026-08-18',
  startMinutes: null,
  discipline: 'swim',
  durationSeconds: null,
  distanceMeters: 1_500,
  label: 'Technik',
}

const settings: TrackerSettings = {
  schemaVersion: 1,
  weightKg: 84,
}

describe('average pace', () => {
  it('derives running duration and pace from the distance', () => {
    expect(formatPace(averagePaceSeconds(2_700, 10_000, 'run'))).toBe('4:30')
    expect(durationSecondsFromAveragePace(300, 10_000, 'run')).toBe(3_000)
  })

  it('uses 100 meters as the swimming reference', () => {
    expect(formatPace(averagePaceSeconds(1_575, 1_500, 'swim'))).toBe('1:45')
    expect(durationSecondsFromAveragePace(105, 1_500, 'swim')).toBe(1_575)
  })

  it('accepts clock notation and rejects incomplete values', () => {
    expect(parsePace('5:07')).toBe(307)
    expect(parsePace('5:7')).toBeNull()
    expect(parsePace('5:60')).toBeNull()
  })
})

describe('tracker validation', () => {
  it('accepts the compact valid contracts', () => {
    expect(validateSettings(settings)).toEqual([])
    expect(validatePlannedTraining(plan)).toEqual([])
    expect(validateActualTraining(actual())).toEqual([])
    expect(validateActualTraining(actual({ context: null }))).toEqual([])
    expect(validateSettings({ ...settings, weightKg: 350 })).toContainEqual({
      field: 'weightKg',
      code: 'out-of-range',
      severity: 'error',
    })
  })

  it('requires duration or distance and a matching sport context', () => {
    const issues = validateActualTraining(actual({
      durationSeconds: 0,
      distanceMeters: null,
      context: 'pool-25',
    }))

    expect(issues).toEqual(expect.arrayContaining([
      { field: 'training', code: 'required', severity: 'error' },
      { field: 'context', code: 'context-mismatch', severity: 'error' },
    ]))
  })

  it('warns instead of rewriting mismatching interval totals', () => {
    const training = actual({
      intervals: [{
        id: 'segment-1',
        position: 1,
        kind: 'work',
        durationSeconds: 600,
        distanceMeters: 2_000,
        averageHeartRateBpm: null,
        averagePowerWatts: null,
      }],
    })

    expect(validateActualTraining(training)).toContainEqual({
      field: 'intervals',
      code: 'interval-sum-mismatch',
      severity: 'warning',
    })
    expect(training.durationSeconds).toBe(1_800)
  })
})

describe('tracker week statistics', () => {
  const trainings = [
    actual(),
    actual({
      id: 'actual-2',
      position: 2,
      localDate: '2026-08-23',
      discipline: 'bike',
      context: 'outdoor',
      durationSeconds: 3_600,
      distanceMeters: 30_000,
    }),
    actual({ id: 'actual-next-week', localDate: '2026-08-24' }),
  ]

  it('aggregates Monday through Sunday and fills empty weeks', () => {
    expect(summarizeWeek(trainings, '2026-08-20')).toMatchObject({
      weekStart: '2026-08-17',
      totalTrainingCount: 2,
      totalDurationSeconds: 5_400,
      byDiscipline: {
        run: { trainingCount: 1, durationSeconds: 1_800, distanceMeters: 5_000 },
        bike: { trainingCount: 1, durationSeconds: 3_600, distanceMeters: 30_000 },
      },
    })
    expect(summarizeWeeks([], '2026-08-17', '2026-08-30')).toHaveLength(2)
  })
})
