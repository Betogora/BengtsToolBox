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
      hasServerSnapshot: true,
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
      hasServerSnapshot: true,
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
  migrateLegacyUnitedKingdomEvents,
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
  it('verwendet für neue Spieler keine Positions-ID eines früheren Spielers', async () => {
    stores.dataset.data = [dataset()]
    stores.dataset.isLoading = false
    let map: ReturnType<typeof useTerritoryMap> | undefined
    function Probe() { map = useTerritoryMap(); return null }
    renderToStaticMarkup(createElement(Probe))
    const first = await map!.addPlayer('New')
    const second = await map!.addPlayer('Other')
    expect(first?.id).toMatch(/^person-/)
    expect(first?.id).not.toBe(`person-${first?.position}`)
    expect(second?.id).not.toBe(first?.id)
  })

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

  it('sperrt Änderungen, solange ein UK-Altbestand migriert werden muss', async () => {
    const legacyDataset = dataset()
    legacyDataset.events = [
      {
        id: 'event-uk',
        mapId: 'world',
        territoryId: 'gb',
        territoryName: 'Vereinigtes Königreich',
        playerId: 'person-1',
        playerName: 'Bengt',
        playerColor: '#063852',
        createdAtClientIso: '2026-06-04T14:46:48.421Z',
        createdAtLabel: '2026-06-04T14:46:48.421Z',
        position: 1,
      },
    ]
    stores.dataset.data = [legacyDataset]
    stores.dataset.isLoading = false
    let territoryMap: ReturnType<typeof useTerritoryMap> | undefined

    function Probe() {
      territoryMap = useTerritoryMap()
      return null
    }

    renderToStaticMarkup(createElement(Probe))
    await territoryMap?.updateEvent('event-uk', { territoryId: 'gb-sct' })

    expect(territoryMap?.isDatasetReady).toBe(false)
    expect(stores.dataset.mergeItem).not.toHaveBeenCalled()
  })

  it('schützt auch den dritten initialen Spieler vor dem Löschen', async () => {
    stores.dataset.data = [dataset()]
    stores.dataset.isLoading = false
    stores.players.data = [
      stores.players.data[0],
      {
        id: 'person-2',
        name: 'Paul',
        color: '#a24a02',
        position: 2,
      },
      {
        id: 'person-4',
        name: 'Lennart',
        color: '#fac889',
        position: 4,
      },
    ]
    let territoryMap: ReturnType<typeof useTerritoryMap> | undefined

    function Probe() {
      territoryMap = useTerritoryMap()
      return null
    }

    renderToStaticMarkup(createElement(Probe))
    const result = await territoryMap?.removePlayer('person-4')

    expect(result).toBe(false)
    expect(stores.players.deleteItem).not.toHaveBeenCalled()
  })
})

describe('Sushi-Map-Migration des Vereinigten Königreichs', () => {
  const legacyEvent: TerritoryVisitEvent = {
    id: 'event-uk',
    mapId: 'world',
    territoryId: 'gb',
    territoryName: 'Vereinigtes Königreich',
    playerId: 'person-2',
    playerName: 'Paul',
    playerColor: '#a24a02',
    createdAtClientIso: '2026-06-04T14:46:48.421Z',
    createdAtLabel: '2026-06-04T14:46:48.421Z',
    position: 7,
    lastUpdatedBy: 'legacy-user',
  }

  it('ordnet Altbesuche England zu und erhält Metadaten und Claims beider Karten', () => {
    const germanyEvent: TerritoryVisitEvent = {
      ...legacyEvent,
      id: 'event-germany',
      mapId: 'germany',
      territoryId: 'DE-NI',
      territoryName: 'Niedersachsen',
      playerId: 'person-1',
      playerName: 'Bengt',
      position: 8,
    }
    const migrated = migrateLegacyUnitedKingdomEvents([legacyEvent, germanyEvent])

    expect(migrated).toEqual([
      { ...legacyEvent, territoryId: 'gb-eng', territoryName: 'England' },
      germanyEvent,
    ])
    expect(getCurrentClaims(migrated)).toEqual({
      world: { 'gb-eng': expect.objectContaining({ playerId: 'person-2' }) },
      germany: { 'DE-NI': expect.objectContaining({ playerId: 'person-1' }) },
    })
  })

  it('ist für bereits kanonische Events wirkungslos', () => {
    const canonical = {
      ...legacyEvent,
      territoryId: 'gb-eng',
      territoryName: 'England',
    }
    const events = [canonical]

    expect(migrateLegacyUnitedKingdomEvents(events)).toBe(events)
  })
})
