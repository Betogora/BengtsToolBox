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
  Minus,
  Plus,
  ShipWheel,
  Snowflake,
  Trash2,
  Trophy,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
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
  AddEaterCard,
  ClaimDialog,
  TerritoryEventTable,
  TerritoryShape,
} from '@/apps/territory-map/components'
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
import {
  mapZoomLevels,
  tapMoveThreshold,
  unclaimedValue,
} from '@/apps/territory-map/mapConfig'
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
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'

type SushiScore = {
  player: TerritoryPlayer
  world: number
  germany: number
  total: number
}

type AchievementDefinition = {
  id: string
  title: string
  Icon: LucideIcon
  rule: string
  matches: (event: TerritoryVisitEvent) => boolean
}

type AchievementResult = AchievementDefinition & {
  winnerNames: string[]
}

type MapView = {
  offset: {
    x: number
    y: number
  }
  zoom: number
}

type SvgRenderMetrics = {
  left: number
  scale: number
  top: number
  viewBoxX: number
  viewBoxY: number
}

type PresenterTerritoryShapeProps = {
  claim?: TerritoryClaim
  patternPrefix: string
  players: TerritoryPlayer[]
  territory: Territory
}

type PendingDragMove = {
  clientX: number
  clientY: number
  pointerId: number
}

const emptyTerritories: Territory[] = []
const defaultZoomLevelIndex = 0
const defaultMapView: MapView = {
  offset: { x: 0, y: 0 },
  zoom: mapZoomLevels[defaultZoomLevelIndex],
}

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
    title: 'Sushi in Afrika',
    Icon: Globe2,
    rule: 'Bereise auf der Weltkarte mindestens ein afrikanisches Territorium.',
    matches: (event) =>
      event.mapId === 'world' && africanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'heimspiel',
    title: 'Heimspiel',
    Icon: Home,
    rule: 'Bereise Deutschland auf der Weltkarte oder ein Bundesland auf der Deutschlandkarte.',
    matches: (event) =>
      (event.mapId === 'world' && event.territoryId === 'de') ||
      event.mapId === 'germany',
  },
  {
    id: 'nordlicht',
    title: 'Nordlicht',
    Icon: Snowflake,
    rule: 'Bereise auf der Weltkarte ein nordisches Territorium.',
    matches: (event) =>
      event.mapId === 'world' && nordicTerritoryIds.has(event.territoryId),
  },
  {
    id: 'alpengeschmack',
    title: 'Alpengeschmack',
    Icon: Mountain,
    rule: 'Bereise auf der Weltkarte Österreich oder die Schweiz.',
    matches: (event) =>
      event.mapId === 'world' && alpineTerritoryIds.has(event.territoryId),
  },
  {
    id: 'balkan-rolle',
    title: 'Balkan-Rolle',
    Icon: MapPinned,
    rule: 'Bereise auf der Weltkarte ein Balkan-Territorium.',
    matches: (event) =>
      event.mapId === 'world' && balkanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'sushi-in-amerika',
    title: 'Sushi in Amerika',
    Icon: Compass,
    rule: 'Bereise auf der Weltkarte ein Territorium in Nord-, Mittel- oder Südamerika.',
    matches: (event) =>
      event.mapId === 'world' && americaTerritoryIds.has(event.territoryId),
  },
  {
    id: 'pazifik-teller',
    title: 'Pazifik-Teller',
    Icon: ShipWheel,
    rule: 'Bereise auf der Weltkarte ein Territorium in Ozeanien oder im Pazifik.',
    matches: (event) =>
      event.mapId === 'world' && pacificTerritoryIds.has(event.territoryId),
  },
  {
    id: 'mikro-maki',
    title: 'Mikro-Maki',
    Icon: Landmark,
    rule: 'Bereise auf der Weltkarte einen Microstate.',
    matches: (event) =>
      event.mapId === 'world' && microstateTerritoryIds.has(event.territoryId),
  },
  {
    id: 'land-der-sushi',
    title: 'Land der Sushis',
    Icon: UtensilsCrossed,
    rule: 'Bereise auf der Weltkarte Japan.',
    matches: (event) => event.mapId === 'world' && event.territoryId === 'jp',
  },
  {
    id: 'hauptstadt-happen',
    title: 'Hauptstadt-Happen',
    Icon: Building2,
    rule: 'Bereise Berlin auf der Deutschlandkarte.',
    matches: (event) => event.mapId === 'germany' && event.territoryId === 'DE-BE',
  },
]

function getMapTransform(view: MapView) {
  return `translate(${view.offset.x} ${view.offset.y}) scale(${view.zoom})`
}

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

