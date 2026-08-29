export type Discipline = 'swim' | 'bike' | 'run'

export type SwimmingContext = 'pool-25' | 'pool-50' | 'open-water'
export type CyclingContext = 'indoor' | 'outdoor'
export type RunningContext = 'road' | 'track' | 'treadmill'
export type TrainingContext =
  | SwimmingContext
  | CyclingContext
  | RunningContext

export const defaultTrainingContexts = {
  swim: 'pool-50',
  bike: 'outdoor',
  run: 'road',
} as const satisfies Record<Discipline, TrainingContext>

export type TrackerSettings = {
  schemaVersion: 1
  weightKg: number | null
  updatedBy?: string
}

export type PlannedTraining = {
  id: string
  position: number
  localDate: string
  startMinutes: number | null
  discipline: Discipline
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
  id: string
  position: number
  analyticsAvailableFromLocalDate?: string
  distanceAnalyticsAvailableFromLocalDate?: string
  powerAnalyticsAvailableFromLocalDate?: string
  localDate: string
  startMinutes: number | null
  discipline: Discipline
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
}

export type InsufficientPerformanceAnalysis = {
  status: 'insufficient-data'
  availableAnchors: number
  requiredAnchors: number
}

export type DistancePerformanceAnalysis = {
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
  status: 'ready'
  model: 'critical-power'
  anchorIds: string[]
  criticalPowerWatts: number
  criticalPowerWattsPerKg: number | null
  workCapacityJoules: number
}

export type BikeDistanceAnalysis = DistancePerformanceAnalysis & {
  model: 'power-law'
}

export type BikePerformanceAnalysis =
  | InsufficientPerformanceAnalysis
  | BikePowerAnalysis
  | BikeDistanceAnalysis
