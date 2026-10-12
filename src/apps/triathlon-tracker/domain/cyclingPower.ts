import type { ActualTraining } from '@/apps/triathlon-tracker/types'

// Flat-road standard assumptions; an ergometer's own speed formula may differ.
const bikeMassKg = 9
const rollingResistance = 0.005
const dragAreaSquareMeters = 0.32
const airDensity = 1.225
const drivetrainEfficiency = 0.97
const gravity = 9.81

/**
 * Estimated cycling power from average speed, body weight and standard road
 * physics. Only a display hint: never stored, never a record or CP anchor.
 */
export function estimateCyclingPowerWatts(
  training: Pick<ActualTraining, 'discipline' | 'durationSeconds' | 'distanceMeters'>,
  weightKg: number | null,
): number | null {
  const { durationSeconds, distanceMeters } = training
  if (
    training.discipline !== 'bike' ||
    !durationSeconds ||
    !distanceMeters ||
    durationSeconds <= 0 ||
    distanceMeters <= 0 ||
    weightKg === null ||
    weightKg <= 0
  ) {
    return null
  }
  const speed = distanceMeters / durationSeconds
  const rolling = rollingResistance * (weightKg + bikeMassKg) * gravity * speed
  const aerodynamic = 0.5 * airDensity * dragAreaSquareMeters * speed ** 3
  return (rolling + aerodynamic) / drivetrainEfficiency
}
