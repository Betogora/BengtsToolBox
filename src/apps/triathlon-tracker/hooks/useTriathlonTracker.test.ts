import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  ActualTraining,
  PlannedTraining,
  TrackerSettings,
} from '@/apps/triathlon-tracker/types'
import { getCurrentLocalDate } from '@/apps/triathlon-tracker/domain/dates'

const stores = vi.hoisted(() => {
  const action = () => vi.fn(() => Promise.resolve({ ok: true }))

  return {
    paths: [] as string[],
    settings: {
      data: {
        schemaVersion: 1,
        weightKg: null,
      } as TrackerSettings,
      error: null,
      isLoading: false,
      isPending: false,
      isRealtime: true,
      merge: action(),
      save: action(),
    },
    planned: {
      data: [] as PlannedTraining[],
      error: null,
      isLoading: false,
      isPending: false,
      isRealtime: true,
      clearItems: action(),
      deleteItem: action(),
      deleteItems: action(),
      mergeItem: action(),
      saveItems: action(),
      setItem: action(),
    },
    actual: {
      data: [] as ActualTraining[],
      error: null,
      isLoading: false,
      isPending: false,
      isRealtime: true,
      clearItems: action(),
      deleteItem: action(),
      deleteItems: action(),
      mergeItem: action(),
      saveItems: action(),
      setItem: action(),
    },
  }
})

vi.mock('@/lib/firebase/useAnonymousSession', () => ({
  useAnonymousSession: () => ({
    error: null,
    isLoading: false,
    isRealtime: true,
    userId: 'test-user',
  }),
}))

vi.mock('@/lobbies/LobbyContext', () => ({
  useActiveLobbyId: (lobbyId?: string) => lobbyId ?? 'default',
}))

vi.mock('@/lib/firebase/useFirestoreDoc', () => ({
  useFirestoreDoc: (path: string) => {
    stores.paths.push(path)
    return stores.settings
  },
}))

vi.mock('@/lib/firebase/useFirestoreCollection', () => ({
  useFirestoreCollection: (path: string) => {
    stores.paths.push(path)
    return path.endsWith('/planned-trainings') ? stores.planned : stores.actual
  },
}))

import {
  createPlannedWeekCopyPreview,
  useTriathlonTracker,
} from '@/apps/triathlon-tracker/hooks/useTriathlonTracker'

function plannedTraining(
  id: string,
  localDate: string,
  position: number,
): PlannedTraining {
  return {
    id,
    position,
    localDate,
    startMinutes: null,
    discipline: 'run',
    durationSeconds: 3_600,
    distanceMeters: 10_000,
    label: 'Locker',
  }
}

describe('Triathlon-Tracker-Wochenkopie', () => {
  it('verschiebt Quellpläne kalendertagsgenau und zeigt belegte Ziele an', () => {
    const sourceMonday = plannedTraining('source-mon', '2026-08-17', 1)
    const sourceSunday = plannedTraining('source-sun', '2026-08-23', 2)
    const existingTarget = plannedTraining('target', '2026-08-26', 3)

    const preview = createPlannedWeekCopyPreview(
      [sourceMonday, sourceSunday, existingTarget],
      '2026-08-19',
      '2026-08-25',
    )

    expect(preview.sourceWeekStartLocalDate).toBe('2026-08-17')
    expect(preview.targetWeekStartLocalDate).toBe('2026-08-24')
    expect(preview.sourceTrainings.map((training) => training.id)).toEqual([
      'source-mon',
      'source-sun',
    ])
    expect(preview.existingTargetTrainings).toEqual([existingTarget])
    expect(preview.copies.map((training) => training.localDate)).toEqual([
      '2026-08-24',
      '2026-08-30',
    ])
    expect(preview.copies[0]).not.toHaveProperty('id')
    expect(preview.copies[0]).not.toHaveProperty('position')
  })

  it('erstellt für dieselbe Quell- und Zielwoche keine Duplikate', () => {
    const preview = createPlannedWeekCopyPreview(
      [plannedTraining('source', '2026-08-17', 1)],
      '2026-08-17',
      '2026-08-23',
    )

    expect(preview.copies).toEqual([])
  })
})

