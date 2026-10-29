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
  let strengthDurationSeconds = 0

  inWeek.forEach((training) => {
    // Strength counts towards time only, never as a discipline.
    if (training.discipline === 'strength') {
      strengthDurationSeconds += training.durationSeconds ?? 0
      return
    }
    const stats = byDiscipline[training.discipline]
    stats.trainingCount += 1
    stats.durationSeconds += training.durationSeconds ?? 0
    stats.distanceMeters += training.distanceMeters ?? 0
  })

  return {
    weekStart,
    totalTrainingCount: inWeek.length,
    totalDurationSeconds: inWeek.reduce(
      (sum, training) => sum + (training.durationSeconds ?? 0),
      0,
    ),
    byDiscipline,
    strengthDurationSeconds,
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
