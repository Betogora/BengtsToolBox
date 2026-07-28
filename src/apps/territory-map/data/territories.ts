import territoryOptions from '@/apps/territory-map/data/territory-options.source.json'

import type { Territory, TerritoryMapId } from '@/apps/territory-map/types'

export type TerritoryOption = Pick<Territory, 'id' | 'name' | 'isoCode'>

export const mapViewBoxes: Record<TerritoryMapId, string> = {
  world: '0 0 960 520',
  germany: '0 0 520 447',
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

export async function loadTerritories(mapId: TerritoryMapId) {
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
