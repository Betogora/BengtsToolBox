export type TerritoryMapId = 'world' | 'germany'

export type Territory = {
  id: string
  name: string
  path: string
  isoCode?: string
}

export type TerritoryClaim = {
  territoryId: string
  playerId: string
  playerName: string
  playerColor: string
  claimedAtClientIso: string
}

export type TerritoryClaimAction = {
  id: string
  mapId: TerritoryMapId
  territoryId: string
  previousClaim: TerritoryClaim | null
  nextClaim: TerritoryClaim | null
  createdAtClientIso: string
}

export type TerritoryClaimsByMap = Record<
  TerritoryMapId,
  Record<string, TerritoryClaim>
>

export type TerritoryMapState = {
  activeMap: TerritoryMapId
  claimsByMap: TerritoryClaimsByMap
  lastClaimAction: TerritoryClaimAction | null
  updatedBy?: string
}

export type TerritoryPlayer = {
  id: string
  name: string
  color: string
  position: number
  lastUpdatedBy?: string
}
