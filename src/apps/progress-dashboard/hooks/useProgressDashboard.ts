import { useEffect, useMemo } from 'react'

import {
  createProgressPlayer,
  defaultProgressDrinkIcon,
  getPlayerScores,
} from '@/apps/progress-dashboard/logic'
import type {
  ProgressDataset,
  ProgressDashboardState,
  ProgressDrinkIcon,
  ProgressEvent,
  ProgressEventDelta,
  ProgressEventIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import {
  formatHistoricalDatasetName,
  getGeneratedDatasetBaseName,
  sequenceHistoricalRecordNames,
} from '@/apps/shared/historicalRecordNames'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import {
  getParticipantColorByPosition,
  normalizeParticipantColor,
  normalizeThemeColor,
  participantColorPresets,
} from '@/lib/theme'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreCollection } from '@/lib/firebase/useFirestoreCollection'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'
import { useActiveLobbyId } from '@/lobbies/LobbyContext'

export const progressColorPresets = [...participantColorPresets]

const defaultUnit = 'Getränke'
const legacyDefaultChartTitle = 'Fortschritt über Zeit'
const emptyUnitDefaultChartTitle = 'Dashboard'

function getDefaultChartTitle(unit: string) {
  const trimmedUnit = unit.trim()

  return trimmedUnit ? `${trimmedUnit}-Dashboard` : emptyUnitDefaultChartTitle
}

function isDefaultChartTitle(title: string, unit: string) {
  const trimmedTitle = title.trim()

  return (
    !trimmedTitle ||
    trimmedTitle === legacyDefaultChartTitle ||
    trimmedTitle === getDefaultChartTitle(unit)
  )
}

export const progressEventIcons: {
  id: ProgressEventIcon
  label: string
  chartLabel: string
}[] = [
  { id: 'plus', label: 'Plus', chartLabel: '+' },
  { id: 'minus', label: 'Minus', chartLabel: '-' },
  { id: 'wine', label: 'Wein', chartLabel: 'W' },
  { id: 'beer', label: 'Bier', chartLabel: 'B' },
  { id: 'schnaps', label: 'Schnaps', chartLabel: 'S' },
  { id: 'funnel', label: 'Trichter', chartLabel: 'T' },
]

export const progressDrinkIcons: {
  id: ProgressDrinkIcon
  label: string
  chartLabel: string
}[] = [
  { id: 'wine', label: 'Wein', chartLabel: 'W' },
  { id: 'beer', label: 'Bier', chartLabel: 'B' },
  { id: 'schnaps', label: 'Schnaps', chartLabel: 'S' },
  { id: 'funnel', label: 'Trichter', chartLabel: 'T' },
]

const activeDatasetId = 'dataset-current'

const defaultPlayers: ProgressPlayer[] = Array.from({ length: 5 }, (_, index) => ({
  id: `person-${index + 1}`,
  name: `Person ${index + 1}`,
  position: index + 1,
  color: progressColorPresets[index % progressColorPresets.length],
  defaultEventIcon: defaultProgressDrinkIcon,
}))

const initialState: ProgressDashboardState = {
  activeDatasetId,
}

