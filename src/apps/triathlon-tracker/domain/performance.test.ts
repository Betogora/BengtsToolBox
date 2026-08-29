import { describe, expect, it } from 'vitest'

import type {
  ActualTraining,
  Discipline,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import {
  analyzeBike,
  analyzeRun,
  analyzeSwim,
  calculateDisciplineProgressIndex,
  calculateOverallProgressIndex,
  getDistanceActivityPerformancePoints,
  getPowerActivityPerformancePoints,
} from './performance'

function performance(
  id: string,
  discipline: Discipline,
  context: TrainingContext,
  durationSeconds: number,
  distanceMeters: number,
  averagePowerWatts: number | null = null,
): ActualTraining {
  return {
    id,
    position: Number(id.replace(/\D/g, '')) || 1,
    localDate: `2026-08-${(10 + (Number(id.replace(/\D/g, '')) || 1)).toString().padStart(2, '0')}`,
    startMinutes: null,
    discipline,
    context,
    durationSeconds,
    distanceMeters,
    averageHeartRateBpm: null,
    averagePowerWatts,
    rpe: null,
    intervals: [],
  }
}

describe('running performance', () => {
  it('fits known critical-speed data and predicts 5 km and 10 km', () => {
    const trainings: ActualTraining[] = [
      performance('run-1', 'run', 'road', 300, 1_400),
      performance('run-2', 'run', 'road', 600, 2_600),
      performance('run-3', 'run', 'road', 1_200, 5_000),
      performance('old', 'run', 'road', 250, 5_000),
      performance('slower-5', 'run', 'road', 1_400, 5_000),
      performance('future-6', 'run', 'road', 900, 10_000),
      {
        ...performance('interval-7', 'run', 'road', 200, 5_000),
        intervals: [{
          id: 'work', position: 1, kind: 'work', durationSeconds: 200,
          distanceMeters: 5_000, averageHeartRateBpm: null,
          averagePowerWatts: null,
        }],
      },
    ]
    trainings[3].localDate = '2025-08-21'
    trainings[5].localDate = '2026-08-23'

    const result = analyzeRun(trainings, {
      context: 'road',
      asOfLocalDate: '2026-08-22',
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.model).toBe('critical-speed')
    expect(result.anchorIds).toEqual(['run-1', 'run-2', 'run-3'])
    expect(result.estimates).toEqual([
      { targetDistanceMeters: 5_000, predictedDurationSeconds: 1_200 },
      { targetDistanceMeters: 10_000, predictedDurationSeconds: 2_450 },
    ])
  })

  it('does not mix contexts or project long runs from short-only data', () => {
    const result = analyzeRun([
      performance('run-1', 'run', 'road', 300, 1_400),
      performance('run-2', 'run', 'road', 600, 2_600),
      performance('run-3', 'run', 'track', 1_200, 5_000),
    ], { context: 'road', asOfLocalDate: '2026-08-22' })

    expect(result).toEqual({
      status: 'insufficient-data',
      availableAnchors: 0,
      requiredAnchors: 1,
    })
  })

  it('projects 5 km from one 10 km run and counts repeated efforts as support', () => {
    const fastest = {
      ...performance('run-1', 'run', 'road', 2_700, 10_000),
      averageHeartRateBpm: 172,
      context: null,
    }
    const confirmation = {
      ...performance('run-2', 'run', 'road', 3_000, 10_000),
      averageHeartRateBpm: 145,
      context: null,
    }
    const result = analyzeRun([
      fastest,
      confirmation,
      performance('run-3', 'run', 'track', 2_500, 10_000),
    ], { context: 'road', asOfLocalDate: '2026-08-22' })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.model).toBe('power-law')
    expect(result.powerLawExponent).toBe(1.06)
    expect(result.anchorIds).toEqual(['run-1'])
    expect(result.supportingTrainingCount).toBe(2)
    expect(result.estimates).toEqual([
      {
        targetDistanceMeters: 5_000,
        predictedDurationSeconds: expect.closeTo(2_700 * 0.5 ** 1.06, 8),
      },
      { targetDistanceMeters: 10_000, predictedDurationSeconds: 2_700 },
    ])
  })

  it('does not leak a backdated activity into an earlier model snapshot', () => {
    const backdated = performance('run-3', 'run', 'road', 1_200, 5_000)
    backdated.localDate = '2026-08-10'
    backdated.analyticsAvailableFromLocalDate = '2026-08-23'

    const result = analyzeRun([
      performance('run-1', 'run', 'road', 300, 1_400),
      performance('run-2', 'run', 'road', 600, 2_600),
      backdated,
    ], { context: 'road', asOfLocalDate: '2026-08-22' })

    expect(result).toEqual({
      status: 'insufficient-data',
      availableAnchors: 0,
      requiredAnchors: 1,
    })
  })

  it('keeps distance history when only an unused power value was edited', () => {
    const editedPower = performance('run-3', 'run', 'road', 1_200, 5_000)
    editedPower.powerAnalyticsAvailableFromLocalDate = '2026-08-23'

    const result = analyzeRun([
      performance('run-1', 'run', 'road', 300, 1_400),
      performance('run-2', 'run', 'road', 600, 2_600),
      editedPower,
    ], { context: 'road', asOfLocalDate: '2026-08-22' })

    expect(result.status).toBe('ready')
  })

  it('keeps eligible activity points visible without enough model anchors', () => {
    const first = performance('run-1', 'run', 'road', 600, 2_500)
    const second = performance('run-2', 'run', 'road', 1_200, 5_000)
    const unavailable = performance('run-3', 'run', 'road', 1_800, 7_500)
    unavailable.analyticsAvailableFromLocalDate = '2026-08-23'

    const points = getDistanceActivityPerformancePoints(
      [first, second, unavailable],
      {
        discipline: 'run',
        context: 'road',
        fromLocalDate: '2026-08-01',
        asOfLocalDate: '2026-08-22',
      },
    )
    expect(points.map((point) => point.activityId)).toEqual(['run-1', 'run-2'])
    expect(points[0].speedKilometersPerHour).toBeCloseTo(15, 8)
    expect(points[1].speedKilometersPerHour).toBeCloseTo(15, 8)
  })
})

describe('swimming performance', () => {
  it('uses CSS only for a matching pool context and keeps a third anchor', () => {
    const result = analyzeSwim([
      performance('swim-1', 'swim', 'pool-25', 120, 200),
      performance('swim-2', 'swim', 'pool-25', 260, 400),
      performance('swim-3', 'swim', 'pool-25', 520, 750),
      performance('swim-4', 'swim', 'pool-50', 450, 750),
    ], { context: 'pool-25', asOfLocalDate: '2026-08-22' })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.model).toBe('critical-swim-speed')
    expect(result.estimates[0].predictedDurationSeconds).toBeCloseTo(505, 6)
    expect(result.anchorIds).toHaveLength(3)
  })
})

