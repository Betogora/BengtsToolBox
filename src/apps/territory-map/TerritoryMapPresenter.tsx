import { Trophy } from 'lucide-react'
import { useRef } from 'react'

import { AdaptiveTerritoryOwnerPattern } from '@/apps/territory-map/components'
import { mapViewBoxes } from '@/apps/territory-map/data/territories'
import {
  getTerritoryOwnerAppearance,
  getTerritoryPatternId,
} from '@/apps/territory-map/ownershipPattern'
import type { SushiScore } from '@/apps/territory-map/sushiScores'
import type {
  Territory,
  TerritoryClaim,
  TerritoryMapId,
  TerritoryPlayer,
} from '@/apps/territory-map/types'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n'

type PresenterTerritoryShapeProps = {
  claim?: TerritoryClaim
  patternPrefix: string
  players: TerritoryPlayer[]
  territory: Territory
}

function PresenterTerritoryShape({
  claim,
  patternPrefix,
  players,
  territory,
}: PresenterTerritoryShapeProps) {
  const { t } = useI18n()
  const pathRef = useRef<SVGPathElement>(null)
  const patternId = getTerritoryPatternId(patternPrefix, territory.id)
  const {
    fill: ownerColor,
    label: ownerLabel,
    owners,
  } = getTerritoryOwnerAppearance({
    claim,
    patternId,
    players,
    unclaimedFill: `url(#${patternPrefix}-unclaimed)`,
    unvisitedLabel: t('territory.unvisited'),
  })

  return (
    <>
      {owners.length > 1 && (
        <AdaptiveTerritoryOwnerPattern
          owners={owners}
          pathRef={pathRef}
          patternId={patternId}
          players={players}
        />
      )}
      <path
        ref={pathRef}
        d={territory.path}
        className="territory-shape"
        fill={ownerColor}
        opacity={claim ? 0.94 : 1}
        stroke="var(--map-territory-stroke)"
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      >
        <title>{`${territory.name}: ${ownerLabel}`}</title>
      </path>
    </>
  )
}

export function TerritoryMapPresenter({
  activeMap,
  claims,
  isMapLoading,
  players,
  sushiScores,
  territories,
}: {
  activeMap: TerritoryMapId
  claims: Record<string, TerritoryClaim>
  isMapLoading: boolean
  players: TerritoryPlayer[]
  sushiScores: SushiScore[]
  territories: Territory[]
}) {
  const { t } = useI18n()
  const patternPrefix = `presenter-territory-${activeMap}`
  const claimedCount = Object.keys(claims).length
  const coverageLabel =
    territories.length > 0
      ? `${claimedCount}/${territories.length}`
      : `${claimedCount}`

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="overflow-hidden rounded-lg border bg-secondary shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-card/85 p-4">
          <div>
            <p className="type-label text-muted-foreground">{t('territory.map')}</p>
            <h2 className="type-section-title">
              {t(activeMap === 'world' ? 'territory.map.world' : 'territory.map.germany')}
            </h2>
          </div>
          <Badge variant="outline">
            {t('territory.coverageVisited', { coverage: coverageLabel })}
          </Badge>
        </div>
        <div className="h-[62svh] min-h-[24rem] bg-secondary">
          <svg
            viewBox={mapViewBoxes[activeMap]}
            className="block size-full"
            aria-label={t(
              activeMap === 'world' ? 'territory.map.world' : 'territory.map.germany',
            )}
            role="img"
          >
            <defs>
              <pattern
                id={`${patternPrefix}-unclaimed`}
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="10" height="10" fill="var(--muted)" />
                <rect width="3" height="10" fill="var(--border)" opacity="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="var(--secondary)" />
            {isMapLoading ? (
              <text
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="var(--muted-foreground)"
                fontSize="14"
              >
                {t('territory.loadingMap')}
              </text>
            ) : (
              territories.map((territory) => (
                <PresenterTerritoryShape
                  key={territory.id}
                  claim={claims[territory.id]}
                  patternPrefix={patternPrefix}
                  players={players}
                  territory={territory}
                />
              ))
            )}
          </svg>
        </div>
      </section>

      <aside className="grid content-start gap-4">
        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" />
            <h2 className="type-section-title">
              {t('territory.score')}
            </h2>
          </div>
          <div className="mt-5 grid gap-3">
            {sushiScores.length === 0 ? (
              <EmptyState>{t('territory.emptyTourists')}</EmptyState>
            ) : (
              sushiScores.map((score, index) => (
                <div
                  key={score.player.id}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border bg-background p-3"
                >
                  <div className="type-action tabular-nums">{index + 1}</div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: score.player.color }}
                    />
                    <span className="type-action truncate">
                      {score.player.name}
                    </span>
                  </div>
                  <div className="type-metric-sm">
                    {score.total}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 shadow-sm">
          <p className="type-label text-muted-foreground">{t('territory.legend')}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {players.map((player) => (
              <Badge key={player.id} variant="outline">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: player.color }}
                />
                {player.name}
              </Badge>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
