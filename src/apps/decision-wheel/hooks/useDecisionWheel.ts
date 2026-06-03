import { useMemo } from 'react'

import type {
  DecisionWheelEntry,
  DecisionWheelResult,
  DecisionWheelState,
} from '@/apps/decision-wheel/types'
import { firebasePaths } from '@/lib/firebase/paths'
import {
  getThemeColorByIndex,
  normalizeThemeColor,
  participantColorPresets,
} from '@/lib/theme'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const colorPresets = [...participantColorPresets]

const exampleEntries: DecisionWheelEntry[] = [
  { id: 'option-1', text: 'Option 1', color: colorPresets[0], weight: 1 },
  { id: 'option-2', text: 'Option 2', color: colorPresets[1], weight: 1 },
  { id: 'option-3', text: 'Option 3', color: colorPresets[2], weight: 1 },
]

const initialDecisionWheelState: DecisionWheelState = {
  entries: exampleEntries,
  lastResult: null,
  history: [],
}

function createRandomId() {
  return typeof globalThis.crypto !== 'undefined' &&
    'randomUUID' in globalThis.crypto
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeWeight(weight: number | undefined) {
  const numericWeight = Number(weight)

  return Number.isFinite(numericWeight) ? Math.max(1, Math.round(numericWeight)) : 1
}

export function getEntryDisplayText(
  entry: Pick<DecisionWheelEntry, 'text'>,
  index: number,
) {
  const trimmedText = entry.text?.trim()

  return trimmedText || `Option ${index + 1}`
}

function fallbackEntryText(index: number) {
  return `Option ${index + 1}`
}

function normalizeEntryForStorage(
  entry: DecisionWheelEntry,
  index: number,
): DecisionWheelEntry {
  return {
    id: entry.id || `entry-${index + 1}`,
    text: entry.text ?? '',
    color: normalizeThemeColor(entry.color, index),
    weight: sanitizeWeight(entry.weight),
  }
}

function normalizeState(state: DecisionWheelState): DecisionWheelState {
  return {
    entries: (state.entries ?? []).map(normalizeEntryForStorage),
    lastResult: state.lastResult ?? null,
    history: (state.history ?? []).slice(0, 12),
    updatedAt: state.updatedAt,
    updatedBy: state.updatedBy,
  }
}

function pickWeightedWinner(entries: DecisionWheelEntry[]) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = Math.random() * totalWeight

  return entries.find((entry) => {
    cursor -= entry.weight

    return cursor < 0
  })
}

export function useDecisionWheel(stateId = 'default') {
  const session = useAnonymousSession()
  const statePath = useMemo(
    () => firebasePaths.decisionWheelState(stateId),
    [stateId],
  )
  const store = useFirestoreDoc<DecisionWheelState>(
    statePath,
    initialDecisionWheelState,
  )
  const data = useMemo(() => normalizeState(store.data), [store.data])

  const saveEntries = (entries: DecisionWheelEntry[]) =>
    store.merge({
      entries: entries.map(normalizeEntryForStorage),
      updatedBy: session.userId,
    })

  const addEntry = () => {
    const nextIndex = data.entries.length
    const entry: DecisionWheelEntry = {
      id: `entry-${createRandomId()}`,
      text: fallbackEntryText(nextIndex),
      color: getThemeColorByIndex(nextIndex),
      weight: 1,
    }

    return saveEntries([...data.entries, entry])
  }

  const updateEntry = (
    entryId: string,
    partialValue: Partial<Omit<DecisionWheelEntry, 'id'>>,
  ) =>
    saveEntries(
      data.entries.map((entry, index) =>
        entry.id === entryId
          ? normalizeEntryForStorage({ ...entry, ...partialValue }, index)
          : entry,
      ),
    )

  const removeEntry = (entryId: string) =>
    saveEntries(data.entries.filter((entry) => entry.id !== entryId))

  const resetToExamples = () =>
    store.save({
      ...initialDecisionWheelState,
      entries: exampleEntries.map((entry) => ({ ...entry })),
      updatedBy: session.userId,
    })

  const clearHistory = () =>
    store.merge({
      history: [],
      lastResult: null,
      updatedBy: session.userId,
    })

  const spin = () => {
    // The wheel animation is visual only; this weighted draw decides the winner first.
    const winner = pickWeightedWinner(data.entries)

    if (!winner) {
      return null
    }

    const result: DecisionWheelResult = {
      id: `result-${createRandomId()}`,
      entryId: winner.id,
      text: getEntryDisplayText(
        winner,
        data.entries.findIndex((entry) => entry.id === winner.id),
      ),
      color: winner.color,
      weight: winner.weight,
      createdAt: new Date().toISOString(),
    }
    store.merge({
      entries: data.entries,
      lastResult: result,
      history: [result, ...data.history].slice(0, 12),
      updatedBy: session.userId,
    })

    return result
  }

  return {
    ...store,
    addEntry,
    clearHistory,
    colorPresets,
    data,
    removeEntry,
    resetToExamples,
    spin,
    updateEntry,
  }
}
