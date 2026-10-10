import type {
  ActualTraining,
  PlannedTraining,
} from '@/apps/triathlon-tracker/types'

function sessionKey(training: Pick<PlannedTraining, 'localDate' | 'discipline' | 'isWalk'>) {
  return `${training.localDate}|${training.discipline}|${training.isWalk ? 'walk' : 'default'}`
}

/**
 * Plans count as done when an actual session of the same day, discipline and
 * running variant exists. Several plans of one kind consume actual sessions in
 * planned order, so two planned runs need two logged runs.
 */
export function getCompletedPlannedTrainingIds(
  plannedTrainings: readonly PlannedTraining[],
  actualTrainings: readonly ActualTraining[],
): Set<string> {
  const actualCounts = new Map<string, number>()
  for (const training of actualTrainings) {
    const key = sessionKey(training)
    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1)
  }
  const completed = new Set<string>()
  const ordered = [...plannedTrainings].sort(
    (left, right) =>
      (left.startMinutes ?? 1440) - (right.startMinutes ?? 1440) ||
      left.position - right.position,
  )
  for (const training of ordered) {
    const key = sessionKey(training)
    const remaining = actualCounts.get(key) ?? 0
    if (remaining > 0) {
      completed.add(training.id)
      actualCounts.set(key, remaining - 1)
    }
  }
  return completed
}
