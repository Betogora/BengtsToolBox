import {
  BarChart3,
  Building2,
  ChevronDown,
  ChevronRight,
  Compass,
  Globe2,
  Home,
  Landmark,
  ListOrdered,
  MapPinned,
  MousePointer2,
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
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { toast } from 'sonner'

import {
  AddEaterCard,
  ClaimDialog,
  InlineTextEdit,
  TerritoryEventTable,
  TerritoryShape,
} from '@/apps/territory-map/components'
import {
  loadTerritories,
  mapViewBoxes,
} from '@/apps/territory-map/data/territories'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import {
  clampZoom,
  mapLabels,
  tapMoveThreshold,
  unclaimedValue,
} from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryMapId,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

type MapPointer = {
  x: number
  y: number
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
    title: 'Sushi in Afrika',
    Icon: Globe2,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte mindestens ein afrikanisches Territorium bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && africanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'heimspiel',
    title: 'Heimspiel',
    Icon: Home,
    rule: 'Dieses Achievement bekommt jede Person, die Deutschland auf der Weltkarte oder ein Bundesland auf der Deutschlandkarte bereist hat.',
    matches: (event) =>
      (event.mapId === 'world' && event.territoryId === 'de') ||
      event.mapId === 'germany',
  },
  {
    id: 'nordlicht',
    title: 'Nordlicht',
    Icon: Snowflake,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte ein nordisches Territorium bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && nordicTerritoryIds.has(event.territoryId),
  },
  {
    id: 'alpengeschmack',
    title: 'Alpengeschmack',
    Icon: Mountain,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte Österreich oder die Schweiz bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && alpineTerritoryIds.has(event.territoryId),
  },
  {
    id: 'balkan-rolle',
    title: 'Balkan-Rolle',
    Icon: MapPinned,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte ein Balkan-Territorium bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && balkanTerritoryIds.has(event.territoryId),
  },
  {
    id: 'sushi-in-amerika',
    title: 'Sushi in Amerika',
    Icon: Compass,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte ein Territorium in Nord-, Mittel- oder Südamerika bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && americaTerritoryIds.has(event.territoryId),
  },
  {
    id: 'pazifik-teller',
    title: 'Pazifik-Teller',
    Icon: ShipWheel,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte ein Territorium in Ozeanien oder im Pazifik bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && pacificTerritoryIds.has(event.territoryId),
  },
  {
    id: 'mikro-maki',
    title: 'Mikro-Maki',
    Icon: Landmark,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte einen Microstate bereist hat.',
    matches: (event) =>
      event.mapId === 'world' && microstateTerritoryIds.has(event.territoryId),
  },
  {
    id: 'land-der-sushi',
    title: 'Land der Sushis',
    Icon: UtensilsCrossed,
    rule: 'Dieses Achievement bekommt jede Person, die auf der Weltkarte Japan bereist hat.',
    matches: (event) => event.mapId === 'world' && event.territoryId === 'jp',
  },
  {
    id: 'hauptstadt-happen',
    title: 'Hauptstadt-Happen',
    Icon: Building2,
    rule: 'Dieses Achievement bekommt jede Person, die Berlin auf der Deutschlandkarte bereist hat.',
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

function getTerritoryIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof SVGElement)) {
    return null
  }

  return target.closest<SVGElement>('[data-territory-id]')?.dataset
    .territoryId ?? null
}

