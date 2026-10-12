import { describe, expect, it } from 'vitest'

import type { ActualTraining } from '@/apps/triathlon-tracker/types'
import { getEfficiencyTrend } from './efficiency'

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
})
