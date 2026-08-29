import type {
  ActualTraining,
  Discipline,
  PlannedTraining,
  TrackerSettings,
  TrainingContext,
  ValidationIssue,
} from '@/apps/triathlon-tracker/types'
import { isValidLocalDate } from './dates'

const contextsByDiscipline: Record<Discipline, readonly TrainingContext[]> = {
  swim: ['pool-25', 'pool-50', 'open-water'],
  bike: ['indoor', 'outdoor'],
  run: ['road', 'track', 'treadmill'],
}

function rangeIssue(
  field: string,
  value: number | null,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): ValidationIssue[] {
  if (value === null || (value >= minimum && value <= maximum)) {
    return []
  }
  return [{ field, code: 'out-of-range', severity: 'error' }]
}

function validateSharedTraining(
  training: Pick<
    PlannedTraining,
    'localDate' | 'startMinutes' | 'durationSeconds' | 'distanceMeters'
  >,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!isValidLocalDate(training.localDate)) {
    issues.push({ field: 'localDate', code: 'invalid-date', severity: 'error' })
  }
  issues.push(...rangeIssue('startMinutes', training.startMinutes, 0, 1_439))
  if (
    training.startMinutes !== null &&
    !Number.isInteger(training.startMinutes)
  ) {
    issues.push({ field: 'startMinutes', code: 'out-of-range', severity: 'error' })
  }
  issues.push(...rangeIssue('durationSeconds', training.durationSeconds, 0))
  issues.push(...rangeIssue('distanceMeters', training.distanceMeters, 0))
  return issues
}

export function validateSettings(settings: TrackerSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (
    settings.weightKg !== null &&
    (settings.weightKg < 20 || settings.weightKg > 300)
  ) {
    issues.push({ field: 'weightKg', code: 'out-of-range', severity: 'error' })
  }
  return issues
}

export function validatePlannedTraining(
  training: PlannedTraining,
): ValidationIssue[] {
  const issues = validateSharedTraining(training)
  if (training.label.length > 40) {
    issues.push({ field: 'label', code: 'too-long', severity: 'error' })
  }
  return issues
}

export function validateActualTraining(
  training: ActualTraining,
): ValidationIssue[] {
  const issues = validateSharedTraining(training)
  if (
    (training.durationSeconds === null || training.durationSeconds === 0) &&
    (training.distanceMeters === null || training.distanceMeters === 0)
  ) {
    issues.push({ field: 'training', code: 'required', severity: 'error' })
  }
  if (
    training.context !== null &&
    !contextsByDiscipline[training.discipline].includes(training.context)
  ) {
    issues.push({ field: 'context', code: 'context-mismatch', severity: 'error' })
  }
  issues.push(
    ...rangeIssue('averageHeartRateBpm', training.averageHeartRateBpm, 30, 250),
    ...rangeIssue('averagePowerWatts', training.averagePowerWatts, 0, 3_000),
    ...rangeIssue('rpe', training.rpe, 1, 10),
  )

  if (training.intervals.length > 100) {
    issues.push({ field: 'intervals', code: 'too-many', severity: 'error' })
  }

  training.intervals.forEach((segment, index) => {
    const prefix = `intervals.${index}`
    if (
      (segment.durationSeconds === null || segment.durationSeconds === 0) &&
      (segment.distanceMeters === null || segment.distanceMeters === 0)
    ) {
      issues.push({ field: prefix, code: 'required', severity: 'error' })
    }
    issues.push(
      ...rangeIssue(`${prefix}.durationSeconds`, segment.durationSeconds, 0),
      ...rangeIssue(`${prefix}.distanceMeters`, segment.distanceMeters, 0),
      ...rangeIssue(
        `${prefix}.averageHeartRateBpm`,
        segment.averageHeartRateBpm,
        30,
        250,
      ),
      ...rangeIssue(
        `${prefix}.averagePowerWatts`,
        segment.averagePowerWatts,
        0,
        3_000,
      ),
    )
  })

  const intervalDuration = training.intervals.reduce(
    (sum, interval) => sum + (interval.durationSeconds ?? 0),
    0,
  )
  const intervalDistance = training.intervals.reduce(
    (sum, interval) => sum + (interval.distanceMeters ?? 0),
    0,
  )
  if (
    training.intervals.length > 0 &&
    ((training.durationSeconds !== null &&
      Math.abs(intervalDuration - training.durationSeconds) > 1) ||
      (training.distanceMeters !== null &&
        Math.abs(intervalDistance - training.distanceMeters) > 1))
  ) {
    issues.push({
      field: 'intervals',
      code: 'interval-sum-mismatch',
      severity: 'warning',
    })
  }

  return issues
}
