import type { ActualTraining } from '@/apps/triathlon-tracker/types'

export const maximumInclinePercent = 40

const restingOxygenCost = 3.5

/**
 * ACSM metabolic equations for oxygen cost in ml/kg/min. Walking is validated
 * up to about 6 km/h, running from about 8 km/h; in between both are
 * approximations. Treadmill without air resistance, no decline.
 */
export function oxygenCost(
  speedMetersPerSecond: number,
  inclinePercent: number,
  isWalk: boolean,
) {
  const metersPerMinute = speedMetersPerSecond * 60
  const grade = inclinePercent / 100
  return (
    restingOxygenCost +
    (isWalk
      ? 0.1 * metersPerMinute + 1.8 * metersPerMinute * grade
      : 0.2 * metersPerMinute + 0.9 * metersPerMinute * grade)
  )
}

/** Flat running speed with the same oxygen cost, the common continuum axis. */
export function flatRunningEquivalentSpeed(
  speedMetersPerSecond: number,
  inclinePercent: number,
  isWalk: boolean,
) {
  return (
    (oxygenCost(speedMetersPerSecond, inclinePercent, isWalk) -
      restingOxygenCost) /
    0.2 /
    60
  )
}

/** Vertical metres for a treadmill belt distance at the given incline. */
export function climbMeters(distanceMeters: number, inclinePercent: number) {
  const grade = inclinePercent / 100
  return (distanceMeters * grade) / Math.sqrt(1 + grade * grade)
}

export type TrainingIntensity = {
  metabolicEquivalent: number
  flatRunningEquivalentSpeedMetersPerSecond: number
  climbMeters: number
}

/** Intensity of a continuous walk or run; null without duration and distance. */
export function getTrainingIntensity(
  training: Pick<
    ActualTraining,
    'discipline' | 'isWalk' | 'inclinePercent' | 'durationSeconds' | 'distanceMeters'
  >,
): TrainingIntensity | null {
  const { durationSeconds, distanceMeters } = training
  if (
    training.discipline !== 'run' ||
    !durationSeconds ||
    !distanceMeters ||
    durationSeconds <= 0 ||
    distanceMeters <= 0
  ) {
    return null
  }
  const speed = distanceMeters / durationSeconds
  const incline = training.inclinePercent ?? 0
  const isWalk = training.isWalk ?? false
  return {
    metabolicEquivalent:
      oxygenCost(speed, incline, isWalk) / restingOxygenCost,
    flatRunningEquivalentSpeedMetersPerSecond: flatRunningEquivalentSpeed(
      speed,
      incline,
      isWalk,
    ),
    climbMeters: climbMeters(distanceMeters, incline),
  }
}

// Running power convention (Stryd): about 1.04 W per kg and m/s on the flat.
const runningPowerPerKilogramAndSpeed = 1.04

/**
 * Estimated running power from the flat running equivalent, so walks and
 * inclines share the scale of running power meters. Needs the body weight.
 */
export function estimateRunningPowerWatts(
  training: Parameters<typeof getTrainingIntensity>[0],
  weightKg: number | null,
): number | null {
  const intensity = getTrainingIntensity(training)
  if (!intensity || weightKg === null || weightKg <= 0) return null
  return (
    weightKg *
    intensity.flatRunningEquivalentSpeedMetersPerSecond *
    runningPowerPerKilogramAndSpeed
  )
}
