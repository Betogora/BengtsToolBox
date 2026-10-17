import type { IntervalSegment, RunIntensity } from '@/apps/triathlon-tracker/types'

/**
 * Running intervals alternate strictly: a session starts easy, every odd
 * position is an interval and every even position an easy phase (warm-up,
 * recovery or cool-down). The kind therefore follows from the position.
 */
export function intervalKindAt(index: number): IntervalSegment['kind'] {
  return index % 2 === 0 ? 'rest' : 'work'
}

export type IntervalPhase = 'warm-up' | 'work' | 'recovery' | 'cool-down'

/** Role of a phase in an alternating sequence of `count` phases. */
export function intervalPhaseAt(index: number, count: number): IntervalPhase {
  if (index % 2 === 1) return 'work'
  if (index === 0) return 'warm-up'
  return index === count - 1 ? 'cool-down' : 'recovery'
}

export type IntervalScheme = {
  warmUpSeconds: number
  repetitions: number
  workSeconds: number
  recoverySeconds: number
  coolDownSeconds: number
}

export const defaultIntervalScheme: IntervalScheme = {
  warmUpSeconds: 600,
  repetitions: 3,
  workSeconds: 240,
  recoverySeconds: 240,
  coolDownSeconds: 300,
}

export const maximumIntervalRepetitions = 49

// Quality sessions start with a longer warm-up and end with ten easy minutes.
const qualityWarmUpSeconds = 900
const qualityCoolDownSeconds = 600
const minimumCoolDownSeconds = 300

/**
 * Threshold reps rest about one minute per five (1–3 min) so the intensity
 * stays continuous; VO2max reps rest three minutes, short ones as long as
 * they last.
 */
function qualityRecoverySeconds(
  intensity: Exclude<RunIntensity, 'easy'>,
  workSeconds: number,
) {
  if (intensity === 'vo2max') return Math.min(workSeconds, 180)
  return Math.min(180, Math.max(60, Math.round(workSeconds / 5 / 30) * 30))
}

function qualityScheme(
  intensity: Exclude<RunIntensity, 'easy'>,
  repetitions: number,
  workSeconds: number,
): IntervalScheme {
  return {
    warmUpSeconds: qualityWarmUpSeconds,
    repetitions,
    workSeconds,
    recoverySeconds: qualityRecoverySeconds(intensity, workSeconds),
    coolDownSeconds: qualityCoolDownSeconds,
  }
}

/** Starting scheme of the table for each kind of run. */
export const intervalSchemeDefaults: Record<RunIntensity, IntervalScheme> = {
  easy: defaultIntervalScheme,
  threshold: qualityScheme('threshold', 3, 600),
  vo2max: qualityScheme('vo2max', 4, 240),
}

/** Phase durations of a scheme; a cool-down of zero ends on the last interval. */
export function buildIntervalScheme(scheme: IntervalScheme): number[] {
  const durations = [scheme.warmUpSeconds]
  for (let repetition = 0; repetition < scheme.repetitions; repetition += 1) {
    if (repetition > 0) durations.push(scheme.recoverySeconds)
    durations.push(scheme.workSeconds)
  }
  if (scheme.coolDownSeconds > 0) durations.push(scheme.coolDownSeconds)
  return durations
}

/**
 * Reads plan labels such as "Intervalle 3×4 min". The recovery fills the
 * planned duration around the default warm-up and cool-down, rounded to half
 * minutes; without a fitting duration it equals the interval.
 */
