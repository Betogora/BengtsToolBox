import type { Discipline } from '@/apps/triathlon-tracker/types'

export type ChartRange = '4w' | '12w' | '6m' | '1y' | 'all'

export type PerformanceChartPoint = {
  localDate: string
  label: string
  basis: 'benchmark' | 'training' | null
  primaryValue: number | null
  secondaryValue: number | null
  primaryDisplayValue: number | null
  secondaryDisplayValue: number | null
}

export type PerformanceActivityPoint = {
  activityId: string
  localDate: string
  label: string
  value: number
}

export type PerformancePlot = {
  id: 'swim' | 'bike' | 'run'
  title: string
  primaryLabel: string
  secondaryLabel: string | null
  activityLabel: string
  modelUnit: 'seconds' | 'watts'
  unit: 'kilometers-per-hour' | 'watts'
  points: PerformanceChartPoint[]
  activityPoints: PerformanceActivityPoint[]
}

export type ProgressChartPoint = {
  localDate: string
  label: string
  swim: number | null
  bike: number | null
  run: number | null
  overall: number | null
}

export type WeeklyVolumeChartPoint = {
  weekStart: string
  label: string
  swimHours: number
  bikeHours: number
  runHours: number
  /** Strength has a duration only, so it joins the time view alone. */
  strengthHours: number
  swimKilometers: number
  bikeKilometers: number
  runKilometers: number
}

export type EfficiencyChartPoint = {
  activityId: string
  localDate: string
  averageHeartRateBpm: number
  speedMetersPerSecond: number
  normalizedSpeedMetersPerSecond: number
  trendSpeedMetersPerSecond: number
  /** Interval sessions are drawn as rings. */
  source?: 'continuous' | 'intervals'
}

export type EfficiencyPlot = {
  /** Unique per plot; walking shares the running discipline. */
  key: string
  id: Discipline
  title: string
  /** Walks are shown as flat running equivalent. */
  unitNote?: string
  referenceHeartRateBpm: number
  points: EfficiencyChartPoint[]
}

/** A clicked (pinned) or hovered data point, in axis units. */
export type SelectedPoint = {
  key: string
  timestamp: number
  value: number
  localDate: string
  seriesLabel: string
  isModel: boolean
  modelDisplayValue?: number | null
  basis?: 'benchmark' | 'training' | null
  heartRateBpm?: number
  actualValue?: number
  actualLabel?: string
}
