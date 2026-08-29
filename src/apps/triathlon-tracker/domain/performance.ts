import type {
  ActualTraining,
  BikeDistanceAnalysis,
  BikePerformanceAnalysis,
  CyclingContext,
  Discipline,
  DistancePerformanceAnalysis,
  InsufficientPerformanceAnalysis,
  PerformanceEstimate,
  RunningContext,
  SwimmingContext,
  TrainingContext,
} from '@/apps/triathlon-tracker/types'
import { defaultTrainingContexts } from '@/apps/triathlon-tracker/types'
import { isInRollingMonthWindow } from './dates'

type DistanceSample = {
  training: ActualTraining
  durationSeconds: number
  distanceMeters: number
}

type PowerSample = {
  training: ActualTraining
  durationSeconds: number
  averagePowerWatts: number
}

type LinearFit = {
  slope: number
  intercept: number
}

type DistanceModel = {
  kind: 'critical-speed' | 'critical-swim-speed' | 'power-law'
  predict: (distanceMeters: number) => number | null
  criticalSpeedMetersPerSecond?: number
  distanceCapacityMeters?: number
  powerLawExponent?: number
}

export type DistanceAnalysisOptions<Context> = {
  context: Context
  asOfLocalDate: string
}

export type BikeAnalysisOptions = DistanceAnalysisOptions<CyclingContext> & {
  weightKg: number | null
}

export type DistanceActivityPerformancePoint = {
  activityId: string
  localDate: string
  speedKilometersPerHour: number
}

export type PowerActivityPerformancePoint = {
  activityId: string
  localDate: string
  averagePowerWatts: number
}

const insufficient = (
  availableAnchors: number,
  requiredAnchors = 3,
): InsufficientPerformanceAnalysis => ({
  status: 'insufficient-data',
  availableAnchors,
  requiredAnchors,
})

function linearRegression(points: readonly [number, number][]): LinearFit | null {
  if (points.length < 2) {
    return null
  }
  const meanX = points.reduce((sum, [x]) => sum + x, 0) / points.length
  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length
  const varianceX = points.reduce((sum, [x]) => sum + (x - meanX) ** 2, 0)
  if (varianceX === 0) {
    return null
  }
  const covariance = points.reduce(
    (sum, [x, y]) => sum + (x - meanX) * (y - meanY),
    0,
  )
  const slope = covariance / varianceX
  return { slope, intercept: meanY - slope * meanX }
}

function isComparableContinuousTraining(
  training: ActualTraining,
  discipline: Discipline,
  context: TrainingContext,
  asOfLocalDate: string,
  metric: 'distance' | 'power',
) {
  const baseAvailability =
    training.analyticsAvailableFromLocalDate ?? training.localDate
  const metricAvailability = metric === 'distance'
    ? training.distanceAnalyticsAvailableFromLocalDate
    : training.powerAnalyticsAvailableFromLocalDate
  return (
    training.discipline === discipline &&
    (
      training.context === context ||
      (
        training.context === null &&
        defaultTrainingContexts[discipline] === context
      )
    ) &&
    training.intervals.length === 0 &&
    baseAvailability <= asOfLocalDate &&
    (metricAvailability ?? baseAvailability) <= asOfLocalDate &&
    training.localDate <= asOfLocalDate
  )
}

export function getDistanceActivityPerformancePoints(
  trainings: readonly ActualTraining[],
  options: {
    discipline: Discipline
    context: TrainingContext
    fromLocalDate: string
    asOfLocalDate: string
  },
): DistanceActivityPerformancePoint[] {
  return trainings.flatMap((training) => {
    if (
      !isComparableContinuousTraining(
        training,
        options.discipline,
        options.context,
        options.asOfLocalDate,
        'distance',
      ) ||
      training.localDate < options.fromLocalDate ||
      training.durationSeconds === null ||
      training.durationSeconds <= 0 ||
      training.distanceMeters === null ||
      training.distanceMeters <= 0
    ) {
      return []
    }
    return [{
      activityId: training.id,
      localDate: training.localDate,
      speedKilometersPerHour:
        (training.distanceMeters / training.durationSeconds) * 3.6,
    }]
  })
}

