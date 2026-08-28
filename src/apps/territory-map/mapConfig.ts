import type { TerritoryMapId } from '@/apps/territory-map/types'

export const mapLabels: Record<TerritoryMapId, string> = {
  world: 'Weltkarte',
  germany: 'Deutschland',
}

export const tapMoveThreshold = 8
export const unclaimedValue = '__unclaimed'
export const mapZoomLevels = [
  1,
  2,
  4,
  8,
  16,
  32,
  64,
  128,
  256,
  512,
  1024,
] as const
