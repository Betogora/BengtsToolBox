export type TerritoryMapId = 'world' | 'germany'

export type Territory = {
  id: string
  name: string
  path: string
  isoCode?: string
}

export type TerritoryClaimOwner = {
  playerId: string
  playerName: string
  playerColor: string
}

export type TerritoryClaim = {
  territoryId: string
  playerId: string
  playerName: string
  playerColor: string
  owners: TerritoryClaimOwner[]
  claimedAtClientIso: string
}

export type TerritoryClaimsByMap = Record<
  TerritoryMapId,
  Record<string, TerritoryClaim>
>

export type TerritoryMapState = {
  activeMap: TerritoryMapId
  updatedBy?: string
}

export type TerritoryVisitEvent = {
  id: string
  mapId: TerritoryMapId
  territoryId: string
  territoryName: string
  playerId: string
  playerName: string
  playerColor: string
  createdAtClientIso: string
  createdAtLabel: string
  position: number
  lastUpdatedBy?: string
}

export type TerritoryDatasetStatus = 'active' | 'archived'

export type TerritoryDataset = {
  id: string
  position: number
  name: string
  status: TerritoryDatasetStatus
  createdAtClientIso: string
  archivedAtClientIso: string | null
  events: TerritoryVisitEvent[]
  lastUpdatedBy?: string
}

export type TerritoryPlayer = {
  id: string
  name: string
  color: string
  position: number
  lastUpdatedBy?: string
}
