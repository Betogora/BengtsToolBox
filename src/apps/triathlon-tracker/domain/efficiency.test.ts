import { describe, expect, it } from 'vitest'

import type { ActualTraining } from '@/apps/triathlon-tracker/types'
import { getEfficiencyTrend, steadyStateHeartRate } from './efficiency'
import { flatRunningEquivalentSpeed } from './incline'

function run(
  id: string,
  localDate: string,
  durationSeconds: number,
  distanceMeters: number,
  averageHeartRateBpm: number | null,
): ActualTraining {
  return {
    id,
    position: 1,
    localDate,
    startMinutes: null,
    discipline: 'run',
    context: 'road',
    durationSeconds,
    distanceMeters,
    averageHeartRateBpm,
    averagePowerWatts: null,
    rpe: null,
    intervals: [],
  }
}

  // Phases as [seconds, km/h, end heart rate]; kinds alternate.
  const session = (
    id: string,
    localDate: string,
    phases: [number, number, number][],
  ): ActualTraining => {
    const intervals = phases.map(([seconds, speed, endHeartRateBpm], index) => ({
      id: `${id}-${index}`,
      position: index + 1,
      kind: index % 2 ? ('work' as const) : ('rest' as const),
      durationSeconds: seconds,
      distanceMeters: (seconds * speed) / 3.6,
      averageHeartRateBpm: null,
      averagePowerWatts: null,
      endHeartRateBpm,
    }))
    return {
      ...run(id, localDate, 0, 0, null),
      durationSeconds: phases.reduce((sum, [seconds]) => sum + seconds, 0),
      distanceMeters: intervals.reduce((sum, phase) => sum + phase.distanceMeters, 0),
      intervals,
    }
  }

const options = {
  discipline: 'run' as const,
  context: 'road' as const,
  fromLocalDate: '2026-09-01',
  asOfLocalDate: '2026-10-10',
}

