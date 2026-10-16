import type {
  ActualTraining,
  Discipline,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import { addDaysToLocalDate } from './dates'
import { flatRunningEquivalentSpeed } from './incline'
import { isComparableContinuousTraining, linearRegression } from './performance'

export type EfficiencyPoint = {
  activityId: string
  localDate: string
  /** Continuous sessions: their average; interval sessions: their intervals. */
  averageHeartRateBpm: number
  speedMetersPerSecond: number
  /** Speed the session implies at the reference heart rate. */
  normalizedSpeedMetersPerSecond: number
  /** Rolling mean of normalized speed over the trend window. */
  trendSpeedMetersPerSecond: number
  source: 'continuous' | 'intervals'
}

export type EfficiencyTrend = {
  referenceHeartRateBpm: number
  points: EfficiencyPoint[]
}

// Short sessions are dominated by heart-rate lag rather than steady-state cost.
const minimumDurationSeconds = 600
const trendWindowDays = 28
/** Heart rate follows a speed change with about this time constant. */
const heartRateTimeConstantSeconds = 60
// Below two time constants the end value says too little about steady state.
const minimumPhaseSeconds = 2 * heartRateTimeConstantSeconds
// Two speed levels at least 1 km/h apart make the heart-rate line meaningful.
const minimumSpeedSpreadMetersPerSecond = 1 / 3.6
// Below the usual walk-run transition (about 7 km/h) a phase counts as walked.
const walkRunTransitionMetersPerSecond = 2
// A session weighs by its usable minutes, at most 90, in the trend.
const maximumWeightSeconds = 5_400
// Sessions further than 15 % from the window median (heat, faulty strap)
// count with proportionally less weight instead of shifting the trend.
const outlierShare = 0.15
// Sessions barely above rest give no usable heart-rate reserve.
const minimumHeartRateReserve = 10

function median(values: readonly number[]) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Heart rate a phase was heading towards, from first-order kinetics:
 * HR(t) = HRss + (HRstart − HRss)·e^(−t/τ). Without a start value only
 * phases of three time constants count, where the end value is settled.
 */
export function steadyStateHeartRate(
  endBpm: number,
  startBpm: number | null,
  durationSeconds: number,
): number | null {
  const decay = Math.exp(-durationSeconds / heartRateTimeConstantSeconds)
  if (startBpm === null) {
    return durationSeconds >= 3 * heartRateTimeConstantSeconds ? endBpm : null
  }
  return (endBpm - startBpm * decay) / (1 - decay)
}

/** Weighted mean of a trend window with damped outliers. */
function robustTrend(
  window: readonly { normalizedSpeedMetersPerSecond: number; weightSeconds: number }[],
) {
  const center = median(window.map((sample) => sample.normalizedSpeedMetersPerSecond))
  let weightedSum = 0
  let totalWeight = 0
  for (const sample of window) {
    const deviation =
      Math.abs(sample.normalizedSpeedMetersPerSecond - center) / center
    const weight =
      sample.weightSeconds *
      (deviation > outlierShare ? outlierShare / deviation : 1)
    weightedSum += sample.normalizedSpeedMetersPerSecond * weight
    totalWeight += weight
  }
  return weightedSum / totalWeight
}

type Sample = {
  activityId: string
  localDate: string
  averageHeartRateBpm: number
  speedMetersPerSecond: number
  weightSeconds: number
  /** Heart rates that may define the reference. */
  referenceCandidates: number[]
  normalizedAt: (referenceHeartRateBpm: number) => number
  source: EfficiencyPoint['source']
}

/**
 * Interval sessions yield one heart-rate line through their phases
 * (HR = a + b·speed); the speed at the reference heart rate is then
 * independent of how many and how long the intervals were.
 */
function intervalSample(
  training: ActualTraining,
  equivalentSpeed: (rawSpeed: number, isWalk: boolean) => number,
): Sample | null {
  const phases = training.intervals.flatMap((phase, index) => {
    const end = phase.endHeartRateBpm ?? null
    if (
      end === null ||
      phase.durationSeconds === null ||
      phase.durationSeconds < minimumPhaseSeconds ||
      phase.distanceMeters === null ||
      phase.distanceMeters <= 0
    ) {
      return []
    }
    const heartRate = steadyStateHeartRate(
      end,
      training.intervals[index - 1]?.endHeartRateBpm ?? null,
      phase.durationSeconds,
    )
    if (heartRate === null || heartRate < 30 || heartRate > 250) return []
    const rawSpeed = phase.distanceMeters / phase.durationSeconds
    return [
      {
        kind: phase.kind,
        durationSeconds: phase.durationSeconds,
        heartRate,
        // A walked recovery costs far less than a run at the same speed.
        speed: equivalentSpeed(
          rawSpeed,
          Boolean(training.isWalk) || rawSpeed < walkRunTransitionMetersPerSecond,
        ),
      },
    ]
  })
  const speeds = phases.map((phase) => phase.speed)
  if (
    phases.length < 2 ||
    Math.max(...speeds) - Math.min(...speeds) < minimumSpeedSpreadMetersPerSecond
  ) {
    return null
  }
  const line = linearRegression(
    phases.map((phase) => [phase.speed, phase.heartRate]),
  )
  if (!line || line.slope <= 0) return null
  const work = phases.filter((phase) => phase.kind === 'work')
  const shown = work.length > 0 ? work : phases
  const shownSeconds = shown.reduce((sum, phase) => sum + phase.durationSeconds, 0)
  const weighted = (value: (phase: (typeof shown)[number]) => number) =>
    shown.reduce((sum, phase) => sum + value(phase) * phase.durationSeconds, 0) /
    shownSeconds
  return {
    activityId: training.id,
    localDate: training.localDate,
    averageHeartRateBpm: Math.round(weighted((phase) => phase.heartRate)),
    speedMetersPerSecond: weighted((phase) => phase.speed),
    weightSeconds: Math.min(
      phases.reduce((sum, phase) => sum + phase.durationSeconds, 0),
      maximumWeightSeconds,
    ),
    referenceCandidates: phases.map((phase) => phase.heartRate),
    normalizedAt: (reference) => (reference - line.intercept) / line.slope,
    source: 'intervals',
  }
}

/**
 * Efficiency factor (speed / heart rate, Friel) scaled to one reference heart
 * rate, so sessions at different intensities become comparable. With a
 * resting heart rate only the reserve above it counts (Karvonen), which
 * matches the near-linear rise of heart rate with speed. Interval
 * sessions join through their own heart-rate line. The reference is the
 * rounded median heart rate of the continuous history (of the interval
 * phases without any); it stays stable when only the visible range changes.
 */
export function getEfficiencyTrend(
  trainings: readonly ActualTraining[],
  options: {
    discipline: Discipline
    context: TrainingContext
    fromLocalDate: string
    asOfLocalDate: string
    /** Walks form their own trend instead of mixing with runs. */
    isWalk?: boolean
    /** Scales by heart rate above rest instead of the whole heart rate. */
    restingHeartRateBpm?: number | null
  },
): EfficiencyTrend | null {
  const restingHeartRate = options.restingHeartRateBpm ?? 0
  const comparable = (training: ActualTraining, intervals: boolean) =>
    isComparableContinuousTraining(
      training,
      options.discipline,
      options.context,
      options.asOfLocalDate,
      'distance',
      { isWalk: options.isWalk, allowIncline: true, intervals },
    )
  // Walks and inclined runs become comparable as flat running equivalent.
  const equivalentSpeed =
    (training: ActualTraining) => (rawSpeed: number, isWalk: boolean) =>
      options.discipline === 'run'
        ? flatRunningEquivalentSpeed(rawSpeed, training.inclinePercent ?? 0, isWalk)
        : rawSpeed
  const samples = trainings
    .flatMap((training): Sample[] => {
      if (comparable(training, true)) {
        const sample = intervalSample(training, equivalentSpeed(training))
        return sample ? [sample] : []
      }
      const heartRate = training.averageHeartRateBpm
      if (
        !comparable(training, false) ||
        heartRate === null ||
        !Number.isFinite(heartRate) ||
        heartRate < 30 ||
        heartRate > 250 ||
        training.durationSeconds === null ||
        !Number.isFinite(training.durationSeconds) ||
        training.durationSeconds < minimumDurationSeconds ||
        training.distanceMeters === null ||
        !Number.isFinite(training.distanceMeters) ||
        training.distanceMeters <= 0 ||
        heartRate - restingHeartRate < minimumHeartRateReserve
      ) {
        return []
      }
      const speedMetersPerSecond = equivalentSpeed(training)(
        training.distanceMeters / training.durationSeconds,
        training.isWalk ?? false,
      )
      return [
        {
          activityId: training.id,
          localDate: training.localDate,
          averageHeartRateBpm: heartRate,
          speedMetersPerSecond,
          weightSeconds: Math.min(training.durationSeconds, maximumWeightSeconds),
          referenceCandidates: [heartRate],
          // Speed grows with the heart rate above rest, not from zero.
          normalizedAt: (reference) =>
            (speedMetersPerSecond * (reference - restingHeartRate)) /
            (heartRate - restingHeartRate),
          source: 'continuous',
        },
      ]
    })
    .sort(
      (left, right) =>
        left.localDate.localeCompare(right.localDate) ||
        left.activityId.localeCompare(right.activityId),
    )
  if (samples.length === 0) return null

  const continuous = samples.filter((sample) => sample.source === 'continuous')
  const referenceHeartRateBpm =
    Math.round(
      median(
        (continuous.length > 0 ? continuous : samples).flatMap(
          (sample) => sample.referenceCandidates,
        ),
      ) / 5,
    ) * 5
  const normalized = samples.map((sample) => ({
    ...sample,
    normalizedSpeedMetersPerSecond: sample.normalizedAt(referenceHeartRateBpm),
  }))
  const points = normalized
    .filter((sample) => sample.localDate >= options.fromLocalDate)
    .map((sample): EfficiencyPoint => {
      const windowStart = addDaysToLocalDate(
        sample.localDate,
        -(trendWindowDays - 1),
      )
      const window = normalized.filter(
        (candidate) =>
          candidate.localDate >= windowStart &&
          candidate.localDate <= sample.localDate,
      )
      return {
        activityId: sample.activityId,
        localDate: sample.localDate,
        averageHeartRateBpm: sample.averageHeartRateBpm,
        speedMetersPerSecond: sample.speedMetersPerSecond,
        normalizedSpeedMetersPerSecond: sample.normalizedSpeedMetersPerSecond,
        trendSpeedMetersPerSecond: robustTrend(window),
        source: sample.source,
      }
    })
  return { referenceHeartRateBpm, points }
}
