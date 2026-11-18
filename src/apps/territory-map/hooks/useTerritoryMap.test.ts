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

// Simuliert die Bearbeitungssperre: entsperrt oder mit abgebrochener PIN-Abfrage.
const editLock = vi.hoisted(() => ({ unlocked: true }))

vi.mock('@/apps/shared/useEditUnlock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/apps/shared/useEditUnlock')>()
  return {
    ...actual,
    useEditUnlock: () => ({
      isUnlocked: editLock.unlocked,
      isPrompting: false,
      requestUnlock: () => Promise.resolve(editLock.unlocked),
      protect: <Args extends unknown[], T>(
        write: (...args: Args) => T | Promise<T>,
        lockedResult: T,
      ) => (...args: Args) =>
        Promise.resolve(editLock.unlocked ? write(...args) : lockedResult),
      submit: () => true,
      cancel: () => undefined,
    }),
  }
})

vi.mock('@/lobbies/LobbyContext', () => ({
  useActiveLobbyId: () => 'default',
}))

const stateStore = vi.hoisted(() => ({
  data: { activeMap: 'world' },
  error: null,
  isLoading: false,
  isPending: false,
  isRealtime: true,
  merge: vi.fn(),
}))

vi.mock('@/lib/firebase/useFirestoreDoc', () => ({
  useFirestoreDoc: () => stateStore,
}))

vi.mock('@/lib/firebase/useFirestoreCollection', () => ({
  useFirestoreCollection: (path: string) =>
    path.endsWith('/players') ? stores.players : stores.dataset,
}))

import {
  addGermanyCountryEvent,
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
    editLock.unlocked = true
  })

  it('schreibt ohne Bearbeitungs-PIN weder Besuche, Spieler noch geteilte Ansicht', async () => {
    editLock.unlocked = false
    stores.dataset.data = [dataset()]
    stores.dataset.isLoading = false
    let territoryMap: ReturnType<typeof useTerritoryMap> | undefined

    function Probe() {
      territoryMap = useTerritoryMap()
      return null
    }

    renderToStaticMarkup(createElement(Probe))
    expect(await territoryMap?.claimTerritory('world', 'jp', 'person-1')).toBe(false)
    expect(await territoryMap?.addPlayer('Neu')).toBeNull()
    expect(await territoryMap?.setActiveMap('germany')).toMatchObject({ ok: true })

    expect(stores.dataset.mergeItem).not.toHaveBeenCalled()
    expect(stores.players.setItem).not.toHaveBeenCalled()
    expect(stateStore.merge).not.toHaveBeenCalled()
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

describe('Sushi-Map: Bundesland zählt für Deutschland', () => {
  const stateEvent: TerritoryVisitEvent = {
    id: 'event-ni',
    mapId: 'germany',
    territoryId: 'DE-NI',
    territoryName: 'Niedersachsen',
    playerId: 'person-1',
    playerName: 'Bengt',
    playerColor: '#063852',
    createdAtClientIso: '2026-06-04T12:00:00.000Z',
    createdAtLabel: '2026-06-04T12:00:00.000Z',
    position: 3,
  }
  const countryEvent = (patch: Partial<TerritoryVisitEvent>): TerritoryVisitEvent => ({
    ...stateEvent,
    id: 'event-de',
    mapId: 'world',
    territoryId: 'de',
    territoryName: 'Deutschland',
    ...patch,
  })

  it('trägt Deutschland am selben Tag für dieselbe Person nach', () => {
    const result = addGermanyCountryEvent([stateEvent], stateEvent, () => 'event-de')

    expect(result).toEqual([stateEvent, countryEvent({ position: 4 })])
    expect(getCurrentClaims(result).world.de).toEqual(
      expect.objectContaining({ playerId: 'person-1' }),
    )
  })

  it.each([
    ['bestehender Deutschland-Besuch derselben Person am selben Tag', [countryEvent({ position: 1 })], stateEvent],
    ['Weltkarten-Event', [], { ...stateEvent, mapId: 'world' as const, territoryId: 'fr' }],
  ])('legt nichts an bei %s', (_, existing, event) => {
    const events = [...existing, event]

    expect(addGermanyCountryEvent(events, event)).toBe(events)
  })

  it('legt Deutschland für andere Personen oder Tage zusätzlich an', () => {
    const otherDay = countryEvent({ createdAtClientIso: '2026-06-01T12:00:00.000Z', position: 1 })
    const otherPlayer = countryEvent({ id: 'event-de-2', playerId: 'person-2', position: 2 })

    expect(
      addGermanyCountryEvent([otherDay, otherPlayer, stateEvent], stateEvent),
    ).toHaveLength(4)
  })

  it('schreibt beim Bundesland-Claim beide Events in den aktuellen Datensatz', async () => {
    stores.dataset.data = [dataset()]
    stores.dataset.isLoading = false
    let map: ReturnType<typeof useTerritoryMap> | undefined
    function Probe() { map = useTerritoryMap(); return null }
    renderToStaticMarkup(createElement(Probe))

    await map!.claimTerritory('germany', 'DE-HH', 'person-1')
    const updater = stores.dataset.mergeItem.mock.calls.at(-1)?.at(1) as unknown as (
      current: TerritoryDataset,
    ) => Partial<TerritoryDataset>
    const events = updater(dataset()).events ?? []

    expect(events.map(({ mapId, territoryId, playerId }) => ({ mapId, territoryId, playerId }))).toEqual([
      { mapId: 'germany', territoryId: 'DE-HH', playerId: 'person-1' },
      { mapId: 'world', territoryId: 'de', playerId: 'person-1' },
    ])
    expect(events[1].createdAtClientIso).toBe(events[0].createdAtClientIso)
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