describe('pace at equal heart rate', () => {
  it('scales each session to the median heart rate and averages a 28-day trend', () => {
    const trend = getEfficiencyTrend(
      [
        // 3.0 m/s at 150 bpm and 2.8 m/s at 140 bpm share one efficiency.
        run('a', '2026-09-01', 3_000, 9_000, 150),
        run('b', '2026-09-10', 2_500, 7_000, 140),
        // 3.2 m/s at 145 bpm is more efficient.
        run('c', '2026-10-05', 2_500, 8_000, 145),
      ],
      options,
    )

    expect(trend?.referenceHeartRateBpm).toBe(145)
    expect(trend?.points.map((point) => point.activityId)).toEqual(['a', 'b', 'c'])
    expect(trend?.points[0].normalizedSpeedMetersPerSecond).toBeCloseTo(2.9)
    expect(trend?.points[1].normalizedSpeedMetersPerSecond).toBeCloseTo(2.9)
    expect(trend?.points[2].normalizedSpeedMetersPerSecond).toBeCloseTo(3.2)
    expect(trend?.points[1].trendSpeedMetersPerSecond).toBeCloseTo(2.9)
    // Session a (09-01) lies outside the 28-day window of 10-05.
    expect(trend?.points[2].trendSpeedMetersPerSecond).toBeCloseTo((2.9 + 3.2) / 2)
  })

  it('ignores walks, intervals, short sessions and sessions without heart rate', () => {
    const intervalRun = run('interval', '2026-09-05', 1_800, 6_000, 160)
    intervalRun.intervals = [
      {
        id: 'work',
        position: 1,
        kind: 'work',
        durationSeconds: 1_800,
        distanceMeters: 6_000,
        averageHeartRateBpm: 160,
        averagePowerWatts: null,
      },
    ]
    const trend = getEfficiencyTrend(
      [
        { ...run('walk', '2026-09-02', 3_600, 6_000, 110), isWalk: true },
        intervalRun,
        run('short', '2026-09-03', 300, 1_000, 150),
        run('no-hr', '2026-09-04', 1_800, 5_000, null),
      ],
      options,
    )

    expect(trend).toBeNull()
  })

  it('keeps the reference heart rate stable when the visible range shrinks', () => {
    const trainings = [
      run('early', '2026-06-01', 3_000, 8_000, 120),
      run('late', '2026-10-01', 3_000, 9_000, 160),
    ]
    const full = getEfficiencyTrend(trainings, { ...options, fromLocalDate: '2026-01-01' })
    const recent = getEfficiencyTrend(trainings, options)

    expect(recent?.referenceHeartRateBpm).toBe(full?.referenceHeartRateBpm)
    expect(recent?.points.map((point) => point.activityId)).toEqual(['late'])
  })

  it('führt Gehen als eigene Kurve und rechnet Steigung in Lauf-Äquivalent um', () => {
    const treadmill = { ...options, context: 'treadmill' as const }
    const inclined = (id: string, isWalk: boolean, incline: number) => ({
      ...run(id, '2026-09-10', 3_600, 6_000, 150),
      context: 'treadmill' as const,
      isWalk,
      inclinePercent: incline,
    })
    const trainings = [inclined('walk', true, 10), inclined('hill-run', false, 5)]
    const walking = getEfficiencyTrend(trainings, { ...treadmill, isWalk: true })
    expect(walking?.points.map((point) => point.activityId)).toEqual(['walk'])
    expect(walking!.points[0].speedMetersPerSecond * 3.6).toBeCloseTo(8.4)
    const running = getEfficiencyTrend(trainings, treadmill)
    expect(running?.points.map((point) => point.activityId)).toEqual(['hill-run'])
    expect(running!.points[0].speedMetersPerSecond * 3.6).toBeCloseTo(7.35)
  })

  it('schätzt den Gleichgewichtspuls aus Endpuls und Phasendauer', () => {
    expect(steadyStateHeartRate(150, 100, 60)).toBeCloseTo(179.1, 1)
    // After four minutes the end value is practically settled.
    expect(steadyStateHeartRate(185, 145, 240)).toBeCloseTo(185.7, 1)
    expect(steadyStateHeartRate(145, null, 600)).toBe(145)
    expect(steadyStateHeartRate(160, null, 60)).toBeNull()
  })

  it('vergleicht Intervalleinheiten verschiedener Schemata über ihre Pulsgerade', () => {
    const threeByFour = session('3x4', '2026-09-20', [
      [600, 9, 145], [240, 13, 185], [240, 9, 150],
      [240, 13, 186], [240, 9, 151], [240, 13, 187], [300, 9, 140],
    ])
    // Longer intervals, same heart rates at higher speeds: fitter.
    const threeByTwelve = session('3x12', '2026-10-01', [
      [600, 9.5, 145], [720, 13.5, 185], [420, 9.5, 150],
      [720, 13.5, 186], [420, 9.5, 151], [720, 13.5, 187], [300, 9.5, 140],
    ])
    // 30/30 phases are too short for their end heart rate.
    const thirtyThirty = session('30-30', '2026-10-02', [
      [600, 9, 145], [30, 16, 170], [30, 8, 160], [30, 16, 175],
    ])
    const trend = getEfficiencyTrend(
      [run('easy', '2026-09-15', 3_000, 7_500, 150), threeByFour, threeByTwelve, thirtyThirty],
      options,
    )

    expect(trend?.referenceHeartRateBpm).toBe(150)
    const byId = Object.fromEntries(trend!.points.map((point) => [point.activityId, point]))
    expect(Object.keys(byId)).toEqual(['easy', '3x4', '3x12'])
    expect(byId['3x4'].source).toBe('intervals')
    // At 150 bpm the 3×4 session runs near its easy speed of 2.5 m/s.
    expect(byId['3x4'].normalizedSpeedMetersPerSecond).toBeGreaterThan(2.5)
    expect(byId['3x4'].normalizedSpeedMetersPerSecond).toBeLessThan(2.8)
    expect(byId['3x12'].normalizedSpeedMetersPerSecond).toBeGreaterThan(
      byId['3x4'].normalizedSpeedMetersPerSecond,
    )
    // The detail shows the intervals themselves.
    expect(byId['3x4'].speedMetersPerSecond * 3.6).toBeCloseTo(13)
    expect(byId['3x4'].averageHeartRateBpm).toBe(187)
  })

  it('rechnet Gehpausen in Laufintervallen als Gehen um', () => {
    // A walked warm-up at 6 km/h and a run at 12 km/h, both settled.
    const trend = getEfficiencyTrend(
      [session('walk-run', '2026-09-20', [[600, 6, 110], [600, 12, 170]])],
      options,
    )
    const walked = flatRunningEquivalentSpeed(6 / 3.6, 0, true)
    const ran = 12 / 3.6

    expect(trend?.referenceHeartRateBpm).toBe(140)
    // 140 bpm lies halfway between both phases on the heart-rate line.
    expect(trend?.points[0].normalizedSpeedMetersPerSecond).toBeCloseTo(
      (walked + ran) / 2,
    )
  })

  it('gewichtet den Trend nach Dauer und dämpft Ausreißer', () => {
    const trend = getEfficiencyTrend(
      [
        run('long-1', '2026-09-20', 3_600, 10_800, 150),
        run('long-2', '2026-09-21', 3_600, 10_800, 150),
        // 50 % faster at the same pulse: a faulty strap rather than form.
        run('outlier', '2026-09-22', 600, 2_700, 150),
      ],
      options,
    )
    const latest = trend!.points.at(-1)!

    expect(latest.normalizedSpeedMetersPerSecond).toBeCloseTo(4.5)
    expect(latest.trendSpeedMetersPerSecond).toBeGreaterThan(3)
    expect(latest.trendSpeedMetersPerSecond).toBeLessThan(3.05)
  })

  it('zählt mit Ruhepuls nur die Pulsreserve', () => {
    // Resting 60, 6 km/h at 130 and 12 km/h at 195: the same fitness.
    const trainings = [
      run('slow', '2026-09-20', 1_800, 3_000, 130),
      run('fast', '2026-09-21', 1_800, 6_000, 195),
    ]
    const spread = (restingHeartRateBpm: number | null) => {
      const [slow, fast] = getEfficiencyTrend(trainings, {
        ...options,
        restingHeartRateBpm,
      })!.points
      return fast.normalizedSpeedMetersPerSecond / slow.normalizedSpeedMetersPerSecond - 1
    }

    expect(spread(null)).toBeGreaterThan(0.3)
    expect(spread(60)).toBeLessThan(0.05)
  })
})
