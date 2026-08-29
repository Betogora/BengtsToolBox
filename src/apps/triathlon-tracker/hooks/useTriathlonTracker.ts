import { useMemo } from 'react'

import {
  addDaysToLocalDate,
  getCurrentLocalDate,
  getWeekStartLocalDate,
} from '@/apps/triathlon-tracker/domain/dates'
import {
  validateActualTraining,
  validateSettings,
} from '@/apps/triathlon-tracker/domain/validation'
import type {
  ActualTraining,
  PlannedTraining,
  TrackerSettings,
} from '@/apps/triathlon-tracker/types'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import { commitSyncBatch } from '@/lib/firebase/syncBatch'
import { SyncError, syncFailure } from '@/lib/firebase/syncError'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

export type PlannedTrainingInput = Omit<
  PlannedTraining,
  'id' | 'lastUpdatedBy' | 'position'
>

export type ActualTrainingInput = Omit<
  ActualTraining,
  | 'analyticsAvailableFromLocalDate'
  | 'distanceAnalyticsAvailableFromLocalDate'
  | 'id'
  | 'lastUpdatedBy'
  | 'position'
  | 'powerAnalyticsAvailableFromLocalDate'
>

export type TrackerSettingsInput = Pick<
  TrackerSettings,
  'weightKg'
>

export type PlannedWeekCopyPreview = {
  sourceWeekStartLocalDate: string
  targetWeekStartLocalDate: string
  sourceTrainings: PlannedTraining[]
  existingTargetTrainings: PlannedTraining[]
  copies: PlannedTrainingInput[]
}

export const initialTrackerSettings: TrackerSettings = {
  schemaVersion: 1,
  weightKg: null,
}

function rejectedWrite(message: string) {
  return Promise.resolve(
    syncFailure(
      undefined,
      new SyncError(
        message,
        'firestore',
        'set-item',
        'write-rejected',
        false,
      ),
    ),
  )
}

function compareTrainings(
  left: Pick<PlannedTraining, 'position' | 'startMinutes'>,
  right: Pick<PlannedTraining, 'position' | 'startMinutes'>,
) {
  return (
    (left.startMinutes ?? Number.MAX_SAFE_INTEGER) -
      (right.startMinutes ?? Number.MAX_SAFE_INTEGER) ||
    left.position - right.position
  )
}

function getPerformanceAnalyticsChanges(
  training: ActualTraining,
  partial: Partial<ActualTrainingInput>,
) {
  const structuralFields = [
    'localDate',
    'discipline',
    'context',
    'durationSeconds',
  ] as const

  const structural = structuralFields.some(
    (field) => field in partial && partial[field] !== training[field],
  ) || (
    'intervals' in partial &&
    JSON.stringify(partial.intervals) !== JSON.stringify(training.intervals)
  )
  return {
    structural,
    distance:
      'distanceMeters' in partial &&
      partial.distanceMeters !== training.distanceMeters,
    power:
      'averagePowerWatts' in partial &&
      partial.averagePowerWatts !== training.averagePowerWatts,
  }
}

function toPlannedTrainingInput(
  training: PlannedTraining,
  localDate: string,
): PlannedTrainingInput {
  const { id, lastUpdatedBy, position, ...input } = training

  void id
  void lastUpdatedBy
  void position

  return { ...input, localDate }
}

export function createPlannedWeekCopyPreview(
  plannedTrainings: PlannedTraining[],
  sourceLocalDate: string,
  targetLocalDate: string,
): PlannedWeekCopyPreview {
  const sourceWeekStartLocalDate = getWeekStartLocalDate(sourceLocalDate)
  const targetWeekStartLocalDate = getWeekStartLocalDate(targetLocalDate)
  const sourceWeekEnd = addDaysToLocalDate(sourceWeekStartLocalDate, 6)
  const targetWeekEnd = addDaysToLocalDate(targetWeekStartLocalDate, 6)
  const sourceTrainings = plannedTrainings
    .filter(
      (training) =>
        training.localDate >= sourceWeekStartLocalDate &&
        training.localDate <= sourceWeekEnd,
    )
    .sort(compareTrainings)
  const existingTargetTrainings = plannedTrainings
    .filter(
      (training) =>
        training.localDate >= targetWeekStartLocalDate &&
        training.localDate <= targetWeekEnd,
    )
    .sort(compareTrainings)

  const copies =
    sourceWeekStartLocalDate === targetWeekStartLocalDate
      ? []
      : sourceTrainings.map((training) => {
          const sourceDayOffset = Math.round(
            (Date.parse(`${training.localDate}T00:00:00Z`) -
              Date.parse(`${sourceWeekStartLocalDate}T00:00:00Z`)) /
              86_400_000,
          )

          return toPlannedTrainingInput(
            training,
            addDaysToLocalDate(targetWeekStartLocalDate, sourceDayOffset),
          )
        })

  return {
    sourceWeekStartLocalDate,
    targetWeekStartLocalDate,
    sourceTrainings,
    existingTargetTrainings,
    copies,
  }
}

