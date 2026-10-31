import type {
  ActualTraining,
  PlannedTraining,
} from '@/apps/triathlon-tracker/types'

function sessionKey(training: Pick<PlannedTraining, 'localDate' | 'discipline' | 'isWalk'>) {
  return `${training.localDate}|${training.discipline}|${training.isWalk ? 'walk' : 'default'}`
}

function byStartTime(
  left: Pick<PlannedTraining, 'startMinutes' | 'position'>,
  right: Pick<PlannedTraining, 'startMinutes' | 'position'>,
) {
  return (
    (left.startMinutes ?? 1440) - (right.startMinutes ?? 1440) ||
    left.position - right.position
  )
}

/**
 * Plans count as done when an actual session of the same day, discipline and
 * running variant exists. Several plans of one kind consume actual sessions in
 * planned order, so two planned runs need two logged runs. Each done plan maps
 * to the session that completed it.
 */
export function getCompletedPlannedTrainings(
  plannedTrainings: readonly PlannedTraining[],
  actualTrainings: readonly ActualTraining[],
): Map<string, ActualTraining> {
  const actualByKey = new Map<string, ActualTraining[]>()
  for (const training of [...actualTrainings].sort(byStartTime)) {
    const key = sessionKey(training)
    const sessions = actualByKey.get(key)
    if (sessions) sessions.push(training)
    else actualByKey.set(key, [training])
  }
  const completed = new Map<string, ActualTraining>()
  for (const training of [...plannedTrainings].sort(byStartTime)) {
    const match = actualByKey.get(sessionKey(training))?.shift()
    if (match) completed.set(training.id, match)
  }
  return completed
}
