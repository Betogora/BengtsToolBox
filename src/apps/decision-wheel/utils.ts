import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'

export function getEntryDisplayText(
  entry: Pick<DecisionWheelEntry, 'text'>,
  index: number,
  formatFallback = (optionNumber: number) => `Option ${optionNumber}`,
) {
  const trimmedText = entry.text?.trim()

  return trimmedText || formatFallback(index + 1)
}

export function parseWeightDraft(value: string) {
  const numericWeight = Number(value)

  return Number.isFinite(numericWeight) && numericWeight >= 1
    ? Math.round(numericWeight)
    : null
}

export function getRenderableWheelEntries(
  entries: DecisionWheelEntry[],
  weightDrafts: Record<string, string>,
) {
  return entries.flatMap((entry) => {
    const draftValue = weightDrafts[entry.id]

    if (draftValue === undefined) {
      return entry.weight >= 1 ? [entry] : []
    }

    const draftWeight = parseWeightDraft(draftValue)

    return draftWeight === null ? [] : [{ ...entry, weight: draftWeight }]
  })
}