export function useTriathlonTracker(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.triathlonTrackerState(activeLobbyId),
    [activeLobbyId],
  )
  const plannedTrainingsPath = useMemo(
    () => firebasePaths.triathlonTrackerPlannedTrainings(activeLobbyId),
    [activeLobbyId],
  )
  const actualTrainingsPath = useMemo(
    () => firebasePaths.triathlonTrackerActualTrainings(activeLobbyId),
    [activeLobbyId],
  )
  const settingsStore = useFirestoreDoc<TrackerSettings>(
    statePath,
    initialTrackerSettings,
  )
  const plannedTrainingsStore = useFirestoreCollection<PlannedTraining>(
    plannedTrainingsPath,
    [],
    'position',
  )
  const actualTrainingsStore = useFirestoreCollection<ActualTraining>(
    actualTrainingsPath,
    [],
    'position',
  )

  const updateSettings = (partial: Partial<TrackerSettingsInput>) => {
    const nextSettings = { ...settingsStore.data, ...partial }
    if (validateSettings(nextSettings).some((issue) => issue.severity === 'error')) {
      return rejectedWrite('The tracker settings are invalid.')
    }
    return settingsStore.merge({ ...partial, updatedBy: session.userId })
  }

  const addPlannedTraining = (input: PlannedTrainingInput) => {
    const position =
      plannedTrainingsStore.data.reduce(
        (maximum, training) => Math.max(maximum, training.position),
        0,
      ) + 1

    return plannedTrainingsStore.setItem(createRandomId(), {
      ...input,
      position,
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlannedTraining = (
    id: string,
    partial: Partial<PlannedTrainingInput>,
  ) => {
    const training = plannedTrainingsStore.data.find((item) => item.id === id)
    if (!training) {
      return rejectedWrite('The planned training no longer exists.')
    }
    const { id: ignoredId, ...storedTraining } = training
    void ignoredId
    return plannedTrainingsStore.setItem(id, {
      ...storedTraining,
      ...partial,
      lastUpdatedBy: session.userId,
    })
  }

  const deletePlannedTraining = (id: string) =>
    plannedTrainingsStore.deleteItem(id)

  const addActualTraining = (input: ActualTrainingInput) => {
    const position =
      actualTrainingsStore.data.reduce(
        (maximum, training) => Math.max(maximum, training.position),
        0,
      ) + 1
    const analyticsAvailableFromLocalDate = getCurrentLocalDate()
    const training: ActualTraining = {
      ...input,
      analyticsAvailableFromLocalDate,
      id: 'validation',
      position,
    }
    if (validateActualTraining(training).some((issue) => issue.severity === 'error')) {
      return rejectedWrite('The actual training is invalid.')
    }

    return actualTrainingsStore.setItem(createRandomId(), {
      ...input,
      analyticsAvailableFromLocalDate,
      position,
      lastUpdatedBy: session.userId,
    })
  }

  const updateActualTraining = (
    id: string,
    partial: Partial<ActualTrainingInput>,
  ) => {
    const training = actualTrainingsStore.data.find((item) => item.id === id)
    if (!training) {
      return rejectedWrite('The actual training no longer exists.')
    }
    const nextTraining: ActualTraining = {
      ...training,
      ...partial,
      lastUpdatedBy: session.userId,
    }
    const analyticsChanges = getPerformanceAnalyticsChanges(training, partial)
    const analyticsChanged =
      analyticsChanges.structural || analyticsChanges.distance || analyticsChanges.power
    if (analyticsChanged) {
      const analyticsAvailableFromLocalDate = getCurrentLocalDate()
      if (analyticsChanges.structural) {
        nextTraining.analyticsAvailableFromLocalDate = analyticsAvailableFromLocalDate
      }
      if (analyticsChanges.distance) {
        nextTraining.distanceAnalyticsAvailableFromLocalDate = analyticsAvailableFromLocalDate
      }
      if (analyticsChanges.power) {
        nextTraining.powerAnalyticsAvailableFromLocalDate = analyticsAvailableFromLocalDate
      }
    }
    if (
      validateActualTraining(nextTraining).some(
        (issue) => issue.severity === 'error',
      )
    ) {
      return rejectedWrite('The actual training is invalid.')
    }
    const { id: ignoredId, ...storedTraining } = nextTraining
    void ignoredId
    return actualTrainingsStore.setItem(id, {
      ...storedTraining,
    })
  }

  const deleteActualTraining = (id: string) =>
    actualTrainingsStore.deleteItem(id)

  const previewPlannedWeekCopy = (
    sourceWeekStartLocalDate: string,
    targetWeekStartLocalDate: string,
  ) =>
    createPlannedWeekCopyPreview(
      plannedTrainingsStore.data,
      sourceWeekStartLocalDate,
      targetWeekStartLocalDate,
    )

  const copyPlannedWeek = (preview: PlannedWeekCopyPreview) => {
    const nextPosition =
      plannedTrainingsStore.data.reduce(
        (maximum, training) => Math.max(maximum, training.position),
        0,
      ) + 1

    return commitSyncBatch((batch) => {
      preview.copies.forEach((copy, index) => {
        plannedTrainingsStore.setItem(
          createRandomId(),
          {
            ...copy,
            position: nextPosition + index,
            lastUpdatedBy: session.userId,
          },
          batch,
        )
      })
    })
  }

  return {
    actualTrainings: actualTrainingsStore.data,
    addActualTraining,
    addPlannedTraining,
    copyPlannedWeek,
    deleteActualTraining,
    deletePlannedTraining,
    error:
      settingsStore.error ??
      plannedTrainingsStore.error ??
      actualTrainingsStore.error ??
      session.error,
    isLoading:
      settingsStore.isLoading ||
      plannedTrainingsStore.isLoading ||
      actualTrainingsStore.isLoading,
    isPending:
      settingsStore.isPending ||
      plannedTrainingsStore.isPending ||
      actualTrainingsStore.isPending,
    plannedTrainings: plannedTrainingsStore.data,
    previewPlannedWeekCopy,
    session,
    settings: settingsStore.data,
    updateActualTraining,
    updatePlannedTraining,
    updateSettings,
  }
}
