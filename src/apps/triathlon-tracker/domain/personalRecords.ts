import type {
  ActualTraining,
  Discipline,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import { climbMeters } from './incline'
import { isComparableContinuousTraining } from './performance'

export const personalRecordDistances = {
  swim: [200, 400, 750, 1_500],
  bike: [20_000, 40_000],
  run: [1_000, 5_000, 10_000, 21_097.5, 42_195],
} as const satisfies Record<Discipline, readonly number[]>

export const personalRecordPowerDurations = [300, 1_200] as const

export type DistanceRecord = {
  trainingId: string
  localDate: string
  durationSeconds: number
}

export type PowerRecord = {
  trainingId: string
  localDate: string
  averagePowerWatts: number
}

export type PersonalRecords = {
  distanceRecords: { targetDistanceMeters: number; record: DistanceRecord | null }[]
  powerRecords: { targetDurationSeconds: number; record: PowerRecord | null }[]
}

export function getPersonalRecords(
  trainings: readonly ActualTraining[],
  options: {
    discipline: Discipline
    context: TrainingContext
    asOfLocalDate: string
  },
): PersonalRecords {
  // Whole-session averages cannot establish a faster segment inside a session.
  // Exact distance/duration matches avoid presenting estimates as measurements.
  const comparable = trainings
    .filter(
      (training) =>
        training.durationSeconds !== null &&
        Number.isFinite(training.durationSeconds) &&
        training.durationSeconds > 0 &&
        isComparableContinuousTraining(
          training,
          options.discipline,
          options.context,
          options.asOfLocalDate,
          'distance',
        ),
    )
    .sort(
      (left, right) =>
        left.localDate.localeCompare(right.localDate) ||
        left.id.localeCompare(right.id),
    )

  const distanceRecords = personalRecordDistances[options.discipline].map(
    (targetDistanceMeters) => {
      let record: DistanceRecord | null = null
      for (const training of comparable) {
        if (
          training.distanceMeters === targetDistanceMeters &&
          (!record || training.durationSeconds! < record.durationSeconds)
        ) {
          record = {
            trainingId: training.id,
            localDate: training.localDate,
            durationSeconds: training.durationSeconds!,
          }
        }
      }
      return { targetDistanceMeters, record }
    },
  )

  const powerRecords =
    options.discipline === 'bike'
      ? personalRecordPowerDurations.map((targetDurationSeconds) => {
          let record: PowerRecord | null = null
          for (const training of trainings) {
            if (
              training.durationSeconds !== targetDurationSeconds ||
              training.averagePowerWatts === null ||
              !Number.isFinite(training.averagePowerWatts) ||
              training.averagePowerWatts <= 0 ||
              !isComparableContinuousTraining(
                training, 'bike', options.context, options.asOfLocalDate, 'power',
              )
            ) continue
            if (
              !record ||
              training.averagePowerWatts > record.averagePowerWatts ||
              (training.averagePowerWatts === record.averagePowerWatts &&
                (training.localDate < record.localDate ||
                  (training.localDate === record.localDate &&
                    training.id < record.trainingId)))
            ) {
              record = {
                trainingId: training.id,
                localDate: training.localDate,
                averagePowerWatts: training.averagePowerWatts,
              }
            }
          }
          return { targetDurationSeconds, record }
        })
      : []

  return { distanceRecords, powerRecords }
}

export type ClimbRecord = {
  trainingId: string
  localDate: string
  value: number
}

export type WalkingClimbRecords = {
  /** Best average climbing rate in vertical metres per hour. */
  climbRate: ClimbRecord | null
}

// Shorter sessions overstate the sustainable climbing rate.
const minimumClimbRateDurationSeconds = 1_200

function betterRecord(
  current: ClimbRecord | null,
  candidate: ClimbRecord,
) {
  return !current ||
    candidate.value > current.value ||
    (candidate.value === current.value &&
      (candidate.localDate < current.localDate ||
        (candidate.localDate === current.localDate &&
          candidate.trainingId < current.trainingId)))
    ? candidate
    : current
}

/** Walking records come from continuous inclined treadmill walks. */
export function getWalkingClimbRecords(
  trainings: readonly ActualTraining[],
  asOfLocalDate: string,
): WalkingClimbRecords {
  let climbRate: ClimbRecord | null = null
  for (const training of trainings) {
    const incline = training.inclinePercent ?? 0
    if (
      incline <= 0 ||
      !training.durationSeconds ||
      !training.distanceMeters ||
      training.durationSeconds < minimumClimbRateDurationSeconds ||
      training.distanceMeters <= 0 ||
      !isComparableContinuousTraining(
        training, 'run', 'treadmill', asOfLocalDate, 'distance',
        { isWalk: true, allowIncline: true },
      )
    ) continue
    climbRate = betterRecord(climbRate, {
      trainingId: training.id,
      localDate: training.localDate,
      value:
        (climbMeters(training.distanceMeters, incline) / training.durationSeconds) *
        3_600,
    })
  }
  return { climbRate }
}
