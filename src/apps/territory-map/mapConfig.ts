import type { TerritoryMapId } from '@/apps/territory-map/types'

export const mapLabels: Record<TerritoryMapId, string> = {
  world: 'Weltkarte',
  germany: 'Deutschland',
}

const maxZoom = 8
const minZoom = 0.7

export const tapMoveThreshold = 8
export const unclaimedValue = '__unclaimed'

export function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, value))
}
