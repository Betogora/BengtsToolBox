import { describe, expect, it } from 'vitest'

import {
  loadTerritories,
  territoryOptionsByMap,
} from '@/apps/territory-map/data/territories'

describe('Sushi-Map-Geometriedaten', () => {
  it('enthält exakt die kanonischen Territorien', () => {
    const worldIds = territoryOptionsByMap.world.map((territory) => territory.id)
    const germanyIds = territoryOptionsByMap.germany.map(
      (territory) => territory.id,
    )

    expect(worldIds).toHaveLength(244)
    expect(germanyIds).toHaveLength(16)
    expect(new Set(worldIds).size).toBe(worldIds.length)
    expect(new Set(germanyIds).size).toBe(germanyIds.length)
    expect(worldIds).not.toContain('gb')
    expect(worldIds).toEqual(
      expect.arrayContaining(['gb-eng', 'gb-nir', 'gb-sct', 'gb-wls']),
    )
  })

  it.each(['world', 'germany'] as const)(
    'verbindet für %s jede Option mit genau einem Pfad',
    async (mapId) => {
      const territories = await loadTerritories(mapId)

      expect(territories).toHaveLength(territoryOptionsByMap[mapId].length)
      territories.forEach((territory, index) => {
        expect(territory.id).toBe(territoryOptionsByMap[mapId][index].id)
        expect(territory.path.length).toBeGreaterThan(0)
      })
    },
  )
})
