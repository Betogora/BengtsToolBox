export type Discipline = 'swim' | 'bike' | 'run'

export const trainingContexts = {
  swim: ['pool-50', 'pool-25', 'open-water'],
  bike: ['indoor', 'outdoor'],
  run: ['road', 'treadmill'],
} as const

export type SwimmingContext = (typeof trainingContexts.swim)[number]
export type CyclingContext = (typeof trainingContexts.bike)[number]
export type RunningContext = (typeof trainingContexts.run)[number]
export type TrainingContext =
  | SwimmingContext
  | CyclingContext
  | RunningContext

/** Also the context of older trainings saved without one. */
export const defaultTrainingContexts = {
  swim: 'pool-50',
  bike: 'indoor',
  run: 'road',
} as const satisfies Record<Discipline, TrainingContext>

export const defaultWalkContext = 'treadmill' satisfies RunningContext

export type RunVariant = 'run' | 'walk'

/** Pace in seconds per kilometre used to complete planned walks and runs. */
export const defaultPlanPaces = {
  walk: 600,
  run: 420,
} as const satisfies Record<RunVariant, number>

export type PlanPaces = Record<RunVariant, number>

export type TrackerSettings = {
  schemaVersion: 1
  weightKg: number | null
  /** Missing values fall back to `defaultPlanPaces`. */
  planPaceSecondsPerKilometer?: Partial<Record<RunVariant, number>>
  updatedBy?: string
}

export type PlannedTraining = {
  id: string
  position: number
  localDate: string
  startMinutes: number | null
  discipline: Discipline
  /** Walking is a variant of running, never a discipline of its own. */
  isWalk?: boolean
  /** Treadmill incline in percent; only for walks and runs. */
  inclinePercent?: number | null
  durationSeconds: number | null
  distanceMeters: number | null
  label: string
  lastUpdatedBy?: string
}

export type IntervalSegment = {
  id: string
  position: number
  kind: 'work' | 'rest'
  durationSeconds: number | null
  distanceMeters: number | null
  averageHeartRateBpm: number | null
  averagePowerWatts: number | null
}

export type ActualTraining = {
  isBenchmark?: boolean
  id: string
  position: number
  analyticsAvailableFromLocalDate?: string
  distanceAnalyticsAvailableFromLocalDate?: string
  powerAnalyticsAvailableFromLocalDate?: string
  localDate: string
  startMinutes: number | null
  discipline: Discipline
  /** Walking is a variant of running, never a discipline of its own. */
  isWalk?: boolean
  /** Treadmill incline in percent; only for walks and runs. */
  inclinePercent?: number | null
  context: TrainingContext | null
  durationSeconds: number | null
  distanceMeters: number | null
  averageHeartRateBpm: number | null
  averagePowerWatts: number | null
  rpe: number | null
  intervals: IntervalSegment[]
  lastUpdatedBy?: string
}

export type ValidationIssue = {
  field: string
  code:
    | 'required'
    | 'invalid-date'
    | 'out-of-range'
    | 'context-mismatch'
    | 'too-long'
    | 'too-many'
    | 'interval-sum-mismatch'
  severity: 'error' | 'warning'
}

export type DisciplineWeekStats = {
  trainingCount: number
  durationSeconds: number
  distanceMeters: number
}

export type WeekStats = {
  weekStart: string
  totalTrainingCount: number
  totalDurationSeconds: number
  byDiscipline: Record<Discipline, DisciplineWeekStats>
}

export type PerformanceEstimate = {
  targetDistanceMeters: number
  predictedDurationSeconds: number
  extrapolated?: boolean
}

export type InsufficientPerformanceAnalysis = {
  status: 'insufficient-data'
  availableAnchors: number
  requiredAnchors: number
}

export type DistancePerformanceAnalysis = {
  basis: 'benchmark' | 'training'
  status: 'ready'
  model: 'critical-speed' | 'critical-swim-speed' | 'power-law'
  anchorIds: string[]
  supportingTrainingCount: number
  estimates: PerformanceEstimate[]
  criticalSpeedMetersPerSecond?: number
  distanceCapacityMeters?: number
  powerLawExponent?: number
}

export type BikePowerAnalysis = {
  basis: 'benchmark' | 'training'
  status: 'ready'
  model: 'critical-power'
  anchorIds: string[]
  criticalPowerWatts: number
  criticalPowerWattsPerKg: number | null
  workCapacityJoules: number
  distanceAnalysis?: BikeDistanceAnalysis
}

export type BikeDistanceAnalysis = DistancePerformanceAnalysis & {
  model: 'power-law'
}

export type BikePerformanceAnalysis =
  | InsufficientPerformanceAnalysis
  | BikePowerAnalysis
  | BikeDistanceAnalysis
