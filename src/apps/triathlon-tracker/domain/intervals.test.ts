import { describe, expect, it } from 'vitest'

import {
  buildIntervalScheme,
  insertIntervalPair,
  intervalDistanceMeters,
  intervalPhaseAt,
  intervalSpeedKilometersPerHour,
  intervalTotals,
  plannedIntervalScheme,
  removeIntervalPhase,
} from './intervals'

const minutes = (value: number) => value * 60

describe('alternating interval phases', () => {
  it('builds an asymmetric session from a scheme', () => {
    const durations = buildIntervalScheme({
      warmUpSeconds: minutes(10),
      repetitions: 3,
      workSeconds: minutes(4),
      recoverySeconds: minutes(4),
      coolDownSeconds: minutes(5),
    })

    expect(durations.map((seconds) => seconds / 60)).toEqual([10, 4, 4, 4, 4, 4, 5])
    expect(durations.map((_, index) => intervalPhaseAt(index, durations.length))).toEqual([
      'warm-up', 'work', 'recovery', 'work', 'recovery', 'work', 'cool-down',
    ])
    expect(durations.reduce((sum, seconds) => sum + seconds, 0)).toBe(minutes(35))
  })

  it('ends on the last interval without a cool-down', () => {
    const durations = buildIntervalScheme({
      warmUpSeconds: minutes(20),
      repetitions: 2,
      workSeconds: 20,
      recoverySeconds: 60,
      coolDownSeconds: 0,
    })

    expect(durations).toEqual([minutes(20), 20, 60, 20])
    expect(intervalPhaseAt(3, durations.length)).toBe('work')
  })

  it.each([
    ['Intervalle 3×4 min', minutes(35), [3, 240, 240]],
    ['Intervalle 4×5 min', minutes(42), [4, 300, 150]],
    ['Intervalle 3×12 min', minutes(65), [3, 720, 420]],
    ['Intervalle 2x6 min', null, [2, 360, 360]],
  ] as const)(
    'reads the plan label %s and fits the recovery',
    (label, duration, [repetitions, workSeconds, recoverySeconds]) => {
      expect(plannedIntervalScheme(label, duration)).toEqual({
        warmUpSeconds: minutes(10),
        repetitions,
        workSeconds,
        recoverySeconds,
        coolDownSeconds: minutes(5),
      })
    },
  )

  it.each([
    ['Schwelle 3×8 min', minutes(52), 'threshold', [480, 90, 600]],
    ['Schwelle 2×15 min', null, 'threshold', [900, 180, 600]],
    ['VO2max 4×4 min', minutes(50), 'vo2max', [240, 180, 600]],
    // A short plan still keeps five minutes to cool down.
    ['VO2max 3×4 min', minutes(35), 'vo2max', [240, 180, 300]],
  ] as const)(
    'rests %s by its purpose',
    (label, duration, intensity, [workSeconds, recoverySeconds, coolDownSeconds]) => {
      expect(plannedIntervalScheme(label, duration, intensity)).toMatchObject({
        warmUpSeconds: minutes(15),
        workSeconds,
        recoverySeconds,
        coolDownSeconds,
      })
    },
  )

  it('ignores plans without an interval scheme', () => {
    expect(plannedIntervalScheme('Long Run', minutes(45))).toBeNull()
    expect(plannedIntervalScheme('Deload · locker', minutes(30))).toBeNull()
  })

  it('adds spontaneous intervals before the cool-down and copies durations', () => {
    const phases = ['E10', 'W4', 'R3', 'W4', 'C5']
    const added = insertIntervalPair(phases, (kind, template) =>
      `${kind}:${template ?? '-'}`,
    )

    expect(added).toEqual(['E10', 'W4', 'R3', 'W4', 'rest:R3', 'work:W4', 'C5'])
    expect(
      insertIntervalPair(['E10', 'W4', 'R3', 'W4'], (kind, template) => `${kind}:${template}`),
    ).toEqual(['E10', 'W4', 'R3', 'W4', 'rest:R3', 'work:W4'])
    expect(
      insertIntervalPair(['E10', 'W4', 'C5'], (kind, template) => `${kind}:${template}`),
    ).toEqual(['E10', 'W4', 'rest:W4', 'work:W4', 'C5'])
    expect(insertIntervalPair(['E10'], (kind) => kind)).toEqual(['E10', 'work', 'rest'])
  })

  it('removes phases without breaking the alternation', () => {
    const phases = ['E', 'W1', 'R1', 'W2', 'R2', 'W3', 'C']

    expect(removeIntervalPhase(phases, 3)).toEqual(['E', 'W1', 'R2', 'W3', 'C'])
    expect(removeIntervalPhase(phases, 1)).toEqual(['E', 'W2', 'R2', 'W3', 'C'])
    expect(removeIntervalPhase(phases, 6)).toEqual(['E', 'W1', 'R1', 'W2', 'R2', 'W3'])
    expect(removeIntervalPhase(phases, 0)).toEqual(phases)
    expect(removeIntervalPhase(phases, 2)).toEqual(phases)
    expect(removeIntervalPhase(['E', 'W1', 'C'], 1)).toEqual(['E'])
  })
})

describe('interval speeds and totals', () => {
  it('derives distances from km/h and reads them back', () => {
    const distance = intervalDistanceMeters(240, 13)

    expect(distance).toBe(866.7)
    expect(intervalSpeedKilometersPerHour({ durationSeconds: 240, distanceMeters: distance })).toBe(13)
    expect(intervalDistanceMeters(60, 0)).toBe(0)
    expect(intervalDistanceMeters(60, null)).toBeNull()
  })

  it('sums the distance only when every phase has one', () => {
    const complete = intervalTotals([
      { durationSeconds: 600, distanceMeters: 1_500 },
      { durationSeconds: 240, distanceMeters: 866.7 },
    ])
    expect(complete.durationSeconds).toBe(840)
    expect(complete.distanceMeters).toBeCloseTo(2_366.7)
    expect(intervalTotals([
      { durationSeconds: 600, distanceMeters: 1_500 },
      { durationSeconds: 240, distanceMeters: null },
    ])).toEqual({ durationSeconds: 840, distanceMeters: null })
  })
})