function createDataset(position = 1): ProgressDataset {
  const now = new Date().toISOString()

  return {
    id: activeDatasetId,
    position,
    name: 'Datensatz',
    chartTitle: getDefaultChartTitle(defaultUnit),
    unit: defaultUnit,
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

function isDefaultPlayerName(name: string, position: number) {
  return name === `Person ${position}`
}

function sanitizeColor(color: string, fallback: string) {
  return normalizeParticipantColor(color, fallback)
}

function formatArchiveDatasetName(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Datensatz'
  }

  return formatHistoricalDatasetName(date)
}

function sequenceDatasetNames(datasets: ProgressDataset[]) {
  return sequenceHistoricalRecordNames(datasets, {
    getGeneratedBaseName: (dataset, date) =>
      getGeneratedDatasetBaseName(dataset.name, date),
    getTimestamp: (dataset) => dataset.archivedAtClientIso,
  })
}

function normalizeEventIcon(icon: unknown, valueDelta: number): ProgressEventIcon {
  if (
    icon === 'plus' ||
    icon === 'minus' ||
    icon === 'wine' ||
    icon === 'beer' ||
    icon === 'schnaps' ||
    icon === 'funnel'
  ) {
    return icon
  }

  return valueDelta < 0 ? 'minus' : 'plus'
}

function isProgressDrinkIcon(icon: unknown): icon is ProgressDrinkIcon {
  return icon === 'wine' || icon === 'beer' || icon === 'schnaps' || icon === 'funnel'
}

function normalizeDrinkIcon(icon: unknown): ProgressDrinkIcon {
  return isProgressDrinkIcon(icon) ? icon : defaultProgressDrinkIcon
}

function getDrinkIconEventDelta(icon: ProgressDrinkIcon): ProgressEventDelta {
  return icon === 'schnaps' ? 0.5 : 1
}

function normalizeDatasetName(name: string | undefined) {
  const trimmedName = name?.trim()

  if (!trimmedName || trimmedName === 'Aktueller Datensatz') {
    return 'Datensatz'
  }

  return trimmedName
}

function normalizePlayer(player: ProgressPlayer, index: number): ProgressPlayer {
  const position = Number.isFinite(player.position)
    ? Number(player.position)
    : index + 1
  const fallbackColor = getParticipantColorByPosition(position)
  const name = sanitizeName(player.name ?? '', { id: player.id, position })
  const color = isDefaultPlayerName(name, position)
    ? fallbackColor
    : sanitizeColor(player.color ?? fallbackColor, fallbackColor)

  return {
    ...player,
    position,
    name,
    color,
    defaultEventIcon: normalizeDrinkIcon(player.defaultEventIcon),
  }
}

function normalizeDataset(
  dataset: ProgressDataset,
  players: ProgressPlayer[],
): ProgressDataset {
  const hasUnit = typeof dataset.unit === 'string'
  const unit = hasUnit ? dataset.unit : defaultUnit
  const chartTitle = dataset.chartTitle?.trim()

  return {
    ...dataset,
    chartTitle:
      !chartTitle || chartTitle === legacyDefaultChartTitle
        ? getDefaultChartTitle(unit)
        : chartTitle,
    createdAtClientIso: dataset.createdAtClientIso || new Date().toISOString(),
    archivedAtClientIso: dataset.archivedAtClientIso ?? null,
    events: (dataset.events ?? []).map((event, index) => ({
      ...event,
      playerColor:
        players.find((player) => player.id === event.playerId)?.color ??
        normalizeThemeColor(event.playerColor, index),
      valueDelta: Number.isFinite(Number(event.valueDelta))
        ? Number(event.valueDelta)
        : 1,
      icon: normalizeEventIcon(event.icon, Number(event.valueDelta) || 1),
      position: Number.isFinite(event.position) ? event.position : index + 1,
      createdAtClientIso: event.createdAtClientIso || new Date().toISOString(),
      createdAtLabel: event.createdAtLabel || event.createdAtClientIso,
    })),
    name: normalizeDatasetName(dataset.name),
    position: Number.isFinite(dataset.position) ? dataset.position : 1,
    status: dataset.status === 'archived' ? 'archived' : 'active',
    unit,
  }
}

export function useProgressDashboard(lobbyId?: string) {
  const activeLobbyId = useActiveLobbyId(lobbyId)
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.progressDashboardState(activeLobbyId),
    [activeLobbyId],
  )
  const playersPath = useMemo(
    () => firebasePaths.progressDashboardPlayers(activeLobbyId),
    [activeLobbyId],
  )
  const datasetsPath = useMemo(
    () => firebasePaths.progressDashboardDatasets(activeLobbyId),
    [activeLobbyId],
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
  const storedDatasets = useMemo(
    () => datasetsStore.data.map((dataset) => normalizeDataset(dataset, players)),
    [datasetsStore.data, players],
  )
  const datasets = useMemo(
    () => sequenceDatasetNames(storedDatasets),
    [storedDatasets],
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

  useEffect(() => {
    if (
      datasetsStore.isLoading ||
      !datasets.some((dataset, index) => dataset.name !== storedDatasets[index]?.name)
    ) {
      return
    }

    void datasetsStore.saveItems(
      datasets.map((dataset, index) =>
        dataset.name === storedDatasets[index]?.name
          ? dataset
          : { ...dataset, lastUpdatedBy: session.userId },
      ),
    )
  }, [datasets, datasetsStore, session.userId, storedDatasets])

  const saveActiveDataset = (partialValue: Partial<ProgressDataset>) =>
    datasetsStore.mergeItem(activeDataset.id, {
      ...partialValue,
      lastUpdatedBy: session.userId,
    })

  const updateActiveDatasetMeta = (
    field: 'name' | 'chartTitle' | 'unit',
    value: string,
  ) => {
    const trimmedValue = value.trim()

    if (field === 'unit') {
      const nextUnit = value
      const shouldSyncChartTitle = isDefaultChartTitle(
        activeDataset.chartTitle,
        activeDataset.unit,
      )

      return saveActiveDataset({
        unit: nextUnit,
        ...(shouldSyncChartTitle
          ? { chartTitle: getDefaultChartTitle(nextUnit) }
          : {}),
      })
    }

    return saveActiveDataset({ [field]: trimmedValue || createDataset()[field] })
  }

  const addPlayer = () => {
    const { id, ...player } = createProgressPlayer(players)

    return playersStore.setItem(id, {
      ...player,
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

  const updatePlayerDefaultEventIcon = (
    playerId: string,
    icon: ProgressDrinkIcon,
  ) => {
    const player = players.find((entry) => entry.id === playerId)

    if (!player) {
      return Promise.resolve()
    }

    return playersStore.mergeItem(playerId, {
      defaultEventIcon: normalizeDrinkIcon(icon),
      lastUpdatedBy: session.userId,
    })
  }

  const addEvent = (player: ProgressPlayer, icon: ProgressDrinkIcon) => {
    const eventIcon = normalizeDrinkIcon(icon)
    const valueDelta = getDrinkIconEventDelta(eventIcon)
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
      icon: eventIcon,
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

    const nextDatasets = sequenceDatasetNames([
      ...datasets.filter((dataset) => dataset.id !== activeDataset.id),
      {
        id: archiveId,
        ...archiveValue,
        name: formatArchiveDatasetName(now),
        position: archivePosition,
        status: 'archived',
        archivedAtClientIso: now,
        lastUpdatedBy: session.userId,
      },
      {
        id: activeDatasetId,
        ...newDatasetValue,
        lastUpdatedBy: session.userId,
      },
    ])

    await datasetsStore.saveItems(nextDatasets)
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
    progressDrinkIcons,
    removePlayer,
    resetAndArchiveDataset,
    updateActiveDatasetMeta,
    updateArchivedDatasetName,
    updateEvent,
    updatePlayerColor,
    updatePlayerDefaultEventIcon,
    updatePlayerName,
  }
}