export function getPowerActivityPerformancePoints(
  trainings: readonly ActualTraining[],
  options: {
    context: CyclingContext
    fromLocalDate: string
    asOfLocalDate: string
  },
): PowerActivityPerformancePoint[] {
  return trainings.flatMap((training) => {
    if (
      !isComparableContinuousTraining(
        training,
        'bike',
        options.context,
        options.asOfLocalDate,
        'power',
      ) ||
      training.localDate < options.fromLocalDate ||
      training.durationSeconds === null ||
      training.durationSeconds <= 0 ||
      training.averagePowerWatts === null ||
      training.averagePowerWatts <= 0
    ) {
      return []
    }
    return [{
      activityId: training.id,
      localDate: training.localDate,
      averagePowerWatts: training.averagePowerWatts,
    }]
  })
}

function eligibleDistanceSamples(
  trainings: readonly ActualTraining[],
  discipline: ActualTraining['discipline'],
  context: TrainingContext,
  asOfLocalDate: string,
): DistanceSample[] {
  return trainings.flatMap((training) => {
    if (
      !isComparableContinuousTraining(
        training,
        discipline,
        context,
        asOfLocalDate,
        'distance',
      ) ||
      !isInRollingMonthWindow(training.localDate, asOfLocalDate) ||
      training.durationSeconds === null ||
      training.durationSeconds <= 0 ||
      training.distanceMeters === null ||
      training.distanceMeters <= 0
    ) {
      return []
    }
    return [
      {
        training,
        durationSeconds: training.durationSeconds,
        distanceMeters: training.distanceMeters,
      },
    ]
  })
}

function durationBucket(durationSeconds: number): number {
  return Math.floor(Math.log2(Math.max(durationSeconds, 60) / 60))
}

function selectDistanceAnchors(samples: readonly DistanceSample[]): DistanceSample[] {
  const fastestByDistance = new Map<number, DistanceSample>()
  samples.forEach((sample) => {
    const current = fastestByDistance.get(sample.distanceMeters)
    if (!current || sample.durationSeconds < current.durationSeconds) {
      fastestByDistance.set(sample.distanceMeters, sample)
    }
  })

  const strongestByDuration = new Map<number, DistanceSample>()
  fastestByDistance.forEach((sample) => {
    const bucket = durationBucket(sample.durationSeconds)
    const current = strongestByDuration.get(bucket)
    const speed = sample.distanceMeters / sample.durationSeconds
    const currentSpeed = current
      ? current.distanceMeters / current.durationSeconds
      : 0
    if (!current || speed > currentSpeed) {
      strongestByDuration.set(bucket, sample)
    }
  })
  return [...strongestByDuration.values()].sort(
    (left, right) => left.durationSeconds - right.durationSeconds,
  )
}

function hasDistanceDiversity(samples: readonly DistanceSample[]): boolean {
  if (samples.length < 3) {
    return false
  }
  const distances = samples.map((sample) => sample.distanceMeters)
  const durations = samples.map((sample) => sample.durationSeconds)
  return (
    Math.max(...distances) / Math.min(...distances) >= 1.5 &&
    Math.max(...durations) / Math.min(...durations) >= 2
  )
}

function fitCriticalSpeed(
  samples: readonly DistanceSample[],
  kind: 'critical-speed' | 'critical-swim-speed' = 'critical-speed',
): DistanceModel | null {
  const fit = linearRegression(
    samples.map((sample) => [sample.durationSeconds, sample.distanceMeters]),
  )
  if (!fit || fit.slope <= 0 || fit.intercept < 0) {
    return null
  }
  return {
    kind,
    criticalSpeedMetersPerSecond: fit.slope,
    distanceCapacityMeters: fit.intercept,
    predict: (distanceMeters) => {
      const duration = (distanceMeters - fit.intercept) / fit.slope
      return duration > 0 ? duration : null
    },
  }
}