describe('cycling performance', () => {
  it('fits CP and W-prime and derives W/kg only with a weight', () => {
    const cp = 250
    const workCapacity = 20_000
    const trainings = [180, 600, 1_200].map((duration, index) =>
      performance(
        `bike-${index + 1}`,
        'bike',
        'indoor',
        duration,
        duration * 10,
        cp + workCapacity / duration,
      ),
    )
    const result = analyzeBike(trainings, {
      context: 'indoor',
      asOfLocalDate: '2026-08-22',
      weightKg: 80,
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready' || result.model !== 'critical-power') return
    expect(result.criticalPowerWatts).toBeCloseTo(250, 8)
    expect(result.workCapacityJoules).toBeCloseTo(20_000, 8)
    expect(result.criticalPowerWattsPerKg).toBeCloseTo(3.125, 8)
    expect(getPowerActivityPerformancePoints(trainings, {
      context: 'indoor',
      fromLocalDate: '2026-08-01',
      asOfLocalDate: '2026-08-22',
    })).toHaveLength(3)
  })

  it('falls back to an individual distance-time model without power data', () => {
    const result = analyzeBike([
      performance('bike-1', 'bike', 'outdoor', 900, 10_000),
      performance('bike-2', 'bike', 'outdoor', 1_880, 20_000),
      performance('bike-3', 'bike', 'outdoor', 3_920, 40_000),
    ], {
      context: 'outdoor',
      asOfLocalDate: '2026-08-22',
      weightKg: null,
    })

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.model).toBe('power-law')
    if (result.model === 'power-law') {
      expect(result.estimates.map((estimate) => estimate.targetDistanceMeters))
        .toEqual([20_000, 40_000])
    }
  })
})

describe('progress indices', () => {
  it('uses direction-aware baselines and a geometric total', () => {
    const run = calculateDisciplineProgressIndex(1_500, 1_350, false)
    const swim = calculateDisciplineProgressIndex(600, 540, false)
    const bike = calculateDisciplineProgressIndex(250, 275, true)
    expect(run).toBeCloseTo(111.111, 3)
    expect(calculateOverallProgressIndex({ swim, bike, run })).toBeCloseTo(
      Math.cbrt(swim! * bike! * run!),
      8,
    )
    expect(calculateOverallProgressIndex({ swim, bike: null, run })).toBeNull()
  })
})
