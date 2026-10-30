import type { Discipline } from '@/apps/triathlon-tracker/types'

export function kilometersToMeters(kilometers: number): number {
  return kilometers * 1_000
}

export function metersToKilometers(meters: number): number {
  return meters / 1_000
}

export function minutesToSeconds(minutes: number): number {
  return minutes * 60
}

export function secondsToMinutes(seconds: number): number {
  return seconds / 60
}

export function paceSecondsPerKilometer(
  durationSeconds: number,
  distanceMeters: number,
): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return durationSeconds / (distanceMeters / 1_000)
}

export function averagePaceReferenceMeters(discipline: Discipline): number {
  return discipline === 'swim' ? 100 : 1_000
}

export function averagePaceSeconds(
  durationSeconds: number,
  distanceMeters: number,
  discipline: Discipline,
): number | null {
  if (durationSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return (
    (durationSeconds * averagePaceReferenceMeters(discipline)) / distanceMeters
  )
}

export function durationSecondsFromAveragePace(
  paceSeconds: number,
  distanceMeters: number,
  discipline: Discipline,
): number | null {
  if (paceSeconds <= 0 || distanceMeters <= 0) {
    return null
  }

  return (paceSeconds * distanceMeters) / averagePaceReferenceMeters(discipline)
}

export function formatPace(paceSeconds: number | null): string {
  if (paceSeconds === null || paceSeconds <= 0) {
    return ''
  }

  const roundedSeconds = Math.round(paceSeconds)
  const minutes = Math.floor(roundedSeconds / 60)
  const seconds = roundedSeconds % 60
  return `${minutes}:${`${seconds}`.padStart(2, '0')}`
}

export function parsePace(value: string): number | null {
  const match = /^(\d+):([0-5]\d)$/.exec(value.trim())
  if (!match) {
    return null
  }

  const seconds = Number(match[1]) * 60 + Number(match[2])
  return seconds > 0 ? seconds : null
}

export function parseTrainingDuration(value: string): number | null {
  const input = value.trim()
  if (!input) return null
  if (!input.includes(':')) {
    const minutes = Number(input.replace(',', '.'))
    return Number.isFinite(minutes) && minutes >= 0
      ? Math.round(minutes * 60)
      : null
  }
  const match = /^(?:(\d+):([0-5]\d):([0-5]\d)|(\d+):([0-5]\d))$/.exec(input)
  if (!match) return null
  return match[1] !== undefined
    ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
    : Number(match[4]) * 60 + Number(match[5])
}

export function formatTrainingDurationInput(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return ''
  const rounded = Math.round(seconds)
  const minutes = Math.floor(rounded / 60)
  const remainder = String(rounded % 60).padStart(2, '0')
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${remainder}`
    : `${minutes}:${remainder}`
}

/** Speed in km/h for a pace in seconds per kilometre, at most two decimals. */
export function formatSpeed(paceSecondsPerKilometer: number | null): string {
  if (paceSecondsPerKilometer === null || paceSecondsPerKilometer <= 0) {
    return ''
  }
  return String(Number((3_600 / paceSecondsPerKilometer).toFixed(2)))
}

/** Pace in seconds per kilometre for a speed in km/h. */
export function parseSpeed(value: string): number | null {
  const kilometersPerHour = Number(value.trim().replace(',', '.'))
  return value.trim() !== '' &&
    Number.isFinite(kilometersPerHour) &&
    kilometersPerHour > 0
    ? 3_600 / kilometersPerHour
    : null
}

function formatKilometers(meters: number) {
  return String(Number((meters / 1000).toFixed(6)))
}

export type TrainingMetricField = 'duration' | 'distance' | 'pace'
/** Speed is the pace in km/h and therefore counts as a pace input. */
export type TrainingMetricInput = TrainingMetricField | 'speed'
export type TrainingMetricDraft = Record<TrainingMetricInput, string> & {
  inputs: [TrainingMetricField, TrainingMetricField]
  paceSource?: 'pace' | 'speed'
}

export function trainingMetricDraft(
  durationSeconds: number | null,
  distanceMeters: number | null,
  discipline: Discipline,
): TrainingMetricDraft {
  const pace =
    durationSeconds && distanceMeters
      ? averagePaceSeconds(durationSeconds, distanceMeters, discipline)
      : null
  return {
    duration: formatTrainingDurationInput(durationSeconds),
    distance: distanceMeters === null ? '' : formatKilometers(distanceMeters),
    pace: formatPace(pace),
    speed: discipline === 'swim' ? '' : formatSpeed(pace),
    inputs: ['duration', 'distance'],
  }
}

export function updateTrainingMetrics(
  current: TrainingMetricDraft,
  input: TrainingMetricInput,
  value: string,
  discipline: Discipline,
): TrainingMetricDraft {
  const field: TrainingMetricField = input === 'speed' ? 'pace' : input
  const inputs = [
    ...current.inputs.filter((item) => item !== field),
    field,
  ].slice(-2) as TrainingMetricDraft['inputs']
  const next: TrainingMetricDraft = { ...current, [input]: value, inputs }
  if (field === 'pace') next.paceSource = input as 'pace' | 'speed'
  const derived = (['duration', 'distance', 'pace'] as const).find(
    (item) => !inputs.includes(item),
  )!
  const duration = parseTrainingDuration(next.duration) ?? 0
  const distance = Number(next.distance.replace(',', '.')) * 1000
  // A typed speed keeps full precision instead of the rounded pace text.
  const pace =
    next.paceSource === 'speed' && discipline !== 'swim'
      ? parseSpeed(next.speed)
      : parsePace(next.pace)
  const positive = (number: number) => Number.isFinite(number) && number > 0
  if (input === 'pace') {
    next.speed = discipline === 'swim' ? '' : formatSpeed(pace)
  } else if (input === 'speed') {
    next.pace = formatPace(pace)
  }
  if (derived === 'pace') {
    const derivedPace =
      positive(duration) && positive(distance)
        ? averagePaceSeconds(duration, distance, discipline)
        : null
    next.pace = formatPace(derivedPace)
    next.speed = discipline === 'swim' ? '' : formatSpeed(derivedPace)
    delete next.paceSource
  } else if (derived === 'duration') {
    next.duration =
      pace && positive(distance)
        ? formatTrainingDurationInput(
            (pace * distance) / averagePaceReferenceMeters(discipline),
          )
        : ''
  } else {
    next.distance =
      pace && positive(duration)
        ? formatKilometers(
            (duration / pace) * averagePaceReferenceMeters(discipline),
          )
        : ''
  }
  return next
}

export type PlanMetricField = 'duration' | 'distance'
export type PlanMetricDraft = Record<PlanMetricField, string> & {
  /** The field completed from the default pace, if any. */
  derived: PlanMetricField | null
}

/**
 * Completes a plan from one entered value and the default pace. Editing the
 * derived field turns it into an entered value; without a pace or with both
 * or no values entered nothing is derived.
 */
export function updatePlanMetrics(
  current: PlanMetricDraft,
  field: PlanMetricField | null,
  value: string,
  paceSecondsPerKilometer: number | null,
): PlanMetricDraft {
  const next: PlanMetricDraft = { ...current }
  if (field) {
    next[field] = value
    if (next.derived === field) next.derived = null
  }
  if (next.derived) {
    next[next.derived] = ''
    next.derived = null
  }
  const duration = parseTrainingDuration(next.duration)
  const distanceKilometers = Number(next.distance.replace(',', '.'))
  const hasDistance =
    next.distance.trim() !== '' &&
    Number.isFinite(distanceKilometers) &&
    distanceKilometers > 0
  if (!paceSecondsPerKilometer) return next
  if (duration && duration > 0 && next.distance.trim() === '') {
    next.distance = String(
      Number((duration / paceSecondsPerKilometer).toFixed(2)),
    )
    next.derived = 'distance'
  } else if (hasDistance && next.duration.trim() === '') {
    next.duration = formatTrainingDurationInput(
      distanceKilometers * paceSecondsPerKilometer,
    )
    next.derived = 'duration'
  }
  return next
}

export function minutesToTime(minutes: number | null) {
  if (minutes === null) return ''
  return (
    `${Math.floor(minutes / 60)}`.padStart(2, '0') +
    ':' +
    `${minutes % 60}`.padStart(2, '0')
  )
}

export function timeToMinutes(value: string) {
  if (!value) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

export function optionalNumber(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value.replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

export function inclineToInput(inclinePercent: number | null | undefined) {
  return inclinePercent == null ? '' : `${inclinePercent}`
}