function fitPowerLaw(samples: readonly DistanceSample[]): DistanceModel | null {
  const fit = linearRegression(
    samples.map((sample) => [
      Math.log(sample.distanceMeters),
      Math.log(sample.durationSeconds),
    ]),
  )
  if (!fit || fit.slope < 0.95 || fit.slope > 1.5) {
    return null
  }
  const coefficient = Math.exp(fit.intercept)
  return {
    kind: 'power-law',
    powerLawExponent: fit.slope,
    predict: (distanceMeters) => coefficient * distanceMeters ** fit.slope,
  }
}

function crossValidationError(
  samples: readonly DistanceSample[],
  fitModel: (subset: readonly DistanceSample[]) => DistanceModel | null,
): number {
  const relativeErrors = samples.map((sample, heldOutIndex) => {
    const model = fitModel(samples.filter((_, index) => index !== heldOutIndex))
    const predicted = model?.predict(sample.distanceMeters)
    return predicted === null || predicted === undefined
      ? Number.POSITIVE_INFINITY
      : Math.abs(predicted - sample.durationSeconds) / sample.durationSeconds
  })
  return relativeErrors.reduce((sum, error) => sum + error, 0) / samples.length
}

function buildDistanceResult(
  model: DistanceModel,
  anchors: readonly DistanceSample[],
  targetDistances: readonly number[],
  supportingTrainingCount = anchors.length,
): DistancePerformanceAnalysis | null {
  const estimates = targetDistances.flatMap<PerformanceEstimate>((targetDistance) => {
    const predictedDuration = model.predict(targetDistance)
    return predictedDuration === null
      ? []
      : [{
          targetDistanceMeters: targetDistance,
          predictedDurationSeconds: predictedDuration,
        }]
  })
  if (estimates.length !== targetDistances.length) {
    return null
  }

  return {
    status: 'ready',
    model: model.kind,
    anchorIds: anchors.map((sample) => sample.training.id),
    supportingTrainingCount,
    estimates,
    criticalSpeedMetersPerSecond: model.criticalSpeedMetersPerSecond,
    distanceCapacityMeters: model.distanceCapacityMeters,
    powerLawExponent: model.powerLawExponent,
  }
}

const provisionalRunExponent = 1.06

function fitProvisionalRunModel(
  samples: readonly DistanceSample[],
): { anchor: DistanceSample; model: DistanceModel; supportingTrainingCount: number } | null {
  let anchor: DistanceSample | null = null
  let fastestFiveKilometers = Number.POSITIVE_INFINITY
  let supportingTrainingCount = 0
  for (const sample of samples) {
    if (sample.distanceMeters < 5_000) continue
    supportingTrainingCount += 1
    const predictedFiveKilometers =
      sample.durationSeconds * (5_000 / sample.distanceMeters) ** provisionalRunExponent
    if (predictedFiveKilometers < fastestFiveKilometers) {
      anchor = sample
      fastestFiveKilometers = predictedFiveKilometers
    }
  }
  if (!anchor) return null

  const coefficient =
    anchor.durationSeconds / anchor.distanceMeters ** provisionalRunExponent
  return {
    anchor,
    model: {
      kind: 'power-law',
      powerLawExponent: provisionalRunExponent,
      predict: (distanceMeters) =>
        coefficient * distanceMeters ** provisionalRunExponent,
    },
    supportingTrainingCount,
  }
}

