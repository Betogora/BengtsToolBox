import type {
  ActualTraining,
  Discipline,
  DisciplineWeekStats,
  WeekStats,
} from '@/apps/triathlon-tracker/types'
import {
  addDaysToLocalDate,
  getWeekStartLocalDate,
  getWeekStartsInRange,
} from './dates'

function emptyDisciplineStats(): Record<Discipline, DisciplineWeekStats> {
  return {
    swim: { trainingCount: 0, durationSeconds: 0, distanceMeters: 0 },
    bike: { trainingCount: 0, durationSeconds: 0, distanceMeters: 0 },
    run: { trainingCount: 0, durationSeconds: 0, distanceMeters: 0 },
  }
}
export function summarizeWeek(
  trainings: readonly ActualTraining[],
  localDateInWeek: string,
): WeekStats {
  const weekStart = getWeekStartLocalDate(localDateInWeek)
  const weekEnd = addDaysToLocalDate(weekStart, 6)
  const inWeek = trainings.filter(
    (training) =>
      training.localDate >= weekStart && training.localDate <= weekEnd,
  )
  const byDiscipline = emptyDisciplineStats()

  inWeek.forEach((training) => {
    const stats = byDiscipline[training.discipline]
    stats.trainingCount += 1
    stats.durationSeconds += training.durationSeconds ?? 0
    stats.distanceMeters += training.distanceMeters ?? 0
  })

  return {
    weekStart,
    totalTrainingCount: inWeek.length,
    totalDurationSeconds: Object.values(byDiscipline).reduce(
      (sum, stats) => sum + stats.durationSeconds,
      0,
    ),
    byDiscipline,
  }
}

export function summarizeWeeks(
  trainings: readonly ActualTraining[],
  fromLocalDate: string,
  toLocalDate: string,
): WeekStats[] {
  return getWeekStartsInRange(fromLocalDate, toLocalDate).map((weekStart) =>
    summarizeWeek(trainings, weekStart),
  )
}
