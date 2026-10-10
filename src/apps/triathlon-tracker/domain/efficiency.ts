import type {
  ActualTraining,
  Discipline,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import { addDaysToLocalDate } from './dates'
import { isComparableContinuousTraining } from './performance'

export type EfficiencyPoint = {
  activityId: string
  localDate: string
  averageHeartRateBpm: number
  speedMetersPerSecond: number
  /** Speed the session implies at the reference heart rate. */
  normalizedSpeedMetersPerSecond: number
  /** Rolling mean of normalized speed over the trend window. */
  trendSpeedMetersPerSecond: number
}

export type EfficiencyTrend = {
  referenceHeartRateBpm: number
  points: EfficiencyPoint[]
}

// Short sessions are dominated by heart-rate lag rather than steady-state cost.
const minimumDurationSeconds = 600
const trendWindowDays = 28

function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Efficiency factor (speed / heart rate, Friel) scaled to one reference heart
 * rate, so sessions at different intensities become comparable. The reference
 * is the rounded median heart rate of the whole comparable history; it stays
 * stable when only the visible range changes.
 */
export function getEfficiencyTrend(
  trainings: readonly ActualTraining[],
  options: {
    discipline: Discipline
    context: TrainingContext
    fromLocalDate: string
    asOfLocalDate: string
  },
): EfficiencyTrend | null {
  const samples = trainings
    .flatMap((training) => {
      const heartRate = training.averageHeartRateBpm
      if (
        !isComparableContinuousTraining(
          training,
          options.discipline,
          options.context,
          options.asOfLocalDate,
          'distance',
        ) ||
        heartRate === null ||
        !Number.isFinite(heartRate) ||
        heartRate < 30 ||
        heartRate > 250 ||
        training.durationSeconds === null ||
        !Number.isFinite(training.durationSeconds) ||
        training.durationSeconds < minimumDurationSeconds ||
        training.distanceMeters === null ||
        !Number.isFinite(training.distanceMeters) ||
        training.distanceMeters <= 0
      ) {
        return []
      }
      const speedMetersPerSecond =
        training.distanceMeters / training.durationSeconds
      return [
        {
          activityId: training.id,
          localDate: training.localDate,
          averageHeartRateBpm: heartRate,
          speedMetersPerSecond,
          efficiency: speedMetersPerSecond / heartRate,
        },
      ]
    })
    .sort(
      (left, right) =>
        left.localDate.localeCompare(right.localDate) ||
        left.activityId.localeCompare(right.activityId),
    )
  if (samples.length === 0) return null

  const referenceHeartRateBpm =
    Math.round(median(samples.map((sample) => sample.averageHeartRateBpm)) / 5) *
    5
  const points = samples
    .filter((sample) => sample.localDate >= options.fromLocalDate)
    .map(({ efficiency, ...sample }) => {
      const windowStart = addDaysToLocalDate(
        sample.localDate,
        -(trendWindowDays - 1),
      )
      const window = samples.filter(
        (candidate) =>
          candidate.localDate >= windowStart &&
          candidate.localDate <= sample.localDate,
      )
      const trendEfficiency =
        window.reduce((sum, candidate) => sum + candidate.efficiency, 0) /
        window.length
      return {
        ...sample,
        normalizedSpeedMetersPerSecond: efficiency * referenceHeartRateBpm,
        trendSpeedMetersPerSecond: trendEfficiency * referenceHeartRateBpm,
      }
    })
  return { referenceHeartRateBpm, points }
}