export function TerritoryMapPage() {
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
  const [isMapDragging, setIsMapDragging] = useState(false)
  const [isScoreOpen, setIsScoreOpen] = useState(true)
  const [isSushiTouristOpen, setIsSushiTouristOpen] = useState(false)
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
  const [territoriesByMap, setTerritoriesByMap] = useState<
    Partial<Record<TerritoryMapId, Territory[]>>
  >({})
  const [view, setView] = useState<MapView>({
    offset: { x: 0, y: 0 },
    zoom: 1,
  })
  const activePointersRef = useRef(new Map<number, MapPointer>())
  const dragDistanceRef = useRef(0)
  const dragStartRef = useRef<{
    pointerId: number
    x: number
    y: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const lastPinchDistanceRef = useRef<number | null>(null)
  const liveViewRef = useRef<MapView>(view)
  const mapLayerRef = useRef<SVGGElement | null>(null)
  const pinchActiveRef = useRef(false)
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
    applyView(
      {
        offset: { x: 0, y: 0 },
        zoom: 1,
      },
      true,
    )
  }

  const getSvgPoint = (clientX: number, clientY: number) => {
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
      x: (clientX - left) / scale + viewBox.x,
      y: (clientY - top) / scale + viewBox.y,
    }
  }

  const applyZoomAt = (
    clientX: number,
    clientY: number,
    nextZoom: number,
    shouldCommit = false,
  ) => {
    const nextClampedZoom = clampZoom(nextZoom)
    const point = getSvgPoint(clientX, clientY)
    const currentView = liveViewRef.current

    if (!point) {
      applyView(
        {
          ...currentView,
          zoom: nextClampedZoom,
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
          x: point.x - mapX * nextClampedZoom,
          y: point.y - mapY * nextClampedZoom,
        },
        zoom: nextClampedZoom,
      },
      shouldCommit,
    )
  }

  const stopMapGesture = (pointerId?: number) => {
    if (typeof pointerId === 'number') {
      activePointersRef.current.delete(pointerId)
    } else {
      activePointersRef.current.clear()
    }

    lastPinchDistanceRef.current = null
    dragStartRef.current = null
    pinchActiveRef.current = false
    tapCandidateRef.current = null
    setIsMapDragging(false)
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

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Sushi Map
              </h1>
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message}
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-4">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <Tabs
                value={state.activeMap}
                className="min-w-0 flex-1"
                onValueChange={handleMapChange}
              >
                <TabsList className="h-10 max-w-full">
                  <TabsTrigger value="world">Welt</TabsTrigger>
                  <TabsTrigger value="germany">Deutschland</TabsTrigger>
                </TabsList>
              </Tabs>

              <Button
                variant="outline"
                size="icon"
                className="size-10 shrink-0 sm:size-9"
                aria-label="Ansicht zurücksetzen"
                title="Ansicht zurücksetzen"
                onClick={resetView}
              >
                <MousePointer2 className="size-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div
              className={[
                'touch-none cursor-grab overflow-hidden bg-secondary active:cursor-grabbing',
                state.activeMap === 'germany'
                  ? 'h-[44svh] min-h-[300px] sm:h-[50svh] sm:min-h-[360px]'
                  : 'h-[56svh] min-h-[320px] sm:h-[62svh] sm:min-h-[420px]',
              ].join(' ')}
              onWheel={(event) => {
                event.preventDefault()
                applyZoomAt(
                  event.clientX,
                  event.clientY,
                  liveViewRef.current.zoom + (event.deltaY < 0 ? 0.28 : -0.28),
                  true,
                )
              }}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' && event.button !== 0) {
                  return
                }

                event.currentTarget.setPointerCapture(event.pointerId)
                setIsMapDragging(true)
                activePointersRef.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                })
                dragDistanceRef.current = 0
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

                if (activePointersRef.current.size === 2) {
                  const pointers = [...activePointersRef.current.values()]
                  pinchActiveRef.current = true
                  tapCandidateRef.current = null
                  dragStartRef.current = null
                  lastPinchDistanceRef.current = Math.hypot(
                    pointers[0].x - pointers[1].x,
                    pointers[0].y - pointers[1].y,
                  )
                }
              }}
              onPointerMove={(event) => {
                if (!activePointersRef.current.has(event.pointerId)) {
                  return
                }

                activePointersRef.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                })

                if (activePointersRef.current.size >= 2) {
                  const pointers = [...activePointersRef.current.values()]
                  const nextDistance = Math.hypot(
                    pointers[0].x - pointers[1].x,
                    pointers[0].y - pointers[1].y,
                  )
                  const previousDistance = lastPinchDistanceRef.current
                  pinchActiveRef.current = true
                  tapCandidateRef.current = null

                  if (previousDistance && nextDistance > 0) {
                    applyZoomAt(
                      (pointers[0].x + pointers[1].x) / 2,
                      (pointers[0].y + pointers[1].y) / 2,
                      liveViewRef.current.zoom * (nextDistance / previousDistance),
                    )
                  }

                  lastPinchDistanceRef.current = nextDistance
                  return
                }

                const dragStart = dragStartRef.current

                if (!dragStart || dragStart.pointerId !== event.pointerId) {
                  return
                }

                const deltaX = event.clientX - dragStart.x
                const deltaY = event.clientY - dragStart.y
                dragDistanceRef.current = Math.hypot(deltaX, deltaY)
                const currentView = liveViewRef.current
                const panFactor = event.pointerType === 'touch' ? 2.4 : 1.25

                if (dragDistanceRef.current >= tapMoveThreshold) {
                  tapCandidateRef.current = null
                }

                applyView({
                  offset: {
                    x: dragStart.offsetX + deltaX * panFactor,
                    y: dragStart.offsetY + deltaY * panFactor,
                  },
                  zoom: currentView.zoom,
                })
              }}
              onPointerUp={(event) => {
                const tapCandidate = tapCandidateRef.current

                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId)
                }

                activePointersRef.current.delete(event.pointerId)

                if (
                  tapCandidate &&
                  tapCandidate.pointerId === event.pointerId &&
                  tapCandidate.territoryId &&
                  !pinchActiveRef.current &&
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

                stopMapGesture(event.pointerId)
              }}
            >
              <svg
                ref={svgRef}
                viewBox={mapViewBoxes[state.activeMap]}
                className="block size-full"
                aria-label={mapLabels[state.activeMap]}
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
                      Karte wird geladen...
                    </text>
                  )}
                  {territories.map((territory) => (
                    <TerritoryShape
                      key={territory.id}
                      claim={currentClaims[territory.id]}
                      isInteractionActive={isMapDragging}
                      isSelected={selectedTerritoryId === territory.id}
                      onSelect={() => setSelectedTerritoryId(territory.id)}
                      players={players}
                      territory={territory}
                    />
                  ))}
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>

        <div className="grid content-start gap-4">
          <Card>
            <CardHeader className="p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Users className="size-4" />
                  </div>
                  <CardTitle>Sushi-Tourist</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 sm:size-9"
                  aria-label={
                    isSushiTouristOpen
                      ? 'Sushi-Tourist einklappen'
                      : 'Sushi-Tourist ausklappen'
                  }
                  title={
                    isSushiTouristOpen
                      ? 'Sushi-Tourist einklappen'
                      : 'Sushi-Tourist ausklappen'
                  }
                  onClick={() => setIsSushiTouristOpen((current) => !current)}
                >
                  {isSushiTouristOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
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
                        ariaLabel={`Name für ${player.name}`}
                        fallback={`Sushi-Tourist ${player.position}`}
                        value={player.name}
                        onSave={(value) => updatePlayerName(player.id, value)}
                      />
                    </div>
                    <Input
                      type="color"
                      aria-label={`${player.name} Farbe wählen`}
                      className="size-9 shrink-0 cursor-pointer rounded-md border p-1"
                      value={player.color}
                      onChange={(event) =>
                        void updatePlayerColor(player.id, event.currentTarget.value)
                      }
                    />
                    {player.position > 2 ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-9"
                        aria-label={`${player.name} entfernen`}
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
                <p className="text-sm text-muted-foreground">Synchronisiere...</p>
              )}
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <ListOrdered className="size-4" />
                  </div>
                  <CardTitle>Punktzahl</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 sm:size-9"
                  aria-label={isScoreOpen ? 'Punktzahl einklappen' : 'Punktzahl ausklappen'}
                  title={isScoreOpen ? 'Punktzahl einklappen' : 'Punktzahl ausklappen'}
                  onClick={() => setIsScoreOpen((current) => !current)}
                >
                  {isScoreOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {isScoreOpen && (
              <CardContent className="p-4 pt-0">
              <ol className="grid gap-2">
                {sushiScores.map((score) => (
                  <li
                    key={score.player.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border bg-background p-3"
                    style={{ '--player-color': score.player.color } as CSSProperties}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full bg-[var(--player-color)]"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate text-sm font-medium">
                        {score.player.name}
                      </span>
                    </div>
                    <dl className="grid grid-cols-3 gap-2 text-right text-xs">
                      <div>
                        <dt className="text-muted-foreground">Welt</dt>
                        <dd className="font-semibold">{score.world}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Deutschland</dt>
                        <dd className="font-semibold">{score.germany}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Summe</dt>
                        <dd className="font-semibold">{score.total}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader className="p-4">
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                    <Trophy className="size-4" />
                  </div>
                  <CardTitle>Achievements</CardTitle>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-10 shrink-0 sm:size-9"
                  aria-label={
                    isAchievementsOpen
                      ? 'Achievements einklappen'
                      : 'Achievements ausklappen'
                  }
                  title={
                    isAchievementsOpen
                      ? 'Achievements einklappen'
                      : 'Achievements ausklappen'
                  }
                  onClick={() => setIsAchievementsOpen((current) => !current)}
                >
                  {isAchievementsOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {isAchievementsOpen && (
              <CardContent className="p-4 pt-0">
                <ul className="grid gap-2">
                  {achievements.map((achievement) => {
                    const Icon = achievement.Icon
                    const winnerLabel = achievement.winnerNames.join(', ')
                    const isUnlocked = achievement.winnerNames.length > 0

                    return (
                      <li
                        key={achievement.id}
                        aria-label={`${achievement.title}: ${achievement.rule}`}
                        className={[
                          'group grid grid-cols-[minmax(0,1fr)_2rem_minmax(4.5rem,auto)] items-center gap-3 rounded-md border bg-background p-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          isUnlocked
                            ? 'text-foreground'
                            : 'text-muted-foreground opacity-55 grayscale',
                        ].join(' ')}
                        tabIndex={0}
                        title={achievement.rule}
                      >
                        <span className="min-w-0 truncate font-medium">
                          {achievement.title}
                        </span>
                        <span className="flex size-8 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 truncate text-right font-semibold">
                          {winnerLabel || '-'}
                        </span>
                        <span className="col-span-3 hidden rounded-md bg-secondary/70 px-2 py-1 text-xs leading-snug text-secondary-foreground group-hover:block group-focus:block group-active:block">
                          {achievement.rule}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            )}
          </Card>
        </div>
      </section>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <BarChart3 className="size-4" />
              </div>
              <CardTitle>Datensatz</CardTitle>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="size-10 shrink-0 sm:size-9"
              aria-label={isDatasetOpen ? 'Datensatz einklappen' : 'Datensatz ausklappen'}
              title={isDatasetOpen ? 'Datensatz einklappen' : 'Datensatz ausklappen'}
              onClick={() => setIsDatasetOpen((current) => !current)}
            >
              {isDatasetOpen ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {isDatasetOpen && (
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
            <TerritoryEventTable
              dataset={activeDataset}
              players={players}
              onDeleteEvent={async (eventId) => {
                await deleteEvent(eventId)
                toast.success('Bereisung gelöscht.')
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
    </div>
  )
}
