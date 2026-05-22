import { useEffect, useMemo } from 'react'

import type {
  PlayerScore,
  ProgressDataset,
  ProgressDashboardState,
  ProgressEvent,
  ProgressEventDelta,
  ProgressEventIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

export const progressColorPresets = [
  '#027a9f',
  '#12b296',
  '#feaa01',
  '#7c3aed',
  '#dc2626',
  '#16a34a',
  '#2563eb',
  '#ea580c',
]

export const progressEventIcons: {
  id: ProgressEventIcon
  label: string
  chartLabel: string
}[] = [
  { id: 'plus', label: 'Plus', chartLabel: '+' },
  { id: 'minus', label: 'Minus', chartLabel: '-' },
  { id: 'check', label: 'Check', chartLabel: 'OK' },
  { id: 'star', label: 'Star', chartLabel: '*' },
  { id: 'bolt', label: 'Blitz', chartLabel: '!' },
  { id: 'flag', label: 'Flagge', chartLabel: 'F' },
  { id: 'cup', label: 'Cup', chartLabel: 'C' },
]

const activeDatasetId = 'dataset-current'

const defaultPlayers: ProgressPlayer[] = Array.from({ length: 5 }, (_, index) => ({
  id: `person-${index + 1}`,
  name: `Person ${index + 1}`,
  position: index + 1,
  color: progressColorPresets[index % progressColorPresets.length],
}))

const initialState: ProgressDashboardState = {
  activeDatasetId,
}

function createRandomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createDataset(position = 1): ProgressDataset {
  const now = new Date().toISOString()

  return {
    id: activeDatasetId,
    position,
    name: 'Aktueller Datensatz',
    chartTitle: 'Fortschritt ueber Zeit',
    topic: 'Aufgaben-Challenge',
    unit: 'Aufgaben',
    status: 'active',
    createdAtClientIso: now,
    archivedAtClientIso: null,
    events: [],
  }
}

function omitDatasetId(dataset: ProgressDataset): Omit<ProgressDataset, 'id'> {
  const { id, ...value } = dataset

  void id

  return value
}

function fallbackPlayerName(player: Pick<ProgressPlayer, 'id' | 'position'>) {
  const position = Number.isFinite(player.position)
    ? player.position
    : Number(player.id.replace('person-', ''))

  return `Person ${Number.isFinite(position) ? position : 1}`
}

function sanitizeName(
  name: string,
  player: Pick<ProgressPlayer, 'id' | 'position'>,
) {
  const trimmedName = name.trim()

  return trimmedName || fallbackPlayerName(player)
}

function sanitizeColor(color: string, fallback: string) {
  const trimmed = color.trim()

  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : fallback
}

function normalizePlayer(player: ProgressPlayer, index: number): ProgressPlayer {
  const position = Number.isFinite(player.position)
    ? Number(player.position)
    : index + 1
  const fallbackColor = progressColorPresets[index % progressColorPresets.length]

  return {
    ...player,
    position,
    name: sanitizeName(player.name ?? '', { id: player.id, position }),
    color: sanitizeColor(player.color ?? fallbackColor, fallbackColor),
  }
}

function normalizeDataset(dataset: ProgressDataset): ProgressDataset {
  return {
    ...dataset,
    chartTitle: dataset.chartTitle?.trim() || 'Fortschritt ueber Zeit',
    createdAtClientIso: dataset.createdAtClientIso || new Date().toISOString(),
    archivedAtClientIso: dataset.archivedAtClientIso ?? null,
    events: (dataset.events ?? []).map((event, index) => ({
      ...event,
      valueDelta: event.valueDelta === -1 ? -1 : 1,
      icon: event.icon ?? (event.valueDelta === -1 ? 'minus' : 'plus'),
      position: Number.isFinite(event.position) ? event.position : index + 1,
      createdAtClientIso: event.createdAtClientIso || new Date().toISOString(),
      createdAtLabel: event.createdAtLabel || event.createdAtClientIso,
    })),
    name: dataset.name?.trim() || 'Datensatz',
    position: Number.isFinite(dataset.position) ? dataset.position : 1,
    status: dataset.status === 'archived' ? 'archived' : 'active',
    topic: dataset.topic?.trim() || 'Aufgaben-Challenge',
    unit: dataset.unit?.trim() || 'Punkte',
  }
}

function getPlayerScores(
  players: ProgressPlayer[],
  events: ProgressEvent[],
): PlayerScore[] {
  const scores = new Map(players.map((player) => [player.id, 0]))
  const sortedEvents = [...events].sort(
    (left, right) =>
      Date.parse(left.createdAtClientIso) - Date.parse(right.createdAtClientIso) ||
      left.position - right.position,
  )

  sortedEvents.forEach((event) => {
    if (!scores.has(event.playerId)) {
      return
    }

    const currentScore = scores.get(event.playerId) ?? 0
    scores.set(event.playerId, Math.max(0, currentScore + event.valueDelta))
  })

  return players.map((player) => ({
    player,
    score: scores.get(player.id) ?? 0,
  }))
}

export function useProgressDashboard(sessionId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.progressDashboardState(sessionId),
    [sessionId],
  )
  const playersPath = useMemo(
    () => firebasePaths.progressDashboardPlayers(sessionId),
    [sessionId],
  )
  const datasetsPath = useMemo(
    () => firebasePaths.progressDashboardDatasets(sessionId),
    [sessionId],
  )
  const stateStore = useFirestoreDoc<ProgressDashboardState>(
    statePath,
    initialState,
  )
  const playersStore = useFirestoreCollection<ProgressPlayer>(
    playersPath,
    defaultPlayers,
  )
  const datasetsStore = useFirestoreCollection<ProgressDataset>(
    datasetsPath,
    [createDataset()],
  )

  const players = useMemo(
    () => playersStore.data.map(normalizePlayer),
    [playersStore.data],
  )
  const datasets = useMemo(
    () => datasetsStore.data.map(normalizeDataset),
    [datasetsStore.data],
  )
  const activeDataset =
    datasets.find((dataset) => dataset.id === stateStore.data.activeDatasetId) ??
    datasets.find((dataset) => dataset.status === 'active') ??
    createDataset()
  const archivedDatasets = datasets
    .filter((dataset) => dataset.status === 'archived')
    .sort(
      (left, right) =>
        Date.parse(right.archivedAtClientIso ?? right.createdAtClientIso) -
        Date.parse(left.archivedAtClientIso ?? left.createdAtClientIso),
    )
  const playerScores = useMemo(
    () => getPlayerScores(players, activeDataset.events),
    [activeDataset.events, players],
  )
  const leader = [...playerScores].sort((left, right) => right.score - left.score)[0]

  useEffect(() => {
    if (playersStore.isLoading || playersStore.data.length > 0) {
      return
    }

    playersStore.saveItems(
      defaultPlayers.map((player) => ({
        ...player,
        lastUpdatedBy: session.userId,
      })),
    )
  }, [playersStore, session.userId])

  useEffect(() => {
    if (datasetsStore.isLoading || datasetsStore.data.length > 0) {
      return
    }

    datasetsStore.saveItems([
      {
        ...createDataset(),
        lastUpdatedBy: session.userId,
      },
    ])
  }, [datasetsStore, session.userId])

  const saveActiveDataset = (partialValue: Partial<ProgressDataset>) =>
    datasetsStore.mergeItem(activeDataset.id, {
      ...partialValue,
      lastUpdatedBy: session.userId,
    })

  const updateActiveDatasetMeta = (
    field: 'name' | 'chartTitle' | 'topic' | 'unit',
    value: string,
  ) => saveActiveDataset({ [field]: value.trim() || createDataset()[field] })

  const addPlayer = () => {
    const nextPosition =
      players.reduce((max, player) => Math.max(max, player.position), 0) + 1
    const id = `person-${nextPosition}`

    return playersStore.setItem(id, {
      name: `Person ${nextPosition}`,
      position: nextPosition,
      color: progressColorPresets[(nextPosition - 1) % progressColorPresets.length],
      lastUpdatedBy: session.userId,
    })
  }

  const removePlayer = (playerId: string) => playersStore.deleteItem(playerId)

  const updatePlayerName = (playerId: string, name: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      name: sanitizeName(name, player),
      lastUpdatedBy: session.userId,
    })
  }

  const updatePlayerColor = (playerId: string, color: string) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      color: sanitizeColor(color, player.color),
      lastUpdatedBy: session.userId,
    })
  }

  const addEvent = (player: ProgressPlayer, valueDelta: ProgressEventDelta) => {
    const score = playerScores.find((entry) => entry.player.id === player.id)?.score ?? 0

    if (valueDelta < 0 && score <= 0) {
      return Promise.resolve(false)
    }

    const now = new Date().toISOString()
    const nextPosition =
      activeDataset.events.reduce(
        (max, event) => Math.max(max, event.position),
        0,
      ) + 1
    const event: ProgressEvent = {
      id: `event-${createRandomId()}`,
      playerId: player.id,
      playerName: player.name,
      playerColor: player.color,
      valueDelta,
      icon: valueDelta === -1 ? 'minus' : 'plus',
      createdAtClientIso: now,
      createdAtLabel: now,
      position: nextPosition,
      lastUpdatedBy: session.userId,
    }

    return saveActiveDataset({
      events: [...activeDataset.events, event],
    }).then(() => true)
  }

  const updateEvent = (
    eventId: string,
    partialValue: Partial<
      Pick<ProgressEvent, 'createdAtClientIso' | 'icon' | 'valueDelta'>
    >,
  ) =>
    saveActiveDataset({
      events: activeDataset.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              ...partialValue,
              createdAtLabel:
                partialValue.createdAtClientIso ?? event.createdAtClientIso,
              lastUpdatedBy: session.userId,
            }
          : event,
      ),
    })

  const deleteEvent = (eventId: string) =>
    saveActiveDataset({
      events: activeDataset.events.filter((event) => event.id !== eventId),
    })

  const resetAndArchiveDataset = async () => {
    const now = new Date().toISOString()
    const archiveId = `dataset-${createRandomId()}`
    const archivePosition =
      datasets.reduce((max, dataset) => Math.max(max, dataset.position), 0) + 1
    const archiveValue = omitDatasetId(activeDataset)
    const newDatasetValue = omitDatasetId(createDataset(1))

    await datasetsStore.setItem(archiveId, {
      ...archiveValue,
      position: archivePosition,
      status: 'archived',
      archivedAtClientIso: now,
      lastUpdatedBy: session.userId,
    })
    await datasetsStore.setItem(activeDatasetId, {
      ...newDatasetValue,
      lastUpdatedBy: session.userId,
    })
    await stateStore.merge({
      activeDatasetId,
      updatedBy: session.userId,
    })
  }

  const updateArchivedDatasetName = (datasetId: string, name: string) =>
    datasetsStore.mergeItem(datasetId, {
      name: name.trim() || 'Archivierter Datensatz',
      lastUpdatedBy: session.userId,
    })

  const deleteDataset = (datasetId: string) => datasetsStore.deleteItem(datasetId)

  return {
    activeDataset,
    addEvent,
    addPlayer,
    archivedDatasets,
    deleteDataset,
    deleteEvent,
    error: stateStore.error ?? playersStore.error ?? datasetsStore.error,
    isLoading:
      stateStore.isLoading || playersStore.isLoading || datasetsStore.isLoading,
    isRealtime:
      stateStore.isRealtime && playersStore.isRealtime && datasetsStore.isRealtime,
    leader,
    playerScores,
    players,
    progressEventIcons,
    progressColorPresets,
    removePlayer,
    resetAndArchiveDataset,
    updateActiveDatasetMeta,
    updateArchivedDatasetName,
    updateEvent,
    updatePlayerColor,
    updatePlayerName,
  }
}
