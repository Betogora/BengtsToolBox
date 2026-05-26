import { useMemo } from 'react'

import type {
  DecisionWheelEntry,
  DecisionWheelResult,
  DecisionWheelState,
} from '@/apps/decision-wheel/types'
import { firebasePaths } from '@/lib/firebase/paths'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

const colorPresets = [
  '#027a9f',
  '#feaa01',
  '#12b296',
  '#7c3aed',
  '#e85d75',
  '#6f9e27',
]

const exampleEntries: DecisionWheelEntry[] = [
  { id: 'movie', text: 'Filmabend', color: colorPresets[0], weight: 1 },
  { id: 'game', text: 'Brettspiel', color: colorPresets[1], weight: 1 },
  { id: 'snack', text: 'Snacks holen', color: colorPresets[2], weight: 1 },
  { id: 'task', text: 'Aufgabe ziehen', color: colorPresets[3], weight: 1 },
  { id: 'wildcard', text: 'Wildcard', color: colorPresets[4], weight: 1 },
]

const initialDecisionWheelState: DecisionWheelState = {
  entries: exampleEntries,
  lastResult: null,
  history: [],
  removeWinnerAfterSpin: false,
}

function createRandomId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function sanitizeColor(color: string | undefined, fallback: string) {
  const trimmedColor = color?.trim() ?? ''

  return /^#[0-9a-f]{6}$/i.test(trimmedColor) ? trimmedColor : fallback
}

function sanitizeWeight(weight: number | undefined) {
  const numericWeight = Number(weight)

  return Number.isFinite(numericWeight) ? Math.max(1, Math.round(numericWeight)) : 1
}

function fallbackEntryText(index: number) {
  return `Option ${index + 1}`
}

function normalizeEntry(
  entry: DecisionWheelEntry,
  index: number,
): DecisionWheelEntry {
  const fallbackColor = colorPresets[index % colorPresets.length]
  const text = entry.text?.trim()

  return {
    id: entry.id || `entry-${index + 1}`,
    text: text || fallbackEntryText(index),
    color: sanitizeColor(entry.color, fallbackColor),
    weight: sanitizeWeight(entry.weight),
  }
}

function normalizeState(state: DecisionWheelState): DecisionWheelState {
  return {
    entries: (state.entries ?? []).map(normalizeEntry),
    lastResult: state.lastResult ?? null,
    history: (state.history ?? []).slice(0, 12),
    removeWinnerAfterSpin: Boolean(state.removeWinnerAfterSpin),
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
      entries: entries.map(normalizeEntry),
      updatedBy: session.userId,
    })

  const addEntry = () => {
    const nextIndex = data.entries.length
    const entry: DecisionWheelEntry = {
      id: `entry-${createRandomId()}`,
      text: fallbackEntryText(nextIndex),
      color: colorPresets[nextIndex % colorPresets.length],
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
          ? normalizeEntry({ ...entry, ...partialValue }, index)
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

  const toggleRemoveWinnerAfterSpin = () =>
    store.merge({
      removeWinnerAfterSpin: !data.removeWinnerAfterSpin,
      updatedBy: session.userId,
    })

  const clearHistory = () =>
    store.merge({
      history: [],
      lastResult: null,
      updatedBy: session.userId,
    })

  const spin = () => {
    const winner = pickWeightedWinner(data.entries)

    if (!winner) {
      return null
    }

    const result: DecisionWheelResult = {
      id: `result-${createRandomId()}`,
      entryId: winner.id,
      text: winner.text,
      color: winner.color,
      weight: winner.weight,
      createdAt: new Date().toISOString(),
    }
    const nextEntries = data.removeWinnerAfterSpin
      ? data.entries.filter((entry) => entry.id !== winner.id)
      : data.entries

    store.merge({
      entries: nextEntries,
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
    toggleRemoveWinnerAfterSpin,
    updateEntry,
  }
}