export function analyzeRun(
  trainings: readonly ActualTraining[],
  options: DistanceAnalysisOptions<RunningContext>,
): DistancePerformanceAnalysis | InsufficientPerformanceAnalysis {
  const samples = eligibleDistanceSamples(
    trainings,
    'run',
    options.context,
    options.asOfLocalDate,
  )
  const anchors = selectDistanceAnchors(samples)
  if (hasDistanceDiversity(anchors)) {
    const criticalSpeed = fitCriticalSpeed(anchors)
    const powerLaw = fitPowerLaw(anchors)
    const criticalSpeedError = criticalSpeed
      ? crossValidationError(anchors, (subset) => fitCriticalSpeed(subset))
      : Number.POSITIVE_INFINITY
    const powerLawError = powerLaw
      ? crossValidationError(anchors, fitPowerLaw)
      : Number.POSITIVE_INFINITY
    const model =
      criticalSpeed && criticalSpeedError <= powerLawError
        ? criticalSpeed
        : powerLaw
    const result = model
      ? buildDistanceResult(model, anchors, [5_000, 10_000], samples.length)
      : null
    if (result) return result
  }

  const provisional = fitProvisionalRunModel(samples)
  return provisional
    ? buildDistanceResult(
        provisional.model,
        [provisional.anchor],
        [5_000, 10_000],
        provisional.supportingTrainingCount,
      ) ?? insufficient(0, 1)
    : insufficient(0, 1)
}

function fastestAtDistance(
  samples: readonly DistanceSample[],
  distanceMeters: number,
): DistanceSample | null {
  return (
    samples
      .filter((sample) => sample.distanceMeters === distanceMeters)
      .sort((left, right) => left.durationSeconds - right.durationSeconds)[0] ??
    null
  )
}

function fitCss(
  twoHundred: DistanceSample,
  fourHundred: DistanceSample,
): DistanceModel | null {
  const timeDifference = fourHundred.durationSeconds - twoHundred.durationSeconds
  if (timeDifference <= 0) {
    return null
  }
  const criticalSpeed = 200 / timeDifference
  const distanceCapacity = 200 - criticalSpeed * twoHundred.durationSeconds
  if (criticalSpeed <= 0 || distanceCapacity < 0) {
    return null
  }
  return {
    kind: 'critical-swim-speed',
    criticalSpeedMetersPerSecond: criticalSpeed,
    distanceCapacityMeters: distanceCapacity,
    predict: (distanceMeters) => {
      const duration = (distanceMeters - distanceCapacity) / criticalSpeed
      return duration > 0 ? duration : null
    },
  }
}

export function analyzeSwim(
  trainings: readonly ActualTraining[],
  options: DistanceAnalysisOptions<SwimmingContext>,
): DistancePerformanceAnalysis | InsufficientPerformanceAnalysis {
  const samples = eligibleDistanceSamples(
    trainings,
    'swim',
    options.context,
    options.asOfLocalDate,
  )
  const anchors = selectDistanceAnchors(samples)
  if (!hasDistanceDiversity(anchors)) {
    return insufficient(anchors.length)
  }

  const twoHundred = fastestAtDistance(samples, 200)
  const fourHundred = fastestAtDistance(samples, 400)
  const css = twoHundred && fourHundred ? fitCss(twoHundred, fourHundred) : null
  const cssAnchors: DistanceSample[] = []
  if (css && twoHundred && fourHundred) {
    cssAnchors.push(
      twoHundred,
      fourHundred,
      ...anchors.filter(
        (sample) =>
          sample.training.id !== twoHundred.training.id &&
          sample.training.id !== fourHundred.training.id,
      ),
    )
  }
  const model = css ?? fitPowerLaw(anchors)
  const modelAnchors = css ? cssAnchors : anchors
  if (!model || modelAnchors.length < 3) {
    return insufficient(anchors.length)
  }
  return buildDistanceResult(model, modelAnchors, [750, 1_500], samples.length) ??
    insufficient(modelAnchors.length)
}