describe('useTriathlonTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stores.paths.length = 0
    stores.planned.data = []
    stores.actual.data = []
    stores.settings.data = {
      schemaVersion: 1,
      weightKg: null,
    }
  })

  function renderHook(lobbyId?: string) {
    let tracker: ReturnType<typeof useTriathlonTracker> | undefined

    function Probe() {
      tracker = useTriathlonTracker(lobbyId)
      return null
    }

    renderToStaticMarkup(createElement(Probe))
    return tracker as ReturnType<typeof useTriathlonTracker>
  }

  it('bindet alle drei Stores an die aktive Lobby', () => {
    renderHook('ABC234')

    expect(stores.paths).toEqual([
      'lobbies/ABC234/apps/triathlon-tracker/state/default',
      'lobbies/ABC234/apps/triathlon-tracker/planned-trainings',
      'lobbies/ABC234/apps/triathlon-tracker/actual-trainings',
    ])
  })

  it('speichert fachliche CRUD-Aktionen mit Position und Gerätekennung', async () => {
    stores.actual.data = [
      {
        id: 'actual-1',
        position: 7,
        analyticsAvailableFromLocalDate: '2026-08-17',
        localDate: '2026-08-17',
        startMinutes: null,
        discipline: 'bike',
        context: 'outdoor',
        durationSeconds: 3_600,
        distanceMeters: 30_000,
        averageHeartRateBpm: null,
        averagePowerWatts: null,
        rpe: null,
        intervals: [],
      },
    ]
    const tracker = renderHook()

    await tracker.addActualTraining({
      localDate: '2026-08-20',
      startMinutes: 900,
      discipline: 'run',
      context: 'road',
      durationSeconds: 1_800,
      distanceMeters: 5_000,
      averageHeartRateBpm: 150,
      averagePowerWatts: null,
      rpe: 7,
      intervals: [],
    })
    await tracker.updateActualTraining('actual-1', { rpe: 6 })
    await tracker.deleteActualTraining('actual-1')

    expect(stores.actual.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        position: 8,
        lastUpdatedBy: 'test-user',
        discipline: 'run',
      }),
    )
    expect(stores.actual.setItem).toHaveBeenCalledWith(
      'actual-1',
      expect.objectContaining({
        position: 7,
        discipline: 'bike',
        rpe: 6,
        analyticsAvailableFromLocalDate: '2026-08-17',
        lastUpdatedBy: 'test-user',
      }),
    )
    expect(stores.actual.deleteItem).toHaveBeenCalledWith('actual-1')
  })

  it('setzt den Analysezeitpunkt nur bei leistungsrelevanten Änderungen neu', async () => {
    stores.actual.data = [{
      id: 'actual-1',
      position: 1,
      analyticsAvailableFromLocalDate: '2026-08-17',
      localDate: '2026-08-17',
      startMinutes: null,
      discipline: 'run',
      context: 'road',
      durationSeconds: 1_800,
      distanceMeters: 5_000,
      averageHeartRateBpm: null,
      averagePowerWatts: null,
      rpe: null,
      intervals: [],
    }]
    const tracker = renderHook()

    await tracker.updateActualTraining('actual-1', { rpe: 4 })
    await tracker.updateActualTraining('actual-1', { durationSeconds: 1_700 })
    await tracker.updateActualTraining('actual-1', { averagePowerWatts: 280 })

    expect(stores.actual.setItem).toHaveBeenNthCalledWith(
      1,
      'actual-1',
      expect.objectContaining({ analyticsAvailableFromLocalDate: '2026-08-17' }),
    )
    expect(stores.actual.setItem).toHaveBeenNthCalledWith(
      2,
      'actual-1',
      expect.objectContaining({
        analyticsAvailableFromLocalDate: getCurrentLocalDate(),
      }),
    )
    expect(stores.actual.setItem).toHaveBeenNthCalledWith(
      3,
      'actual-1',
      expect.objectContaining({
        analyticsAvailableFromLocalDate: '2026-08-17',
        powerAnalyticsAvailableFromLocalDate: getCurrentLocalDate(),
      }),
    )
  })

  it('weist ungültige Einstellungen vor dem Speichern zurück', async () => {
    const tracker = renderHook()

    const result = await tracker.updateSettings({ weightKg: 350 })

    expect(result.ok).toBe(false)
    expect(stores.settings.merge).not.toHaveBeenCalled()
  })

  it('legt ein parallel gelöschtes Training beim Speichern nicht neu an', async () => {
    const tracker = renderHook()

    const result = await tracker.updateActualTraining('deleted', { rpe: 6 })

    expect(result.ok).toBe(false)
    expect(stores.actual.setItem).not.toHaveBeenCalled()
    expect(stores.actual.mergeItem).not.toHaveBeenCalled()
  })

  it('übernimmt eine bestätigte Vorschau in genau einem SyncBatch', async () => {
    stores.planned.data = [plannedTraining('source', '2026-08-17', 5)]
    const tracker = renderHook()
    const preview = tracker.previewPlannedWeekCopy(
      '2026-08-17',
      '2026-08-24',
    )

    const result = await tracker.copyPlannedWeek(preview)

    expect(result.ok).toBe(true)
    expect(stores.planned.setItem).toHaveBeenCalledTimes(1)
    expect(stores.planned.setItem).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        localDate: '2026-08-24',
        position: 6,
        lastUpdatedBy: 'test-user',
      }),
      expect.any(Object),
    )
  })
})
