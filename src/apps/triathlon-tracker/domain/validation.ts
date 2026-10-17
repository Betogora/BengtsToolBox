import type {
  ActualTraining,
  PlannedTraining,
  TrackerSettings,
  ValidationIssue,
} from '@/apps/triathlon-tracker/types'
import { runIntensities, trainingContexts } from '@/apps/triathlon-tracker/types'
import { isValidLocalDate } from './dates'
import { maximumInclinePercent } from './incline'
import { intervalTotals } from './intervals'

function rangeIssue(
  field: string,
  value: number | null,
  minimum: number,
  maximum = Number.POSITIVE_INFINITY,
): ValidationIssue[] {
  if (value === null || (Number.isFinite(value) && value >= minimum && value <= maximum)) {
    return []
  }
  return [{ field, code: 'out-of-range', severity: 'error' }]
}

function validateSharedTraining(
  training: Pick<
    PlannedTraining,
    | 'localDate'
    | 'startMinutes'
    | 'discipline'
    | 'isWalk'
    | 'inclinePercent'
    | 'intensity'
    | 'durationSeconds'
    | 'distanceMeters'
  >,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (training.isWalk && training.discipline !== 'run') {
    issues.push({ field: 'isWalk', code: 'context-mismatch', severity: 'error' })
  }
  const intensity = training.intensity ?? null
  if (intensity !== null) {
    if (training.discipline !== 'run' || training.isWalk) {
      issues.push({ field: 'intensity', code: 'context-mismatch', severity: 'error' })
    } else if (!runIntensities.includes(intensity)) {
      issues.push({ field: 'intensity', code: 'out-of-range', severity: 'error' })
    }
  }
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
  const incline = training.inclinePercent ?? null
  if (incline !== null && training.discipline !== 'run') {
    issues.push({ field: 'inclinePercent', code: 'context-mismatch', severity: 'error' })
  }
  issues.push(...rangeIssue('inclinePercent', incline, 0, maximumInclinePercent))
  return issues
}

export const restingHeartRateRange = { minimum: 30, maximum: 110 } as const

/** 2:00 to 30:00 min/km, i.e. 2 to 30 km/h. */
export function isValidPlanPace(paceSecondsPerKilometer: number) {
  return (
    Number.isFinite(paceSecondsPerKilometer) &&
    paceSecondsPerKilometer >= 120 &&
    paceSecondsPerKilometer <= 1_800
  )
}

export function validateSettings(settings: TrackerSettings): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (
    settings.weightKg !== null &&
    (!Number.isFinite(settings.weightKg) || settings.weightKg < 20 || settings.weightKg > 300)
  ) {
    issues.push({ field: 'weightKg', code: 'out-of-range', severity: 'error' })
  }
  issues.push(
    ...rangeIssue(
      'restingHeartRateBpm',
      settings.restingHeartRateBpm ?? null,
      restingHeartRateRange.minimum,
      restingHeartRateRange.maximum,
    ),
  )
  for (const [variant, pace] of Object.entries(
    settings.planPaceSecondsPerKilometer ?? {},
  )) {
    if (!isValidPlanPace(pace)) {
      issues.push({
        field: `planPaceSecondsPerKilometer.${variant}`,
        code: 'out-of-range',
        severity: 'error',
      })
    }
  }
  return issues
}

export function validatePlannedTraining(
  training: PlannedTraining,
): ValidationIssue[] {
  const issues = validateSharedTraining(training)
  if (training.discipline === 'strength' && training.distanceMeters !== null) {
    issues.push({ field: 'distanceMeters', code: 'context-mismatch', severity: 'error' })
  }
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
  if (training.discipline === 'strength') {
    // Strength sessions only carry a duration.
    if (!training.durationSeconds || training.durationSeconds <= 0) {
      issues.push({ field: 'durationSeconds', code: 'required', severity: 'error' })
    }
    if (
      training.context !== null ||
      training.distanceMeters !== null ||
      training.averageHeartRateBpm !== null ||
      training.averagePowerWatts !== null ||
      training.rpe !== null ||
      training.intervals.length > 0 ||
      training.isBenchmark
    ) {
      issues.push({ field: 'discipline', code: 'context-mismatch', severity: 'error' })
    }
  } else if (
    training.context !== null &&
    !trainingContexts[training.discipline].some((context) => context === training.context)
  ) {
    issues.push({ field: 'context', code: 'context-mismatch', severity: 'error' })
  }
  if ((training.inclinePercent ?? null) !== null && training.context !== 'treadmill') {
    issues.push({ field: 'inclinePercent', code: 'context-mismatch', severity: 'error' })
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
      ...rangeIssue(
        `${prefix}.endHeartRateBpm`,
        segment.endHeartRateBpm ?? null,
        30,
        250,
      ),
    )
  })

  // Phases without a distance (no speed entered) leave the total distance
  // open, so only complete sums are compared.
  const intervalSums = intervalTotals(training.intervals)
  const differs = (sum: number | null, total: number | null) =>
    sum !== null && total !== null && Math.abs(sum - total) > 1
  if (
    differs(intervalSums.durationSeconds, training.durationSeconds) ||
    differs(intervalSums.distanceMeters, training.distanceMeters)
  ) {
    issues.push({
      field: 'intervals',
      code: 'interval-sum-mismatch',
      severity: 'warning',
    })
  }

  return issues
}