function eligiblePowerSamples(
  trainings: readonly ActualTraining[],
  context: CyclingContext,
  asOfLocalDate: string,
): PowerSample[] {
  return trainings.flatMap((training) => {
    if (
      !isComparableContinuousTraining(
        training,
        'bike',
        context,
        asOfLocalDate,
        'power',
      ) ||
      !isInRollingMonthWindow(training.localDate, asOfLocalDate) ||
      training.durationSeconds === null ||
      training.durationSeconds <= 0 ||
      training.averagePowerWatts === null ||
      training.averagePowerWatts <= 0
    ) {
      return []
    }
    return [{
      training,
      durationSeconds: training.durationSeconds,
      averagePowerWatts: training.averagePowerWatts,
    }]
  })
}

function selectPowerAnchors(samples: readonly PowerSample[]): PowerSample[] {
  const strongestByDuration = new Map<number, PowerSample>()
  samples.forEach((sample) => {
    const bucket = durationBucket(sample.durationSeconds)
    const current = strongestByDuration.get(bucket)
    if (!current || sample.averagePowerWatts > current.averagePowerWatts) {
      strongestByDuration.set(bucket, sample)
    }
  })
  return [...strongestByDuration.values()].sort(
    (left, right) => left.durationSeconds - right.durationSeconds,
  )
}

function analyzeBikePower(
  anchors: readonly PowerSample[],
  weightKg: number | null,
): BikePerformanceAnalysis | null {
  if (
    anchors.length < 3 ||
    anchors.at(-1)!.durationSeconds / anchors[0].durationSeconds < 2
  ) {
    return null
  }
  const fit = linearRegression(
    anchors.map((sample) => [
      sample.durationSeconds,
      sample.averagePowerWatts * sample.durationSeconds,
    ]),
  )
  if (!fit || fit.slope <= 0 || fit.intercept <= 0) {
    return null
  }
  return {
    status: 'ready',
    model: 'critical-power',
    anchorIds: anchors.map((sample) => sample.training.id),
    criticalPowerWatts: fit.slope,
    criticalPowerWattsPerKg:
      weightKg !== null && weightKg > 0 ? fit.slope / weightKg : null,
    workCapacityJoules: fit.intercept,
  }
}

function analyzeBikeDistance(
  samples: readonly DistanceSample[],
): BikeDistanceAnalysis | null {
  const anchors = selectDistanceAnchors(samples)
  if (!hasDistanceDiversity(anchors)) {
    return null
  }
  const model = fitPowerLaw(anchors)
  if (!model) {
    return null
  }
  const result = buildDistanceResult(
    model,
    anchors,
    [20_000, 40_000],
    samples.length,
  )
  return result?.model === 'power-law' ? (result as BikeDistanceAnalysis) : null
}

export function analyzeBike(
  trainings: readonly ActualTraining[],
  options: BikeAnalysisOptions,
): BikePerformanceAnalysis {
  const powerSamples = eligiblePowerSamples(
    trainings,
    options.context,
    options.asOfLocalDate,
  )
  const powerAnchors = selectPowerAnchors(powerSamples)
  const powerResult = analyzeBikePower(
    powerAnchors,
    options.weightKg,
  )
  if (powerResult) {
    return powerResult
  }

  const distanceSamples = eligibleDistanceSamples(
    trainings,
    'bike',
    options.context,
    options.asOfLocalDate,
  )
  const distanceResult = analyzeBikeDistance(distanceSamples)
  return distanceResult ??
    insufficient(
      Math.max(powerAnchors.length, selectDistanceAnchors(distanceSamples).length),
    )
}

export function calculateDisciplineProgressIndex(
  baselineValue: number,
  currentValue: number,
  higherIsBetter: boolean,
): number | null {
  if (baselineValue <= 0 || currentValue <= 0) {
    return null
  }
  return higherIsBetter
    ? (currentValue / baselineValue) * 100
    : (baselineValue / currentValue) * 100
}

export function calculateOverallProgressIndex(indices: {
  swim: number | null
  bike: number | null
  run: number | null
}): number | null {
  const values = [indices.swim, indices.bike, indices.run]
  if (values.some((value) => value === null || value <= 0)) {
    return null
  }
  return Math.cbrt(values[0]! * values[1]! * values[2]!)
}
