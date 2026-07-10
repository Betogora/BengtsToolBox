import type { DecisionWheelEntry } from '@/apps/decision-wheel/types'

export type RandomSource = () => number

export function pickWeightedWinner(
  entries: DecisionWheelEntry[],
  random: RandomSource = Math.random,
) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let cursor = random() * totalWeight

  return entries.find((entry) => {
    cursor -= entry.weight

    return cursor < 0
  })
}
