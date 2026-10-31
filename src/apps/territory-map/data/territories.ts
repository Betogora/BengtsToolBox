import territoryOptions from '@/apps/territory-map/data/territory-options.source.json'

import type { Territory, TerritoryMapId } from '@/apps/territory-map/types'

type TerritoryOption = Pick<Territory, 'id' | 'name' | 'isoCode'>

// Sichtbare Ausschnitte: Die Weltgeometrie füllt nur y 74–446, oben und unten liegt leeres Meer.
export const mapViewBoxes: Record<TerritoryMapId, string> = {
  world: '0 68 960 384',
  germany: '0 0 331 447',
}

export const territoryOptionsByMap: Record<
  TerritoryMapId,
  TerritoryOption[]
> = territoryOptions

const territoryPathLoaders: Record<TerritoryMapId, () => Promise<string[]>> = {
  world: () =>
    import('@/apps/territory-map/data/worldTerritories').then(
      ({ worldTerritoryPaths }) => worldTerritoryPaths,
    ),
  germany: () =>
    import('@/apps/territory-map/data/germanyTerritories').then(
      ({ germanyTerritoryPaths }) => germanyTerritoryPaths,
    ),
}

const territoryLoads: Partial<Record<TerritoryMapId, Promise<Territory[]>>> = {}

export function loadTerritories(mapId: TerritoryMapId) {
  return (territoryLoads[mapId] ??= loadTerritoryData(mapId).catch((error) => {
    delete territoryLoads[mapId]
    throw error
  }))
}

async function loadTerritoryData(mapId: TerritoryMapId) {
  const paths = await territoryPathLoaders[mapId]()
  const options = territoryOptionsByMap[mapId]

  if (
    paths.length !== options.length ||
    paths.some((path) => typeof path !== 'string' || path.length === 0)
  ) {
    throw new Error(`Die ${mapId}-Kartengeometrie ist unvollständig.`)
  }

  return options.map<Territory>((option, index) => ({
    ...option,
    path: paths[index],
  }))
}
