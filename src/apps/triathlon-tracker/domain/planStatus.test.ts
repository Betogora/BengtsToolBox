import { describe, expect, it } from 'vitest'

import type {
  ActualTraining,
  PlannedTraining,
} from '@/apps/triathlon-tracker/types'
import { getCompletedPlannedTrainingIds } from './planStatus'

const plan = (
  id: string,
  position: number,
  isWalk = false,
): PlannedTraining => ({
  id,
  position,
  localDate: '2026-10-16',
  startMinutes: null,
  discipline: 'run',
  isWalk,
  durationSeconds: 1_800,
  distanceMeters: null,
  label: '',
})

const actual = (id: string, isWalk = false): ActualTraining => ({
  id,
  position: 1,
  localDate: '2026-10-16',
  startMinutes: null,
  discipline: 'run',
  isWalk,
  context: 'treadmill',
  durationSeconds: 1_800,
  distanceMeters: null,
  averageHeartRateBpm: null,
  averagePowerWatts: null,
  rpe: null,
  intervals: [],
})

describe('planned training status', () => {
  it('matches day, discipline and running variant and consumes sessions in order', () => {
    const completed = getCompletedPlannedTrainingIds(
      [plan('second-run', 2), plan('first-run', 1), plan('walk', 3, true)],
      [actual('logged-run')],
    )

    expect([...completed]).toEqual(['first-run'])
  })

  it('marks a planned walk done only by a logged walk', () => {
    expect([
      ...getCompletedPlannedTrainingIds([plan('walk', 1, true)], [actual('walk', true)]),
    ]).toEqual(['walk'])
  })
})