function getPresenterClaimColor(
  claimPlayerId: string,
  claimColor: string,
  players: TerritoryPlayer[],
) {
  return players.find((player) => player.id === claimPlayerId)?.color ?? claimColor
}

function PresenterTerritoryShape({
  claim,
  patternPrefix,
  players,
  territory,
}: PresenterTerritoryShapeProps) {
  const { t } = useI18n()
  const owners = claim?.owners?.length
    ? claim.owners
    : claim
      ? [
          {
            playerId: claim.playerId,
            playerName: claim.playerName,
            playerColor: claim.playerColor,
          },
        ]
      : []
  const patternId = `${patternPrefix}-${territory.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const ownerColor =
    owners.length > 1
      ? `url(#${patternId})`
      : owners.length === 1
        ? getPresenterClaimColor(owners[0].playerId, owners[0].playerColor, players)
        : `url(#${patternPrefix}-unclaimed)`
  const ownerLabel =
    owners.length > 0
      ? owners.map((owner) => owner.playerName).join(', ')
      : t('territory.unvisited')

  return (
    <>
      {owners.length > 1 && (
        <pattern
          id={patternId}
          width={owners.length * 8}
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          {owners.map((owner, index) => (
            <rect
              key={owner.playerId}
              x={index * 8}
              width="8"
              height="8"
              fill={getPresenterClaimColor(owner.playerId, owner.playerColor, players)}
            />
          ))}
        </pattern>
      )}
      <path
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

function getTerritoryIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof SVGElement)) {
    return null
  }

  return target.closest<SVGElement>('[data-territory-id]')?.dataset
    .territoryId ?? null
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
    isLoading,
    players,
    removePlayer,
    setActiveMap,
    state,
    unclaimTerritory,
    updateEvent,
    updatePlayerColor,
    updatePlayerName,
  } = useTerritoryMap()
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(true)
  const [isDatasetOpen, setIsDatasetOpen] = useState(false)
  const [isScoreOpen, setIsScoreOpen] = useState(true)
  const [isSushiTouristOpen, setIsSushiTouristOpen] = useState(false)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
  const [territoriesByMap, setTerritoriesByMap] = useState<
    Partial<Record<TerritoryMapId, Territory[]>>
  >({})
  const [view, setView] = useState<MapView>(defaultMapView)
  const [zoomLevelIndex, setZoomLevelIndex] = useState(defaultZoomLevelIndex)
  const activePointersRef = useRef(new Set<number>())
  const dragDistanceRef = useRef(0)
  const dragStartRef = useRef<{
    pointerId: number
    x: number
    y: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const liveViewRef = useRef<MapView>(view)
  const mapLayerRef = useRef<SVGGElement | null>(null)
  const mapViewportRef = useRef<HTMLDivElement | null>(null)
  const gestureMetricsRef = useRef<SvgRenderMetrics | null>(null)
  const multiPointerActiveRef = useRef(false)
  const pendingDragMoveRef = useRef<PendingDragMove | null>(null)
  const panRafRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tapCandidateRef = useRef<{
    pointerId: number
    territoryId: string | null
    x: number
    y: number
  } | null>(null)
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

  const applyLiveTransform = () => {
    rafRef.current = null
    mapLayerRef.current?.setAttribute(
      'transform',
      getMapTransform(liveViewRef.current),
    )
  }

  const scheduleLiveTransform = () => {
    if (rafRef.current !== null) {
      return
    }

    rafRef.current = window.requestAnimationFrame(applyLiveTransform)
  }

  const applyView = (nextView: MapView, shouldCommit = false) => {
    liveViewRef.current = nextView
    scheduleLiveTransform()

    if (shouldCommit) {
      setView(nextView)
    }
  }

  const commitLiveView = () => {
    setView(liveViewRef.current)
  }

  const resetView = () => {
    setZoomLevelIndex(defaultZoomLevelIndex)
    applyView(defaultMapView, true)
  }

  const getSvgRenderMetrics = () => {
    const svg = svgRef.current

    if (!svg) {
      return null
    }

    const rect = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    const scale = Math.min(rect.width / viewBox.width, rect.height / viewBox.height)
    const renderedWidth = viewBox.width * scale
    const renderedHeight = viewBox.height * scale
    const left = rect.left + (rect.width - renderedWidth) / 2
    const top = rect.top + (rect.height - renderedHeight) / 2

    return {
      left,
      scale,
      top,
      viewBoxX: viewBox.x,
      viewBoxY: viewBox.y,
    }
  }

  const getSvgPoint = (clientX: number, clientY: number) => {
    const metrics = getSvgRenderMetrics()

    if (!metrics) {
      return null
    }

    return {
      x: (clientX - metrics.left) / metrics.scale + metrics.viewBoxX,
      y: (clientY - metrics.top) / metrics.scale + metrics.viewBoxY,
    }
  }

  const setMapDragging = (isDragging: boolean) => {
    const viewport = mapViewportRef.current

    if (!viewport) {
      return
    }

    viewport.dataset.mapDragging = String(isDragging)
  }

  const applyPendingDragMove = () => {
    panRafRef.current = null

    const pendingMove = pendingDragMoveRef.current
    pendingDragMoveRef.current = null

    if (!pendingMove || !activePointersRef.current.has(pendingMove.pointerId)) {
      return
    }

    if (activePointersRef.current.size > 1) {
      multiPointerActiveRef.current = true
      tapCandidateRef.current = null
      return
    }

    const dragStart = dragStartRef.current

    if (!dragStart || dragStart.pointerId !== pendingMove.pointerId) {
      return
    }

    const deltaX = pendingMove.clientX - dragStart.x
    const deltaY = pendingMove.clientY - dragStart.y
    dragDistanceRef.current = Math.hypot(deltaX, deltaY)

    const metrics = gestureMetricsRef.current
    const svgDeltaX = metrics ? deltaX / metrics.scale : deltaX
    const svgDeltaY = metrics ? deltaY / metrics.scale : deltaY

    if (dragDistanceRef.current >= tapMoveThreshold) {
      tapCandidateRef.current = null
    }

    applyView({
      offset: {
        x: dragStart.offsetX + svgDeltaX,
        y: dragStart.offsetY + svgDeltaY,
      },
      zoom: liveViewRef.current.zoom,
    })
  }

  const schedulePendingDragMove = () => {
    if (panRafRef.current !== null) {
      return
    }

    panRafRef.current = window.requestAnimationFrame(applyPendingDragMove)
  }

  const applyZoomAt = (
    clientX: number,
    clientY: number,
    nextZoom: number,
    shouldCommit = false,
  ) => {
    const point = getSvgPoint(clientX, clientY)
    const currentView = liveViewRef.current

    if (!point) {
      applyView(
        {
          ...currentView,
          zoom: nextZoom,
        },
        shouldCommit,
      )
      return
    }

    const mapX = (point.x - currentView.offset.x) / currentView.zoom
    const mapY = (point.y - currentView.offset.y) / currentView.zoom

    applyView(
      {
        offset: {
          x: point.x - mapX * nextZoom,
          y: point.y - mapY * nextZoom,
        },
        zoom: nextZoom,
      },
      shouldCommit,
    )
  }

  const applyZoomLevel = (nextZoomLevelIndex: number) => {
    const nextZoom = mapZoomLevels[nextZoomLevelIndex]
    const svg = svgRef.current

    setZoomLevelIndex(nextZoomLevelIndex)

    if (!svg) {
      applyView(
        {
          ...liveViewRef.current,
          zoom: nextZoom,
        },
        true,
      )
      return
    }

    const rect = svg.getBoundingClientRect()
    applyZoomAt(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      nextZoom,
      true,
    )
  }

  const stopMapGesture = (pointerId?: number) => {
    if (typeof pointerId === 'number') {
      activePointersRef.current.delete(pointerId)
    } else {
      activePointersRef.current.clear()
    }

    if (panRafRef.current !== null) {
      window.cancelAnimationFrame(panRafRef.current)
      applyPendingDragMove()
    }

    dragStartRef.current = null
    gestureMetricsRef.current = null
    multiPointerActiveRef.current = false
    pendingDragMoveRef.current = null
    tapCandidateRef.current = null
    setMapDragging(false)
    commitLiveView()
  }

  useEffect(() => {
    liveViewRef.current = view
    mapLayerRef.current?.setAttribute('transform', getMapTransform(view))
  }, [view])

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }

      if (panRafRef.current !== null) {
        window.cancelAnimationFrame(panRafRef.current)
      }
    },
    [],
  )

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

  const handleMapChange = (nextMap: string) => {
    setSelectedTerritoryId(null)
    resetView()
    void setActiveMap(nextMap as TerritoryMapId)
  }

  const handleClaim = async (playerId: string) => {
    if (!selectedTerritory) {
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
    await addPlayer()
  }

  const handleTerritorySelect = useCallback((territoryId: string) => {
    setSelectedTerritoryId(territoryId)
  }, [])

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
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden bg-secondary">
          <CardHeader className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Tabs
                value={state.activeMap}
                className="min-w-0 flex-1"
                onValueChange={handleMapChange}
              >
                <TabsList className="h-10 max-w-full border bg-muted/65 shadow-sm backdrop-blur">
                  <TabsTrigger
                    value="world"
                    className="data-[state=active]:bg-background/75"
                  >
                    {t('territory.world')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="germany"
                    className="data-[state=active]:bg-background/75"
                  >
                    {t('territory.map.germany')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 bg-background/75 sm:size-9"
                aria-label={t('territory.zoomOut')}
                title={t('territory.zoomOut')}
                disabled={zoomLevelIndex === 0}
                onClick={() => applyZoomLevel(zoomLevelIndex - 1)}
              >
                <Minus className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 bg-background/75 sm:size-9"
                aria-label={t('territory.zoomIn')}
                title={t('territory.zoomIn')}
                disabled={zoomLevelIndex === mapZoomLevels.length - 1}
                onClick={() => applyZoomLevel(zoomLevelIndex + 1)}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="bg-secondary p-0">
            <div
              ref={mapViewportRef}
              data-map-dragging="false"
              className={[
                'touch-none cursor-grab overflow-hidden bg-secondary active:cursor-grabbing',
                state.activeMap === 'germany'
                  ? 'h-[44svh] min-h-[300px] sm:h-[50svh] sm:min-h-[360px]'
                  : 'h-[56svh] min-h-[320px] sm:h-[62svh] sm:min-h-[420px]',
              ].join(' ')}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) {
                  return
                }

                event.currentTarget.setPointerCapture(event.pointerId)
                setMapDragging(true)
                activePointersRef.current.add(event.pointerId)
                dragDistanceRef.current = 0
                gestureMetricsRef.current = getSvgRenderMetrics()
                dragStartRef.current = {
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  offsetX: liveViewRef.current.offset.x,
                  offsetY: liveViewRef.current.offset.y,
                }
                tapCandidateRef.current = {
                  pointerId: event.pointerId,
                  territoryId: getTerritoryIdFromTarget(event.target),
                  x: event.clientX,
                  y: event.clientY,
                }

                if (activePointersRef.current.size > 1) {
                  multiPointerActiveRef.current = true
                  tapCandidateRef.current = null
                  dragStartRef.current = null
                  pendingDragMoveRef.current = null
                }
              }}
              onPointerMove={(event) => {
                if (!activePointersRef.current.has(event.pointerId)) {
                  return
                }

                if (activePointersRef.current.size > 1) {
                  multiPointerActiveRef.current = true
                  tapCandidateRef.current = null
                  pendingDragMoveRef.current = null
                  return
                }

                pendingDragMoveRef.current = {
                  clientX: event.clientX,
                  clientY: event.clientY,
                  pointerId: event.pointerId,
                }
                schedulePendingDragMove()
              }}
              onPointerUp={(event) => {
                const tapCandidate = tapCandidateRef.current

                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }

                if (panRafRef.current !== null) {
                  window.cancelAnimationFrame(panRafRef.current)
                  applyPendingDragMove()
                }

                activePointersRef.current.delete(event.pointerId)

                if (
                  tapCandidate &&
                  tapCandidate.pointerId === event.pointerId &&
                  tapCandidate.territoryId &&
                  !multiPointerActiveRef.current &&
                  Math.hypot(
                    event.clientX - tapCandidate.x,
                    event.clientY - tapCandidate.y,
                  ) < tapMoveThreshold
                ) {
                  setSelectedTerritoryId(tapCandidate.territoryId)
                }

                if (activePointersRef.current.size === 0) {
                  stopMapGesture()
                }
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }

                if (panRafRef.current !== null) {
                  window.cancelAnimationFrame(panRafRef.current)
                  applyPendingDragMove()
                }

                stopMapGesture(event.pointerId)
              }}
            >
              <svg
                ref={svgRef}
                viewBox={mapViewBoxes[state.activeMap]}
                className="block size-full"
                aria-label={t(
                  state.activeMap === 'world'
                    ? 'territory.map.world'
                    : 'territory.map.germany',
                )}
              >
                <defs>
                  <pattern
                    id="territory-unclaimed"
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
                <g
                  ref={mapLayerRef}
                  className="territory-map-layer"
                  transform={getMapTransform(view)}
                >
                  {isMapLoading && territories.length === 0 && (
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
                  )}
                  {territories.map((territory) => (
                    <TerritoryShape
                      key={territory.id}
                      claim={currentClaims[territory.id]}
                      isSelected={selectedTerritoryId === territory.id}
                      onSelect={handleTerritorySelect}
                      players={players}
                      territory={territory}
                    />
                  ))}
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>

        <div className="grid min-w-0 content-start gap-4">
          <Card>
            <CollapsibleCardHeader
              icon={<Users className="size-5" />}
              isOpen={isSushiTouristOpen}
              title={t('territory.tourist')}
              onToggle={() => setIsSushiTouristOpen((current) => !current)}
            />
            {isSushiTouristOpen && (
              <CardContent className="grid gap-3 p-4 pt-0">
              {players.map((player) => (
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
                    <div className="min-w-0 flex-1">
                      <InlineTextEdit
                        ariaLabel={t('territory.touristNameAria', {
                          name: player.name,
                        })}
                        fallback={`Sushi-Tourist ${player.position}`}
                        value={player.name}
                        onSave={(value) => updatePlayerName(player.id, value)}
                      />
                    </div>
                    <Input
                      type="color"
                      aria-label={t('territory.touristColorAria', {
                        name: player.name,
                      })}
                      className="size-9 shrink-0 cursor-pointer rounded-md border p-1"
                      value={player.color}
                      onChange={(event) =>
                        void updatePlayerColor(player.id, event.currentTarget.value)
                      }
                    />
                    {player.position > 2 ? (
                      <Button
                        variant="delete"
                        size="icon"
                        className="size-11 sm:size-9"
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
              <AddEaterCard onAdd={handleAddEater} />
              {isLoading && players.length === 0 && (
                <p className="type-ui text-muted-foreground">{t('common.syncing')}</p>
              )}
              </CardContent>
            )}
          </Card>

          <Card className="min-w-0">
            <CollapsibleCardHeader
              icon={<ListOrdered className="size-5" />}
              isOpen={isScoreOpen}
              title={t('territory.score')}
              onToggle={() => setIsScoreOpen((current) => !current)}
            />
            {isScoreOpen && (
              <CardContent className="p-4 pt-0">
                <Table className="table-fixed md:hidden" containerClassName="md:hidden">
                    <colgroup>
                      <col />
                      <col className="w-14" />
                      <col className="w-20" />
                      <col className="w-14" />
                    </colgroup>
                    <TableHeader>
                        <TableHead className="px-2 py-2">
                          {t('territory.player')}
                        </TableHead>
                        <TableHead className="px-1 py-2 text-right">
                          {t('territory.world')}
                        </TableHead>
                        <TableHead className="px-1 py-2 text-right">DE</TableHead>
                        <TableHead className="px-2 py-2 text-right">
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
                          <TableCell className="type-action px-2 py-2 text-right tabular-nums">
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
          isOpen={isAchievementsOpen}
          title="Achievements"
          onToggle={() => setIsAchievementsOpen((current) => !current)}
        />
        {isAchievementsOpen && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {achievements.map((achievement) => {
                const Icon = achievement.Icon
                const winnerLabel = achievement.winnerNames.join(', ')
                const isUnlocked = achievement.winnerNames.length > 0

                return (
                  <li
                    key={achievement.id}
                    aria-label={`${achievement.title}: ${achievement.rule}`}
                    className={[
                      'type-ui group grid grid-cols-[minmax(0,1fr)_2rem_minmax(4.5rem,auto)] items-center gap-3 rounded-md border bg-background p-3 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isUnlocked
                        ? 'text-foreground'
                        : 'text-muted-foreground opacity-55 grayscale',
                    ].join(' ')}
                    tabIndex={0}
                    title={achievement.rule}
                  >
                    <span className="type-label min-w-0 truncate">
                      {achievement.title}
                    </span>
                    <span className="flex size-8 items-center justify-center text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="type-action min-w-0 truncate text-right">
                      {winnerLabel || '-'}
                    </span>
                    <span className="type-caption col-span-3 hidden rounded-md bg-secondary/70 px-2 py-1 text-secondary-foreground group-hover:block group-focus:block group-active:block">
                      {achievement.rule}
                    </span>
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
          onToggle={() => setIsDatasetOpen((current) => !current)}
        />
        {isDatasetOpen && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <TerritoryEventTable
              dataset={activeDataset}
              players={players}
              onDeleteEvent={async (eventId) => {
                await deleteEvent(eventId)
                toast.success(t('territory.claimDeleted'))
              }}
              onUpdateEvent={(eventId, partialValue) =>
                updateEvent(eventId, partialValue)
              }
            />
          </CardContent>
        )}
      </Card>

      <ClaimDialog
        key={selectedTerritory?.id ?? 'empty-territory'}
        claim={selectedClaim}
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
