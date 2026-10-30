import type {
  TerritoryClaimsByMap,
  TerritoryMapId,
  TerritoryPlayer,
} from '@/apps/territory-map/types'

export type SushiScore = {
  player: TerritoryPlayer
  world: number
  germany: number
  total: number
}

export function getSushiScores(
  claimsByMap: TerritoryClaimsByMap,
  players: TerritoryPlayer[],
): SushiScore[] {
  const getMapScore = (playerId: string, mapId: TerritoryMapId) =>
    Object.values(claimsByMap[mapId]).filter(
      (claim) =>
        (claim.owners?.length
          ? claim.owners
          : [
              {
                playerId: claim.playerId,
              },
            ]
        ).some((owner) => owner.playerId === playerId),
    ).length

  return players
    .map((player) => {
      const world = getMapScore(player.id, 'world')
      const germany = getMapScore(player.id, 'germany')

      return {
        player,
        world,
        germany,
        total: world + germany,
      }
    })
    .sort(
      (left, right) =>
        right.total - left.total ||
        left.player.position - right.player.position,
    )
}
