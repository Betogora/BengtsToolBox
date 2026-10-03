import {
  BarChart3,
  Building2,
  ChevronDown,
  Compass,
  Globe2,
  Home,
  Landmark,
  ListOrdered,
  MapPinned,
  Mountain,
  ShipWheel,
  Snowflake,
  Trash2,
  Trophy,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  Activity,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'

import {
  AdaptiveTerritoryOwnerPattern,
  AddEaterCard,
  ClaimDialog,
  TerritoryEventTable,
} from '@/apps/territory-map/components'
import { TerritoryMapCanvas } from '@/apps/territory-map/TerritoryMapCanvas'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { PresenterLauncher } from '@/apps/shared/components/Presenter'
import {
  loadTerritories,
  mapViewBoxes,
} from '@/apps/territory-map/data/territories'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import {
  getTerritoryClaimColor,
  getTerritoryClaimOwners,
} from '@/apps/territory-map/ownershipPattern'
import type {
  Territory,
  TerritoryClaim,
  TerritoryMapId,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n, type TranslationKey } from '@/lib/i18n'
import { syncErrorMessageKey } from '@/lib/firebase/syncError'

type SushiScore = {
  player: TerritoryPlayer
  world: number
  germany: number
  total: number
}

type AchievementDefinition = {
  id: string
  title: TranslationKey
  Icon: LucideIcon
  rule: TranslationKey
  matches: (event: TerritoryVisitEvent) => boolean
}

type AchievementResult = AchievementDefinition & {
  winnerNames: string[]
}

type PresenterTerritoryShapeProps = {
  claim?: TerritoryClaim
  patternPrefix: string
  players: TerritoryPlayer[]
  territory: Territory
}

const emptyTerritories: Territory[] = []

const africanTerritoryIds = new Set([
  'ao',
  'bf',
  'bi',
  'bj',
  'bw',
  'cd',
  'cf',
  'cg',
  'ci',
  'cm',
  'cv',
  'dj',
  'dz',
  'eg',
  'eh',
  'er',
  'et',
  'ga',
  'gh',
  'gm',
  'gn',
  'gq',
  'gw',
  'ke',
  'km',
  'lr',
  'ls',
  'ly',
  'ma',
  'mg',
  'ml',
  'mr',
  'mu',
  'mw',
  'mz',
  'na',
  'ne',
  'ng',
  'rw',
  'sc',
  'sd',
  'sh',
  'sl',
  'sn',
  'so',
  'sol',
  'ss',
  'st',
  'sz',
  'td',
  'tg',
  'tn',
  'tz',
  'ug',
  'za',
  'zm',
  'zw',
])
const nordicTerritoryIds = new Set(['dk', 'fi', 'fo', 'gl', 'is', 'nor', 'se'])
const alpineTerritoryIds = new Set(['at', 'ch'])
const balkanTerritoryIds = new Set([
  'al',
  'ba',
  'bg',
  'gr',
  'hr',
  'kos',
  'me',
  'mk',
  'ro',
  'rs',
  'si',
])
const americaTerritoryIds = new Set([
  'ag',
  'ai',
  'ar',
  'aw',
  'bb',
  'bm',
  'bo',
  'br',
  'bs',
  'bz',
  'ca',
  'cl',
  'co',
  'cr',
  'cu',
  'cw',
  'dm',
  'do',
  'ec',
  'fk',
  'gd',
  'gt',
  'gy',
  'hn',
  'ht',
  'jm',
  'kn',
  'lc',
  'mf',
  'mx',
  'ni',
  'pa',
  'pe',
  'pr',
  'py',
  'sr',
  'sx',
  'tc',
  'tt',
  'us',
  'uy',
  'vc',
  've',
  'vg',
  'vi',
])
const pacificTerritoryIds = new Set([
  'as',
  'au',
  'ck',
  'fj',
  'fm',
  'gu',
  'ki',
  'mh',
  'nc',
  'nr',
  'nu',
  'nz',
  'pf',
  'pg',
  'pw',
  'sb',
  'to',
  'tv',
  'vu',
  'wf',
  'ws',
])
const microstateTerritoryIds = new Set(['ad', 'li', 'mc', 'mt', 'sm', 'va'])
const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 'sushi-in-afrika',
    title: 'territory.achievement.sushi-in-afrika.title',
    Icon: Globe2,
    rule: 'territory.achievement.sushi-in-afrika.rule',
    matches: (event) =>
      event.mapId === 'world' && africanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'heimspiel',
    title: 'territory.achievement.heimspiel.title',
    Icon: Home,
    rule: 'territory.achievement.heimspiel.rule',
    matches: (event) =>
      (event.mapId === 'world' && event.territoryId === 'de') ||
      event.mapId === 'germany',
  },
  {
    id: 'nordlicht',
    title: 'territory.achievement.nordlicht.title',
    Icon: Snowflake,
    rule: 'territory.achievement.nordlicht.rule',
    matches: (event) =>
      event.mapId === 'world' && nordicTerritoryIds.has(event.territoryId),
  },
  {
    id: 'alpengeschmack',
    title: 'territory.achievement.alpengeschmack.title',
    Icon: Mountain,
    rule: 'territory.achievement.alpengeschmack.rule',
    matches: (event) =>
      event.mapId === 'world' && alpineTerritoryIds.has(event.territoryId),
  },
  {
    id: 'balkan-rolle',
    title: 'territory.achievement.balkan-rolle.title',
    Icon: MapPinned,
    rule: 'territory.achievement.balkan-rolle.rule',
    matches: (event) =>
      event.mapId === 'world' && balkanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'sushi-in-amerika',
    title: 'territory.achievement.sushi-in-amerika.title',
    Icon: Compass,
    rule: 'territory.achievement.sushi-in-amerika.rule',
    matches: (event) =>
      event.mapId === 'world' && americaTerritoryIds.has(event.territoryId),
  },
  {
    id: 'pazifik-teller',
    title: 'territory.achievement.pazifik-teller.title',
    Icon: ShipWheel,
    rule: 'territory.achievement.pazifik-teller.rule',
    matches: (event) =>
      event.mapId === 'world' && pacificTerritoryIds.has(event.territoryId),
  },
  {
    id: 'mikro-maki',
    title: 'territory.achievement.mikro-maki.title',
    Icon: Landmark,
    rule: 'territory.achievement.mikro-maki.rule',
    matches: (event) =>
      event.mapId === 'world' && microstateTerritoryIds.has(event.territoryId),
  },
  {
    id: 'land-der-sushi',
    title: 'territory.achievement.land-der-sushi.title',
    Icon: UtensilsCrossed,
    rule: 'territory.achievement.land-der-sushi.rule',
    matches: (event) => event.mapId === 'world' && event.territoryId === 'jp',
  },
  {
    id: 'hauptstadt-happen',
    title: 'territory.achievement.hauptstadt-happen.title',
    Icon: Building2,
    rule: 'territory.achievement.hauptstadt-happen.rule',
    matches: (event) => event.mapId === 'germany' && event.territoryId === 'DE-BE',
  },
]

