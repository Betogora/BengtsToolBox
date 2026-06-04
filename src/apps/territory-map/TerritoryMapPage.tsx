import {
  ListOrdered,
  MousePointer2,
  RotateCcw,
  Trash2,
  Undo2,
  UtensilsCrossed,
  Users,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'

import { mapViewBoxes, territoriesByMap } from '@/apps/territory-map/data/territories'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import {
  AddEaterCard,
  ClaimDialog,
  InlineTextEdit,
  TerritoryShape,
} from '@/apps/territory-map/components'
import {
  clampZoom,
  mapLabels,
  tapMoveThreshold,
  unclaimedValue,
} from '@/apps/territory-map/mapConfig'
import type {
  TerritoryMapId,
  TerritoryPlayer,
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

function getMapTransform(view: MapView) {
  return `translate(${view.offset.x} ${view.offset.y}) scale(${view.zoom})`
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
    addPlayer,
    claimTerritory,
    claimedCount,
    currentClaims,
    error,
    isLoading,
    players,
    removePlayer,
    resetCurrentMap,
    setActiveMap,
    state,
    unclaimTerritory,
    undoLastClaim,
    updatePlayerColor,
    updatePlayerName,
  } = useTerritoryMap()
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null)
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
  const territories = territoriesByMap[state.activeMap]
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
      Object.values(state.claimsByMap[mapId]).filter(
        (claim) => claim.playerId === playerId,
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
  }, [players, state.claimsByMap])

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

  const handleResetCurrentMap = () => {
    if (claimedCount === 0) {
      return
    }

    if (window.confirm(`${mapLabels[state.activeMap]} wirklich zurücksetzen?`)) {
      void resetCurrentMap()
    }
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
                World Sushi Map
              </h1>
            </div>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error.message}
            </p>
          )}
        </div>

        <Tabs value={state.activeMap} onValueChange={handleMapChange}>
          <TabsList>
            <TabsTrigger value="world">Welt</TabsTrigger>
            <TabsTrigger value="germany">Deutschland</TabsTrigger>
          </TabsList>
        </Tabs>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">
                  {mapLabels[state.activeMap]}
                </CardTitle>
              </div>

              <div className="flex flex-wrap gap-2 [&_button]:size-11 sm:[&_button]:size-9">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-11 sm:size-9"
                  aria-label="Ansicht zurücksetzen"
                  title="Ansicht zurücksetzen"
                  onClick={resetView}
                >
                  <MousePointer2 className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Letzten Claim rückgängig machen"
                  title="Letzten Claim rückgängig machen"
                  disabled={!state.lastClaimAction}
                  onClick={() => void undoLastClaim()}
                >
                  <Undo2 className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Aktuelle Karte zurücksetzen"
                  title="Aktuelle Karte zurücksetzen"
                  disabled={claimedCount === 0}
                  onClick={handleResetCurrentMap}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div
              className="h-[56svh] min-h-[320px] touch-none cursor-grab overflow-hidden bg-secondary active:cursor-grabbing sm:h-[62svh] sm:min-h-[420px]"
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

                if (dragDistanceRef.current >= tapMoveThreshold) {
                  tapCandidateRef.current = null
                }

                applyView({
                  offset: {
                    x: dragStart.offsetX + (deltaX / currentView.zoom) * 1.25,
                    y: dragStart.offsetY + (deltaY / currentView.zoom) * 1.25,
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
                className="size-full"
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
                  <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow
                      dx="0"
                      dy="10"
                      stdDeviation="14"
                      floodColor="var(--foreground)"
                      floodOpacity="0.16"
                    />
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="var(--secondary)" />
                <g
                  ref={mapLayerRef}
                  className="territory-map-layer"
                  transform={getMapTransform(view)}
                  filter="url(#map-shadow)"
                >
                  {territories.map((territory) => (
                    <TerritoryShape
                      key={territory.id}
                      claim={currentClaims[territory.id]}
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
            <CardHeader className="flex-row items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <Users className="size-4" />
              </div>
              <div>
                <CardTitle>Sushi-Tourist</CardTitle>
              </div>
            </CardHeader>
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
              {isLoading && (
                <p className="text-sm text-muted-foreground">Lade Spielstand...</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-3 p-4">
              <div className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                <ListOrdered className="size-4" />
              </div>
              <div>
                <CardTitle>Punktzahl</CardTitle>
              </div>
            </CardHeader>
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
          </Card>
        </div>
      </section>

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
