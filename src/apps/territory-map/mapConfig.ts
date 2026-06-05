import type { TerritoryMapId } from '@/apps/territory-map/types'

export const mapLabels: Record<TerritoryMapId, string> = {
  world: 'Weltkarte',
  germany: 'Deutschland',
}

export const tapMoveThreshold = 8
export const unclaimedValue = '__unclaimed'
export const mapZoomLevels = [1, 1.5, 2, 4] as const
