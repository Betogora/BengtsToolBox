import { useMemo } from 'react'

import type {
  DecisionWheelEntry,
  DecisionWheelResult,
  DecisionWheelState,
} from '@/apps/decision-wheel/types'
import { getEntryDisplayText } from '@/apps/decision-wheel/utils'
import { createRandomId } from '@/apps/shared/utils'
import { firebasePaths } from '@/lib/firebase/paths'
import {
  getThemeColorByIndex,
  normalizeThemeColor,
} from '@/lib/theme'
import { useAnonymousSession } from '@/lib/firebase/useAnonymousSession'
import { useFirestoreDoc } from '@/lib/firebase/useFirestoreDoc'

function createEntry(id: string, index: number): DecisionWheelEntry {
  return {
    id,
    text: `Option ${index + 1}`,
    color: getThemeColorByIndex(index),
    weight: 1,
  }
}

const exampleEntries: DecisionWheelEntry[] = Array.from(
  { length: 3 },
  (_, index) => createEntry(`option-${index + 1}`, index),
)

const initialDecisionWheelState: DecisionWheelState = {
  entries: exampleEntries,
  lastResult: null,
  history: [],
}

function sanitizeWeight(weight: number | undefined) {
  const numericWeight = Number(weight)

  return Number.isFinite(numericWeight) ? Math.max(1, Math.round(numericWeight)) : 1
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
    const entry = createEntry(`entry-${createRandomId()}`, nextIndex)

    return saveEntries([...data.entries, entry])
  }

  const updateEntry = (
    entryId: string,
    partialValue: Partial<Omit<DecisionWheelEntry, 'id'>>,
  ) =>
    saveEntries(
      data.entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, ...partialValue }
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

  const prepareSpinResult = (entriesSnapshot = data.entries) => {
    const winner = pickWeightedWinner(entriesSnapshot)

    if (!winner) {
      return null
    }

    const winnerIndex = entriesSnapshot.findIndex((entry) => entry.id === winner.id)
    const result: DecisionWheelResult = {
      id: `result-${createRandomId()}`,
      entryId: winner.id,
      text: getEntryDisplayText(winner, winnerIndex),
      color: winner.color,
      weight: winner.weight,
      createdAt: new Date().toISOString(),
    }

    return result
  }

  const commitSpinResult = (result: DecisionWheelResult) =>
    store.merge({
      lastResult: result,
      history: [result, ...data.history].slice(0, 12),
      updatedBy: session.userId,
    })

  return {
    ...store,
    addEntry,
    clearHistory,
    commitSpinResult,
    data,
    prepareSpinResult,
    removeEntry,
    resetToExamples,
    updateEntry,
  }
}