function getEventDateKey(event: TerritoryVisitEvent) {
  const date = new Date(event.createdAtClientIso)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function compareEventsByAchievementTime(
  left: TerritoryVisitEvent,
  right: TerritoryVisitEvent,
) {
  return (
    getEventDateKey(left).localeCompare(getEventDateKey(right)) ||
    left.position - right.position
  )
}

function getAchievements(events: TerritoryVisitEvent[]): AchievementResult[] {
  const sortedEvents = [...events]
    .filter((event) => getEventDateKey(event))
    .sort(compareEventsByAchievementTime)

  return achievementDefinitions.map((achievement) => {
    const winners = new Map<string, string>()

    sortedEvents.forEach((event) => {
      if (achievement.matches(event) && !winners.has(event.playerId)) {
        winners.set(event.playerId, event.playerName)
      }
    })

    return {
      ...achievement,
      winnerNames: [...winners.values()],
    }
  })
}

function PresenterTerritoryShape({
  claim,
  patternPrefix,
  players,
  territory,
}: PresenterTerritoryShapeProps) {
  const { t } = useI18n()
  const pathRef = useRef<SVGPathElement>(null)
  const owners = getTerritoryClaimOwners(claim)
  const patternId = `${patternPrefix}-${territory.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const ownerColor =
    owners.length > 1
      ? `url(#${patternId})`
      : owners.length === 1
        ? getTerritoryClaimColor(
            owners[0].playerId,
            owners[0].playerColor,
            players,
          )
        : `url(#${patternPrefix}-unclaimed)`
  const ownerLabel =
    owners.length > 0
      ? owners.map((owner) => owner.playerName).join(', ')
      : t('territory.unvisited')

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
        stroke="var(--background)"
        strokeWidth={0.75}
        vectorEffect="non-scaling-stroke"
      >
        <title>{`${territory.name}: ${ownerLabel}`}</title>
      </path>
    </>
  )
}

function TerritoryMapPresenter({
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

function CollapsibleCardHeader({
  icon,
  isOpen,
  onToggle,
  title,
}: {
  icon: ReactNode
  isOpen: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <CardHeader className="p-4 sm:p-6">
      <button
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-md px-0 py-1 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        type="button"
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-primary">{icon}</span>
          <CardTitle className="min-w-0 truncate text-base">
            {title}
          </CardTitle>
        </span>
        <ChevronDown
          className={[
            'size-4 shrink-0 text-muted-foreground transition-transform',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>
    </CardHeader>
  )
}

export function TerritoryMapPage() {
  const { t } = useI18n()
  const {
    activeDataset,
    addPlayer,
    claimTerritory,
    claimsByMap,
    currentClaims,
    deleteEvent,
    error,
    isDatasetReady,
    players,
    removePlayer,
    setAchievementsOpen,
    setActiveMap,
    setScoreOpen,
    state,
    unclaimTerritory,
    updateEvent,
    updatePlayerColor,
    updatePlayerName,
  } = useTerritoryMap()
  const [isDatasetOpen, setIsDatasetOpen] = useState(false)
  const [isDatasetPrepared, setIsDatasetPrepared] = useState(false)
  const [isDatasetWarmed, setIsDatasetWarmed] = useState(false)
  const [isSushiTouristOpen, setIsSushiTouristOpen] = useState(false)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
  const [territoriesByMap, setTerritoriesByMap] = useState<
    Partial<Record<TerritoryMapId, Territory[]>>
  >({})
  const territories = territoriesByMap[state.activeMap] ?? emptyTerritories
  const isMapLoading = territories.length === 0
  const selectedTerritory = useMemo(
    () =>
      territories.find((territory) => territory.id === selectedTerritoryId) ??
      null,
    [selectedTerritoryId, territories],
  )
  const selectedClaim = selectedTerritory
    ? currentClaims[selectedTerritory.id]
    : undefined
  const sushiScores = useMemo<SushiScore[]>(() => {
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
  }, [claimsByMap, players])
  const achievements = useMemo(
    () => getAchievements(activeDataset.events),
    [activeDataset.events],
  )
  const appTitle = t('app.territoryMap.title')

  useEffect(() => {
    let isActive = true

    loadTerritories(state.activeMap).then((nextTerritories) => {
      if (!isActive) {
        return
      }

      setTerritoriesByMap((current) => ({
        ...current,
        [state.activeMap]: nextTerritories,
      }))
    })

    return () => {
      isActive = false
    }
  }, [state.activeMap])

  useEffect(() => {
    if (isDatasetPrepared || isMapLoading || !isDatasetReady) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsDatasetPrepared(true)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isDatasetPrepared, isDatasetReady, isMapLoading])

  useEffect(() => {
    if (!isDatasetPrepared || isDatasetOpen || isDatasetWarmed) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      startTransition(() => {
        setIsDatasetWarmed(true)
      })
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isDatasetOpen, isDatasetPrepared, isDatasetWarmed])

  const handleMapChange = (nextMap: TerritoryMapId) => {
    setSelectedTerritoryId(null)
    void setActiveMap(nextMap)
  }

  const handleClaim = async (playerId: string) => {
    if (!isDatasetReady || !selectedTerritory) {
      return
    }

    if (playerId === unclaimedValue) {
      await unclaimTerritory(
        state.activeMap,
        selectedTerritory.id,
        selectedClaim,
      )
      setSelectedTerritoryId(null)
      return
    }

    await claimTerritory(
      state.activeMap,
      selectedTerritory.id,
      playerId,
    )
    setSelectedTerritoryId(null)
  }

  const handleAddEater = async () => {
    if (!isDatasetReady) {
      return
    }

    await addPlayer()
  }

  const handleTerritorySelect = useCallback(
    (territoryId: string) => {
      if (isDatasetReady) {
        setSelectedTerritoryId(territoryId)
      }
    },
    [isDatasetReady],
  )

  return (
    <AppPage className="gap-5 py-6 lg:py-6" width="wide">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <AppPageTitle Icon={UtensilsCrossed} title={appTitle} />
        </div>
        <PresenterLauncher
          appTitle={appTitle}
          views={[
            {
              id: 'map',
              label: t('territory.map'),
              Icon: MapPinned,
              render: () => (
                <TerritoryMapPresenter
                  activeMap={state.activeMap}
                  claims={currentClaims}
                  isMapLoading={isMapLoading}
                  players={players}
                  sushiScores={sushiScores}
                  territories={territories}
                />
              ),
            },
          ]}
        />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>{t('common.firebaseError')}</CardTitle>
            <CardDescription>{t(syncErrorMessageKey(error))}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4">
        <TerritoryMapCanvas
          claims={currentClaims}
          isDisabled={!isDatasetReady}
          mapId={state.activeMap}
          onMapChange={handleMapChange}
          onSelect={handleTerritorySelect}
          players={players}
          selectedTerritoryId={selectedTerritoryId}
          territories={territories}
        />

        <div
          className={[
            'grid min-w-0 gap-4 lg:grid-cols-2',
            isSushiTouristOpen && state.isScoreOpen
              ? 'lg:items-stretch'
              : 'lg:items-start',
          ].join(' ')}
        >
          <Card>
            <CollapsibleCardHeader
              icon={<Users className="size-5" />}
              isOpen={isSushiTouristOpen}
              title={t('territory.tourist')}
              onToggle={() => setIsSushiTouristOpen((current) => !current)}
            />
            {isSushiTouristOpen && (
              <CardContent className="grid gap-3 p-4 pt-0">
              {players.map((player, playerIndex) => (
                <div
                  key={player.id}
                  className="grid gap-2 rounded-md border bg-background p-3"
                  style={{ '--player-color': player.color } as CSSProperties}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full bg-[var(--player-color)]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1 [&_[data-slot=button]]:size-9">
                      {isDatasetReady ? (
                        <InlineTextEdit
                          ariaLabel={t('territory.touristNameAria', {
                            name: player.name,
                          })}
                          className="truncate"
                          fallback={`Sushi-Tourist ${player.position}`}
                          value={player.name}
                          onSave={(value) => updatePlayerName(player.id, value)}
                        />
                      ) : (
                        <span className="type-label">{player.name}</span>
                      )}
                    </div>
                    <ColorPicker
                      ariaLabel={t('territory.touristColorAria', {
                        name: player.name,
                      })}
                      className="size-9 shrink-0 cursor-pointer"
                      disabled={!isDatasetReady}
                      value={player.color}
                      onValueCommit={(color) =>
                        updatePlayerColor(player.id, color)
                      }
                    />
                    {playerIndex >= 3 ? (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="size-9"
                        disabled={!isDatasetReady}
                        aria-label={t('shared.playerCard.removeAria', {
                          name: player.name,
                        })}
                        onClick={() => void removePlayer(player.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : (
                      <span className="size-9 shrink-0" aria-hidden="true" />
                    )}
                  </div>
                </div>
              ))}
              <AddEaterCard
                disabled={!isDatasetReady}
                onAdd={handleAddEater}
              />
              {!isDatasetReady && (
                <p className="type-ui text-muted-foreground">{t('common.syncing')}</p>
              )}
              </CardContent>
            )}
          </Card>

          <Card className="min-w-0">
            <CollapsibleCardHeader
              icon={<ListOrdered className="size-5" />}
              isOpen={state.isScoreOpen}
              title={t('territory.score')}
              onToggle={() => void setScoreOpen(!state.isScoreOpen)}
            />
            {state.isScoreOpen && (
              <CardContent className="p-4 pt-0">
                <Table className="table-fixed md:hidden" containerClassName="md:hidden">
                    <colgroup>
                      <col />
                      <col className="w-16 min-[400px]:w-[4.25rem]" />
                      <col className="w-16 min-[400px]:w-[4.25rem]" />
                      <col className="w-16 min-[400px]:w-[4.25rem]" />
                    </colgroup>
                    <TableHeader>
                        <TableHead className="px-2 py-2">
                          {t('territory.player')}
                        </TableHead>
                        <TableHead className="px-1 py-2 text-right">
                          {t('territory.world')}
                        </TableHead>
                        <TableHead className="px-1 py-2 text-right">DE</TableHead>
                        <TableHead className="py-2 pr-2 pl-0 text-right">
                          {t('territory.total')}
                        </TableHead>
                    </TableHeader>
                    <TableBody>
                      {sushiScores.map((score) => (
                        <TableRow key={score.player.id}>
                          <TableCell className="type-label min-w-0 px-2 py-2">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: score.player.color }}
                                aria-hidden="true"
                              />
                              <span className="min-w-0 truncate">{score.player.name}</span>
                            </span>
                          </TableCell>
                          <TableCell className="px-1 py-2 text-right tabular-nums">
                            {score.world}
                          </TableCell>
                          <TableCell className="px-1 py-2 text-right tabular-nums">
                            {score.germany}
                          </TableCell>
                          <TableCell className="type-action py-2 pr-2 pl-0 text-right tabular-nums">
                            {score.total}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
                <Table className="min-w-[34rem]" containerClassName="hidden md:block">
                    <TableHeader>
                        <TableHead>{t('territory.player')}</TableHead>
                        <TableHead className="text-right">
                          {t('territory.world')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('territory.map.germany')}
                        </TableHead>
                        <TableHead className="text-right">
                          {t('territory.total')}
                        </TableHead>
                    </TableHeader>
                    <TableBody>
                      {sushiScores.map((score) => (
                        <TableRow key={score.player.id}>
                          <TableCell className="type-label">
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="size-3 shrink-0 rounded-full"
                                style={{ backgroundColor: score.player.color }}
                                aria-hidden="true"
                              />
                              <span className="truncate">{score.player.name}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {score.world}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {score.germany}
                          </TableCell>
                          <TableCell className="type-action text-right tabular-nums">
                            {score.total}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>

        </div>
      </section>

      <Card>
        <CollapsibleCardHeader
          icon={<Trophy className="size-5" />}
          isOpen={state.isAchievementsOpen}
          title={t('territory.achievements')}
          onToggle={() =>
            void setAchievementsOpen(!state.isAchievementsOpen)
          }
        />
        {state.isAchievementsOpen && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = achievement.Icon
                const winnerLabel = achievement.winnerNames.join(', ')
                const isUnlocked = achievement.winnerNames.length > 0

                return (
                  <li key={achievement.id}>
                    <details
                      className={[
                        'overflow-hidden rounded-md border bg-background transition-colors',
                        isUnlocked
                          ? 'text-foreground'
                          : 'text-muted-foreground grayscale',
                      ].join(' ')}
                    >
                      <summary className="type-ui grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_2rem_minmax(4.5rem,auto)] items-center gap-3 p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                        <span className="type-label min-w-0 truncate">
                          {t(achievement.title)}
                        </span>
                        <span className="flex size-8 items-center justify-center text-primary">
                          <Icon className="size-5" />
                        </span>
                        <span className="type-action min-w-0 truncate text-right">
                          {winnerLabel || '-'}
                        </span>
                      </summary>
                      <p className="type-caption border-t bg-secondary/70 px-3 py-2 text-secondary-foreground">
                        {t(achievement.rule)}
                      </p>
                    </details>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        )}
      </Card>

      <Card>
        <CollapsibleCardHeader
          icon={<BarChart3 className="size-5" />}
          isOpen={isDatasetOpen}
          title={t('territory.datasetTitle')}
          onToggle={() => {
            if (!isDatasetOpen) {
              setIsDatasetPrepared(true)
              setIsDatasetWarmed(true)
            }
            setIsDatasetOpen((current) => !current)
          }}
        />
        {isDatasetPrepared && (
          <div
            aria-hidden={!isDatasetOpen}
            className={isDatasetOpen ? '' : 'invisible h-0 overflow-hidden'}
            data-dataset-warmed={isDatasetWarmed}
          >
            <Activity mode={isDatasetWarmed ? 'visible' : 'hidden'}>
              <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                {!isDatasetReady ? (
                  <p className="type-ui text-muted-foreground" role="status">
                    {t('common.syncing')}
                  </p>
                ) : (
                  <TerritoryEventTable
                    dataset={activeDataset}
                    disabled={false}
                    players={players}
                    onDeleteEvent={async (eventId) => {
                      const result = await deleteEvent(eventId)
                      if (result.ok) {
                        toast.success(t('territory.claimDeleted'))
                      }
                    }}
                    onUpdateEvent={(eventId, partialValue) =>
                      updateEvent(eventId, partialValue)
                    }
                  />
                )}
              </CardContent>
            </Activity>
          </div>
        )}
      </Card>

      <ClaimDialog
        key={selectedTerritory?.id ?? 'empty-territory'}
        claim={selectedClaim}
        isDisabled={!isDatasetReady}
        onClaim={handleClaim}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTerritoryId(null)
          }
        }}
        players={players}
        territory={selectedTerritory}
      />
    </AppPage>
  )
}
