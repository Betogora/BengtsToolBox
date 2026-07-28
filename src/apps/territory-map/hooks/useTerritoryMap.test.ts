import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  TerritoryDataset,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'

const stores = vi.hoisted(() => {
  const action = () => vi.fn(() => Promise.resolve({ ok: true }))
  const player: TerritoryPlayer = {
    id: 'person-1',
    name: 'Bengt',
    color: '#063852',
    position: 1,
  }

  return {
    dataset: {
      data: [] as TerritoryDataset[],
      error: null,
      isLoading: true,
      isPending: false,
      isRealtime: true,
      clearItems: action(),
      deleteItem: action(),
      deleteItems: action(),
      mergeItem: action(),
      saveItems: action(),
      setItem: action(),
    },
    players: {
      data: [player],
      error: null,
      isLoading: false,
      isPending: false,
      isRealtime: true,
      clearItems: action(),
      deleteItem: action(),
      deleteItems: action(),
      mergeItem: action(),
      saveItems: action(),
      setItem: action(),
    },
  }
})

vi.mock('@/lib/firebase/useAnonymousSession', () => ({
  useAnonymousSession: () => ({
    error: null,
    isLoading: false,
    isRealtime: true,
    userId: 'test-user',
  }),
}))

vi.mock('@/lobbies/LobbyContext', () => ({
  useActiveLobbyId: () => 'default',
}))

vi.mock('@/lib/firebase/useFirestoreDoc', () => ({
  useFirestoreDoc: () => ({
    data: { activeMap: 'world' },
    error: null,
    isLoading: false,
    isPending: false,
    isRealtime: true,
    merge: vi.fn(),
  }),
}))

vi.mock('@/lib/firebase/useFirestoreCollection', () => ({
  useFirestoreCollection: (path: string) =>
    path.endsWith('/players') ? stores.players : stores.dataset,
}))

import {
  getCurrentClaims,
  selectCurrentDataset,
  shouldInitializeCurrentDataset,
  useTerritoryMap,
} from '@/apps/territory-map/hooks/useTerritoryMap'

function dataset(id = 'dataset-current'): TerritoryDataset {
  return {
    id,
    position: 1,
    name: 'Datensatz',
    status: 'active',
    createdAtClientIso: '2026-06-03T15:33:11.470Z',
    archivedAtClientIso: null,
    events: [],
  }
}

describe('Sushi-Map-Datensatzbereitschaft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stores.dataset.data = []
    stores.dataset.isLoading = true
  })

  it('liefert während des Ladens keinen schreibbaren Datensatz', () => {
    expect(selectCurrentDataset([])).toBeUndefined()
    expect(shouldInitializeCurrentDataset(true, [])).toBe(false)
  })

  it('akzeptiert ausschließlich dataset-current und ersetzt ihn nicht', () => {
    const legacyActive = dataset('dataset-legacy')
    const current = dataset()

    expect(selectCurrentDataset([legacyActive, current])).toBe(current)
    expect(selectCurrentDataset([legacyActive])).toBeUndefined()
  })

  it('initialisiert nur einen bestätigt leeren Collection-Snapshot', () => {
    expect(shouldInitializeCurrentDataset(false, [])).toBe(true)
    expect(shouldInitializeCurrentDataset(false, [], true)).toBe(false)
    expect(shouldInitializeCurrentDataset(false, [dataset()])).toBe(false)
    expect(
      shouldInitializeCurrentDataset(false, [dataset('dataset-legacy')]),
    ).toBe(false)
  })

  it('führt für einen Claim vor Datensatzbereitschaft keinen Write aus', async () => {
    let territoryMap: ReturnType<typeof useTerritoryMap> | undefined

    function Probe() {
      territoryMap = useTerritoryMap()
      return null
    }

    renderToStaticMarkup(createElement(Probe))
    const result = await territoryMap?.claimTerritory(
      'world',
      'de',
      'person-1',
    )

    expect(result).toBe(false)
    expect(stores.dataset.mergeItem).not.toHaveBeenCalled()
    expect(stores.dataset.setItem).not.toHaveBeenCalled()
  })
})

describe('Sushi-Map-Projektion der reparierten Events', () => {
  it('erhält Karten-, Personen-, Zeit- und Positionssummen', () => {
    const recovered = [
      ['germany', 'DE-HB', 'person-1', 'Bengt', '2026-06-03T15:33:11.470Z'],
      ['germany', 'DE-NI', 'person-1', 'Bengt', '2026-06-03T15:33:18.888Z'],
      ['germany', 'DE-HH', 'person-1', 'Bengt', '2026-06-03T15:33:21.529Z'],
      ['germany', 'DE-BY', 'person-1', 'Bengt', '2026-06-03T15:33:25.136Z'],
      ['germany', 'DE-BW', 'person-2', 'Paul', '2026-06-03T15:59:09.628Z'],
      ['world', 'za', 'person-2', 'Paul', '2026-06-03T16:01:14.794Z'],
      ['world', 'us', 'person-2', 'Paul', '2026-06-03T16:11:44.930Z'],
      ['world', 'gb', 'person-2', 'Paul', '2026-06-04T14:46:48.421Z'],
      ['world', 'es', 'person-2', 'Paul', '2026-06-04T14:47:00.199Z'],
      ['world', 'md', 'person-2', 'Paul', '2026-06-04T14:47:29.873Z'],
      ['world', 'pt', 'person-2', 'Paul', '2026-06-04T14:47:39.297Z'],
      ['world', 'ch', 'person-2', 'Paul', '2026-06-04T14:48:08.883Z'],
      ['germany', 'DE-NW', 'person-2', 'Paul', '2026-06-04T14:48:21.876Z'],
      ['world', 'de', 'person-2', 'Paul', '2026-06-04T15:02:16.600Z'],
    ].map(
      ([mapId, territoryId, playerId, playerName, createdAtClientIso], index) =>
        ({
          id: `event-${index + 1}`,
          mapId,
          territoryId,
          territoryName: territoryId,
          playerId,
          playerName,
          playerColor: playerId === 'person-1' ? '#063852' : '#a24a02',
          createdAtClientIso,
          createdAtLabel: createdAtClientIso,
          position: index + 1,
        }) as TerritoryVisitEvent,
    )

    const claims = getCurrentClaims(recovered)
    const allClaims = [
      ...Object.values(claims.germany),
      ...Object.values(claims.world),
    ]

    expect(Object.keys(claims.germany)).toHaveLength(6)
    expect(Object.keys(claims.world)).toHaveLength(8)
    expect(
      allClaims.filter((claim) => claim.playerId === 'person-1'),
    ).toHaveLength(4)
    expect(
      allClaims.filter((claim) => claim.playerId === 'person-2'),
    ).toHaveLength(10)
    expect(recovered.map((event) => event.position)).toEqual(
      Array.from({ length: 14 }, (_, index) => index + 1),
    )
    expect(recovered.map((event) => event.createdAtLabel)).toEqual(
      recovered.map((event) => event.createdAtClientIso),
    )
  })
})