export function plannedIntervalScheme(
  label: string,
  plannedDurationSeconds: number | null,
  intensity: RunIntensity = 'easy',
): IntervalScheme | null {
  const match = /(\d+)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*(?:min|')/i.exec(label)
  if (!match) return null
  const repetitions = Number(match[1])
  const workSeconds = Math.round(Number(match[2].replace(',', '.')) * 60)
  if (
    repetitions < 1 ||
    repetitions > maximumIntervalRepetitions ||
    workSeconds <= 0
  ) {
    return null
  }
  if (intensity !== 'easy') {
    // Quality runs rest by purpose; the cool-down absorbs the plan duration.
    const scheme = qualityScheme(intensity, repetitions, workSeconds)
    if (plannedDurationSeconds === null) return scheme
    const remaining =
      plannedDurationSeconds -
      scheme.warmUpSeconds -
      repetitions * workSeconds -
      (repetitions - 1) * scheme.recoverySeconds
    return {
      ...scheme,
      coolDownSeconds: Math.max(
        minimumCoolDownSeconds,
        Math.round(remaining / 30) * 30,
      ),
    }
  }
  const { warmUpSeconds, coolDownSeconds } = defaultIntervalScheme
  const remaining =
    (plannedDurationSeconds ?? 0) -
    warmUpSeconds -
    coolDownSeconds -
    repetitions * workSeconds
  const fittedRecovery =
    repetitions > 1 ? Math.round(remaining / (repetitions - 1) / 30) * 30 : 0
  return {
    warmUpSeconds,
    repetitions,
    workSeconds,
    recoverySeconds: fittedRecovery >= 60 ? fittedRecovery : workSeconds,
    coolDownSeconds,
  }
}

/** Empty phases for a scheme, ready to be filled in during the session. */
export function intervalSegmentsFromScheme(
  scheme: IntervalScheme,
  createId: () => string,
): IntervalSegment[] {
  return buildIntervalScheme(scheme).map((durationSeconds, index) => ({
    id: createId(),
    position: index + 1,
    kind: intervalKindAt(index),
    durationSeconds,
    distanceMeters: null,
    averageHeartRateBpm: null,
    averagePowerWatts: null,
    endHeartRateBpm: null,
  }))
}

/**
 * Adds one interval with its recovery. A trailing cool-down stays last; a
 * session that ends on an interval grows at its end.
 */
export function insertIntervalPair<Phase>(
  phases: readonly Phase[],
  createPhase: (kind: IntervalSegment['kind'], template: Phase | undefined) => Phase,
): Phase[] {
  if (phases.length === 0) return [createPhase('rest', undefined)]
  if (phases.length === 1) {
    return [
      ...phases,
      createPhase('work', undefined),
      createPhase('rest', undefined),
    ]
  }
  const lastOf = (matches: (index: number) => boolean) =>
    phases.findLast((_, index) => matches(index))
  const lastWork = lastOf((index) => intervalKindAt(index) === 'work')
  // Recoveries lie between two intervals; without one the pause equals the
  // interval, as in most schemes.
  const lastRecovery = lastOf(
    (index) =>
      index > 0 && index < phases.length - 1 && intervalKindAt(index) === 'rest',
  )
  const endsEasy = intervalKindAt(phases.length - 1) === 'rest'
  const pair = [
    createPhase('rest', lastRecovery ?? lastWork),
    createPhase('work', lastWork),
  ]
  return endsEasy
    ? [...phases.slice(0, -1), ...pair, phases[phases.length - 1]]
    : [...phases, ...pair]
}

/**
 * Removes a phase without breaking the alternation: an interval leaves with
 * its recovery, a trailing cool-down alone. The warm-up always stays.
 */
export function removeIntervalPhase<Phase>(
  phases: readonly Phase[],
  index: number,
): Phase[] {
  if (index <= 0 || index >= phases.length) return [...phases]
  if (intervalKindAt(index) === 'rest') {
    return index === phases.length - 1 ? phases.slice(0, -1) : [...phases]
  }
  // An interval leaves with the recovery before it, the first one with the
  // easy phase after it, so the warm-up and a cool-down both survive.
  const start = index > 1 ? index - 1 : index
  return [...phases.slice(0, start), ...phases.slice(start + 2)]
}

export function countWorkPhases(segments: readonly { kind: IntervalSegment['kind'] }[]) {
  return segments.filter((segment) => segment.kind === 'work').length
}

/** Distance of a phase from its duration and speed; standing still is 0 m. */
export function intervalDistanceMeters(
  durationSeconds: number | null,
  speedKilometersPerHour: number | null,
): number | null {
  if (durationSeconds === null || speedKilometersPerHour === null) return null
  return Math.round((durationSeconds * speedKilometersPerHour) / 0.36) / 10
}

/** Speed in km/h of a stored phase, at most one decimal. */
export function intervalSpeedKilometersPerHour(
  segment: Pick<IntervalSegment, 'durationSeconds' | 'distanceMeters'>,
): number | null {
  if (
    segment.durationSeconds === null ||
    segment.durationSeconds <= 0 ||
    segment.distanceMeters === null
  ) {
    return null
  }
  return (
    Math.round((segment.distanceMeters / segment.durationSeconds) * 36) / 10
  )
}

/** Totals of a sequence; the distance only when every phase has one. */
export function intervalTotals(
  segments: readonly Pick<IntervalSegment, 'durationSeconds' | 'distanceMeters'>[],
) {
  const complete = (values: (number | null)[]) =>
    values.length > 0 && values.every((value) => value !== null)
      ? values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null
  return {
    durationSeconds: complete(segments.map((segment) => segment.durationSeconds)),
    distanceMeters: complete(segments.map((segment) => segment.distanceMeters)),
  }
}
