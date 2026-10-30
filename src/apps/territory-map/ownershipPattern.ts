import type {
  TerritoryClaim,
  TerritoryPlayer,
} from '@/apps/territory-map/types'

const maximumStripeWidthPx = 3
const fallbackStripeWidth = 1

export function getTerritoryClaimColor(
  claimPlayerId: string,
  claimColor: string,
  players: TerritoryPlayer[],
) {
  return players.find((player) => player.id === claimPlayerId)?.color ?? claimColor
}

export function getTerritoryClaimOwners(claim?: TerritoryClaim) {
  if (claim?.owners?.length) {
    return claim.owners
  }

  return claim
    ? [
        {
          playerId: claim.playerId,
          playerName: claim.playerName,
          playerColor: claim.playerColor,
        },
      ]
    : []
}

export function getTerritoryPatternId(prefix: string, territoryId: string) {
  return `${prefix}-${territoryId.replace(/[^a-zA-Z0-9_-]/g, '-')}`
}

export function getTerritoryOwnerAppearance({
  claim,
  patternId,
  players,
  unclaimedFill,
  unvisitedLabel,
}: {
  claim?: TerritoryClaim
  patternId: string
  players: TerritoryPlayer[]
  unclaimedFill: string
  unvisitedLabel: string
}) {
  const owners = getTerritoryClaimOwners(claim)
  const fill =
    owners.length > 1
      ? `url(#${patternId})`
      : owners.length === 1
        ? getTerritoryClaimColor(
            owners[0].playerId,
            owners[0].playerColor,
            players,
          )
        : unclaimedFill
  const label =
    owners.length > 0
      ? owners.map((owner) => owner.playerName).join(', ')
      : unvisitedLabel

  return { fill, label, owners }
}

export function getAdaptiveStripeWidth({
  ownerCount,
  screenHeight,
  screenWidth,
  svgHeight,
  svgWidth,
}: {
  ownerCount: number
  screenHeight: number
  screenWidth: number
  svgHeight: number
  svgWidth: number
}) {
  if (
    ownerCount < 2 ||
    screenHeight <= 0 ||
    screenWidth <= 0 ||
    svgHeight <= 0 ||
    svgWidth <= 0
  ) {
    return fallbackStripeWidth
  }

  const screenProjection = (screenWidth + screenHeight) / Math.SQRT2
  const svgProjection = (svgWidth + svgHeight) / Math.SQRT2
  const screenScale = screenProjection / svgProjection
  const widthForCompleteOwnerCycle = svgProjection / ownerCount
  const widthForMaximumScreenSize = maximumStripeWidthPx / screenScale

  return Math.min(widthForCompleteOwnerCycle, widthForMaximumScreenSize)
}
