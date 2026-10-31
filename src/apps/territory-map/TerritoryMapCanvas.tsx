import { Minus, Plus } from 'lucide-react'
import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { FocusEvent, PointerEvent } from 'react'

import { TerritoryShape } from '@/apps/territory-map/components'
import { mapViewBoxes } from '@/apps/territory-map/data/territories'
import { tapMoveThreshold } from '@/apps/territory-map/mapConfig'
import {
  defaultMapView,
  getMapFrame,
  getNextZoomLevel,
  getOverscannedViewBox,
  getStageTransform,
  getWheelZoomFactor,
  mapStageOverscan,
  maxMapZoom,
  minMapZoom,
  panMapView,
  parseMapViewBox,
  shouldRedrawStage,
  toMapPoint,
  zoomMapView,
} from '@/apps/territory-map/mapView'
import type { MapPoint, MapView } from '@/apps/territory-map/mapView'
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
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { useI18n } from '@/lib/i18n'
import { dateTimeFormat } from '@/lib/i18n/formatters'

type MapGesture =
  | { kind: 'pan'; pointerId: number; start: MapPoint; startView: MapView }
  | { kind: 'pinch'; startDistance: number; startMidpoint: MapPoint; startView: MapView }

// Safari meldet Trackpad-Pinch als GestureEvent statt als Mausrad mit ctrlKey.
type SafariGestureEvent = UIEvent & { clientX: number; clientY: number; scale: number }

// Läuft gerade Seitenscrollen über die Karte, bleibt das Mausrad beim Seitenscrollen.
const pageScrollGraceMs = 400
// Eine begonnene Rad-Zoomgeste läuft auch an den Zoomgrenzen weiter, statt die Seite zu scrollen.
const wheelGestureGraceMs = 250
const wheelRedrawDelayMs = 160
// Gemeinsame Kartenhöhe: der Weltausschnitt bestimmt das Seitenverhältnis beider Karten.
const worldViewBox = parseMapViewBox(mapViewBoxes.world)
const stageSize = `${(1 + 2 * mapStageOverscan) * 100}%`
const stageOffset = `${-mapStageOverscan * 100}%`

function getMapTransform(view: MapView) {
  return `translate(${view.offset.x}px, ${view.offset.y}px) scale(${view.zoom})`
}

function getTerritoryIdFromTarget(target: EventTarget | null) {
  if (!(target instanceof SVGElement)) {
    return null
  }

  return target.closest<SVGElement>('[data-territory-id]')?.dataset
    .territoryId ?? null
}

function getPointerPair(pointers: Map<number, MapPoint>) {
  const [first, second] = [...pointers.values()]

  return {
    distance: Math.hypot(second.x - first.x, second.y - first.y),
    midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 },
  }
}

export function TerritoryMapCanvas({
  claims,
  events,
  isDisabled,
  mapId,
  onMapChange,
  onSelect,
  players,
  selectedTerritoryId,
  territories,
}: {
  claims: Record<string, TerritoryClaim>
  events: TerritoryVisitEvent[]
  isDisabled: boolean
  mapId: TerritoryMapId
  onMapChange: (mapId: TerritoryMapId) => void
  onSelect: (territoryId: string) => void
  players: TerritoryPlayer[]
  selectedTerritoryId: string | null
  territories: Territory[]
}) {
  const { locale, t } = useI18n()
  const isMapLoading = territories.length === 0
  const contentViewBox = useMemo(() => parseMapViewBox(mapViewBoxes[mapId]), [mapId])
  // Gebietsname und erster Besuch je Person für den Tooltip der Karte.
  const territoryNames = useMemo(
    () => new Map(territories.map((territory) => [territory.id, territory.name])),
    [territories],
  )
  const firstVisits = useMemo(() => {
    const visits = new Map<string, Map<string, string>>()
    events.forEach((event) => {
      if (event.mapId !== mapId) return
      const byPlayer = visits.get(event.territoryId) ?? new Map<string, string>()
      const known = byPlayer.get(event.playerId)
      if (!known || event.createdAtClientIso < known) {
        byPlayer.set(event.playerId, event.createdAtClientIso)
      }
      visits.set(event.territoryId, byPlayer)
    })
    return visits
  }, [events, mapId])
  const [tip, setTip] = useState<{ territoryId: string; x: number; y: number } | null>(null)
  const [view, setView] = useState<MapView>(defaultMapView)
  // Gezeichnete Ansicht auf dem SVG-Layer und Live-Ansicht der laufenden Geste.
  const drawnViewRef = useRef<MapView>(view)
  const liveViewRef = useRef<MapView>(view)
  const gestureRef = useRef<MapGesture | null>(null)
  const pointersRef = useRef(new Map<number, MapPoint>())
  const multiPointerActiveRef = useRef(false)
  const gestureRafRef = useRef<number | null>(null)
  const wheelTimerRef = useRef<number | null>(null)
  const lastPageScrollRef = useRef(Number.NEGATIVE_INFINITY)
  const lastWheelZoomRef = useRef(Number.NEGATIVE_INFINITY)
  const safariGestureViewRef = useRef<MapView | null>(null)
  const mapLayerRef = useRef<SVGGElement | null>(null)
  const mapViewportRef = useRef<HTMLDivElement | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tapCandidateRef = useRef<{
    pointerId: number
    territoryId: string | null
    x: number
    y: number
  } | null>(null)

  const measureMap = () => {
    const viewport = mapViewportRef.current

    if (!viewport) {
      return null
    }

    const rect = viewport.getBoundingClientRect()
    const frame = getMapFrame(rect.width, rect.height, contentViewBox)

    return {
      frame,
      toPoint: (clientX: number, clientY: number) =>
        toMapPoint(frame, clientX - rect.left, clientY - rect.top),
    }
  }

  // Zeichnet die Vektoren scharf neu: einmal je Gestenende statt in jedem Frame.
  const drawView = (nextView: MapView, shouldCommit = true) => {
    liveViewRef.current = nextView
    drawnViewRef.current = nextView
    if (mapLayerRef.current) {
      mapLayerRef.current.style.transform = getMapTransform(nextView)
    }
    if (svgRef.current) {
      svgRef.current.style.transform = ''
    }

    if (shouldCommit) {
      setView(nextView)
    }
  }

  // Während einer Geste verschiebt und skaliert nur der Compositor die bereits gerasterte Bühne.
  const showLiveView = (nextView: MapView) => {
    const svg = svgRef.current
    const measured = measureMap()

    if (!svg || !measured) {
      drawView(nextView, false)
      return
    }

    liveViewRef.current = nextView
    const transform = getStageTransform(drawnViewRef.current, nextView, measured.frame)

    if (shouldRedrawStage(transform, measured.frame)) {
      drawView(nextView, false)
      return
    }

    svg.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`
  }

  const setMapDragging = (isDragging: boolean) => {
    const viewport = mapViewportRef.current

    if (!viewport) {
      return
    }

    viewport.dataset.mapDragging = String(isDragging)
  }

  const updateGesture = () => {
    gestureRafRef.current = null

    const gesture = gestureRef.current
    const measured = measureMap()

    if (!gesture || !measured) {
      return
    }

    if (gesture.kind === 'pinch') {
      if (pointersRef.current.size < 2) {
        return
      }

      const { distance, midpoint } = getPointerPair(pointersRef.current)
      showLiveView(
        zoomMapView(
          gesture.startView,
          measured.toPoint(gesture.startMidpoint.x, gesture.startMidpoint.y),
          (gesture.startView.zoom * distance) / gesture.startDistance,
          measured.toPoint(midpoint.x, midpoint.y),
        ),
      )
      return
    }

    const pointer = pointersRef.current.get(gesture.pointerId)

    if (!pointer) {
      return
    }

    const deltaX = pointer.x - gesture.start.x
    const deltaY = pointer.y - gesture.start.y

    if (Math.hypot(deltaX, deltaY) >= tapMoveThreshold) {
      tapCandidateRef.current = null
    }

    // In der Übersicht passt die ganze Karte in den Ausschnitt; dort wird nicht verschoben.
    if (gesture.startView.zoom > minMapZoom) {
      showLiveView(panMapView(gesture.startView, measured.frame, deltaX, deltaY))
    }
  }

  const scheduleGestureUpdate = () => {
    if (gestureRafRef.current === null) {
      gestureRafRef.current = window.requestAnimationFrame(updateGesture)
    }
  }

  const flushGestureUpdate = () => {
    if (gestureRafRef.current !== null) {
      window.cancelAnimationFrame(gestureRafRef.current)
      updateGesture()
    }
  }

  // Beginnt eine Geste ab der Live-Ansicht, auch wenn ein Finger hinzukommt oder wegfällt.
  const startGesture = () => {
    const pointers = pointersRef.current

    if (pointers.size >= 2) {
      const { distance, midpoint } = getPointerPair(pointers)
      gestureRef.current = {
        kind: 'pinch',
        startDistance: Math.max(distance, 1),
        startMidpoint: midpoint,
        startView: liveViewRef.current,
      }
      return
    }

    const [pointerId, start] = [...pointers][0]
    gestureRef.current = { kind: 'pan', pointerId, start, startView: liveViewRef.current }
  }

  const endGesture = () => {
    gestureRef.current = null
    multiPointerActiveRef.current = false
    tapCandidateRef.current = null
    setMapDragging(false)
    drawView(liveViewRef.current)
  }

  const releasePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    flushGestureUpdate()
    pointersRef.current.delete(event.pointerId)
  }

  const continueOrEndGesture = () => {
    if (pointersRef.current.size === 0) {
      endGesture()
    } else {
      startGesture()
    }
  }

  const cancelPendingWheelRedraw = () => {
    if (wheelTimerRef.current !== null) {
      window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = null
    }
  }

  const resetView = () => {
    cancelPendingWheelRedraw()
    drawView(defaultMapView)
  }

  const zoomByLevel = (direction: 1 | -1) => {
    const measured = measureMap()
    const nextZoom = getNextZoomLevel(liveViewRef.current.zoom, direction)

    cancelPendingWheelRedraw()

    if (!measured) {
      drawView({ ...liveViewRef.current, zoom: nextZoom })
      return
    }

    const center = toMapPoint(
      measured.frame,
      measured.frame.width / 2,
      measured.frame.height / 2,
    )
    drawView(zoomMapView(liveViewRef.current, center, nextZoom))
  }

  const zoomAtClientPoint = (clientX: number, clientY: number, nextZoom: number, from = liveViewRef.current) => {
    const measured = measureMap()

    if (measured) {
      const anchor = measured.toPoint(clientX, clientY)
      showLiveView(zoomMapView(from, anchor, nextZoom))
    }
  }

  const handleWheel = useEffectEvent((event: WheelEvent) => {
    if (isMapLoading || pointersRef.current.size > 0) {
      return
    }

    const zoom = liveViewRef.current.zoom
    const isPinch = event.ctrlKey
    const continuesZoom = event.timeStamp - lastWheelZoomRef.current < wheelGestureGraceMs

    if (!isPinch && !continuesZoom) {
      const isScrollingPage = event.timeStamp - lastPageScrollRef.current < pageScrollGraceMs
      const isAtLimit = event.deltaY > 0 ? zoom <= minMapZoom : zoom >= maxMapZoom

      if (isScrollingPage || isAtLimit || event.deltaY === 0) {
        return
      }
    }

    event.preventDefault()
    lastWheelZoomRef.current = event.timeStamp
    setTip(null)
    zoomAtClientPoint(
      event.clientX,
      event.clientY,
      zoom * getWheelZoomFactor(event.deltaY, event.deltaMode, isPinch, window.innerHeight),
    )
    cancelPendingWheelRedraw()
    wheelTimerRef.current = window.setTimeout(() => {
      wheelTimerRef.current = null
      drawView(liveViewRef.current)
    }, wheelRedrawDelayMs)
  })

  const handleSafariGesture = useEffectEvent((event: Event) => {
    // Auf iOS laufen dieselben Finger bereits als Pointer-Pinch.
    if (pointersRef.current.size > 0) {
      return
    }

    const gesture = event as SafariGestureEvent
    event.preventDefault()

    if (event.type === 'gesturestart') {
      setTip(null)
      safariGestureViewRef.current = liveViewRef.current
      return
    }

    const startView = safariGestureViewRef.current

    if (!startView) {
      return
    }

    if (event.type === 'gestureend') {
      safariGestureViewRef.current = null
      drawView(liveViewRef.current)
      return
    }

    zoomAtClientPoint(gesture.clientX, gesture.clientY, startView.zoom * gesture.scale, startView)
  })

  useEffect(() => {
    const viewport = mapViewportRef.current

    if (!viewport) {
      return
    }

    const onWheel = (event: WheelEvent) => handleWheel(event)
    const onSafariGesture = (event: Event) => handleSafariGesture(event)
    const onScroll = (event: Event) => {
      lastPageScrollRef.current = event.timeStamp
    }
    const safariGestureEvents = ['gesturestart', 'gesturechange', 'gestureend']

    viewport.addEventListener('wheel', onWheel, { passive: false })
    safariGestureEvents.forEach((type) => viewport.addEventListener(type, onSafariGesture))
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })

    return () => {
      viewport.removeEventListener('wheel', onWheel)
      safariGestureEvents.forEach((type) => viewport.removeEventListener(type, onSafariGesture))
      document.removeEventListener('scroll', onScroll, { capture: true })
      if (gestureRafRef.current !== null) {
        window.cancelAnimationFrame(gestureRafRef.current)
      }
      if (wheelTimerRef.current !== null) {
        window.clearTimeout(wheelTimerRef.current)
      }
    }
  }, [])

  const handleMapChange = (nextMap: TerritoryMapId) => {
    setTip(null)
    resetView()
    onMapChange(nextMap)
  }

  // Ein gemeinsamer Tooltip für alle Gebiete: an der Maus beim Betreten, nie während des Ziehens.
  const showTerritoryTip = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'touch' || pointersRef.current.size > 0) return
    const territoryId = getTerritoryIdFromTarget(event.target)
    if (!territoryId) {
      setTip(null)
      return
    }
    if (territoryId === tip?.territoryId) return
    const bounds = event.currentTarget.getBoundingClientRect()
    setTip({ territoryId, x: event.clientX - bounds.left, y: event.clientY - bounds.top })
  }

  const showFocusedTerritoryTip = (event: FocusEvent<HTMLDivElement>) => {
    const territoryId = getTerritoryIdFromTarget(event.target)
    if (!territoryId || !(event.target instanceof Element)) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const shape = event.target.getBoundingClientRect()
    setTip({
      territoryId,
      x: shape.left + shape.width / 2 - bounds.left,
      y: shape.top + shape.height / 2 - bounds.top,
    })
  }

  const tipOwners = tip ? getTerritoryClaimOwners(claims[tip.territoryId]) : []
  const tipVisits = tip ? firstVisits.get(tip.territoryId) : undefined
  const formatVisitDate = (value: string | undefined) =>
    value ? dateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value)) : ''
  const isZoomedIn = view.zoom > minMapZoom

  return (
    <Card className="overflow-hidden bg-secondary">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <SegmentedControl
            aria-label={t('territory.map')}
            className="h-10 min-w-0 flex-1 sm:h-9 sm:[&>.selection-item]:min-h-0"
            value={mapId}
            onValueChange={(value) => handleMapChange(value as TerritoryMapId)}
            options={[
              { value: 'world', label: t('territory.world') },
              { value: 'germany', label: t('territory.map.germany') },
            ]}
          />

          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 bg-background/75 sm:size-9"
            aria-label={t('territory.zoomOut')}
            title={t('territory.zoomOut')}
            disabled={!isZoomedIn}
            onClick={() => zoomByLevel(-1)}
          >
            <Minus className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 shrink-0 bg-background/75 sm:size-9"
            aria-label={t('territory.zoomIn')}
            title={t('territory.zoomIn')}
            disabled={view.zoom >= maxMapZoom}
            onClick={() => zoomByLevel(1)}
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
            'relative max-h-[70svh] min-h-[21rem] w-full overflow-hidden bg-secondary sm:min-h-[22.5rem]',
            isZoomedIn ? 'cursor-grab active:cursor-grabbing' : '',
          ].join(' ')}
          // Übersicht: ein Finger scrollt die Seite, zwei Finger zoomen. Gezoomt: ein Finger verschiebt.
          style={{
            aspectRatio: `${worldViewBox.width} / ${worldViewBox.height}`,
            touchAction: isZoomedIn ? 'none' : 'pan-x pan-y',
          }}
          onBlur={() => setTip(null)}
          onFocus={showFocusedTerritoryTip}
          onPointerLeave={() => setTip(null)}
          onPointerOver={showTerritoryTip}
          onPointerDown={(event) => {
            setTip(null)
            if (
              (event.pointerType === 'mouse' && event.button !== 0) ||
              pointersRef.current.size >= 2
            ) {
              return
            }

            flushGestureUpdate()
            cancelPendingWheelRedraw()
            event.currentTarget.setPointerCapture(event.pointerId)
            setMapDragging(true)
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

            if (pointersRef.current.size > 1) {
              multiPointerActiveRef.current = true
              tapCandidateRef.current = null
            } else {
              tapCandidateRef.current = {
                pointerId: event.pointerId,
                territoryId: getTerritoryIdFromTarget(event.target),
                x: event.clientX,
                y: event.clientY,
              }
            }

            startGesture()
          }}
          onPointerMove={(event) => {
            if (!pointersRef.current.has(event.pointerId)) {
              return
            }

            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
            scheduleGestureUpdate()
          }}
          onPointerUp={(event) => {
            const tapCandidate = tapCandidateRef.current

            releasePointer(event)

            if (
              tapCandidate &&
              !isDisabled &&
              tapCandidate.pointerId === event.pointerId &&
              tapCandidate.territoryId &&
              !multiPointerActiveRef.current &&
              Math.hypot(
                event.clientX - tapCandidate.x,
                event.clientY - tapCandidate.y,
              ) < tapMoveThreshold
            ) {
              onSelect(tapCandidate.territoryId)
            }

            continueOrEndGesture()
          }}
          onPointerCancel={(event) => {
            releasePointer(event)
            tapCandidateRef.current = null
            continueOrEndGesture()
          }}
        >
          <svg
            ref={svgRef}
            viewBox={getOverscannedViewBox(contentViewBox)}
            className="absolute block"
            style={{
              height: stageSize,
              left: stageOffset,
              top: stageOffset,
              transformOrigin: '0 0',
              width: stageSize,
              willChange: 'transform',
            }}
            aria-label={t(
              mapId === 'world'
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
            <g
              ref={mapLayerRef}
              className="territory-map-layer"
              style={{
                transform: getMapTransform(view),
                transformOrigin: '0 0',
              }}
            >
              {isMapLoading && (
                <text
                  x={contentViewBox.x + contentViewBox.width / 2}
                  y={contentViewBox.y + contentViewBox.height / 2}
                  dominantBaseline="middle"
                  textAnchor="middle"
                  fill="var(--muted-foreground)"
                  fontSize="14"
                >
                  {t('territory.loadingMap')}
                </text>
              )}
              {territories.map((territory) => {
                const claim = claims[territory.id]

                return (
                  <TerritoryShape
                    key={territory.id}
                    claim={claim}
                    isDisabled={isDisabled}
                    isSelected={selectedTerritoryId === territory.id}
                    onSelect={onSelect}
                    players={players}
                    territory={territory}
                    // Nur gestreifte Gebiete mehrerer Touristen messen den Zoom, alle anderen bleiben memoisiert.
                    zoom={(claim?.owners?.length ?? 0) > 1 ? view.zoom : undefined}
                  />
                )
              })}
            </g>
          </svg>
          {tip && (
            <Tooltip
              open
              onOpenChange={(open) => !open && setTip(null)}
              swatch={tipOwners.map((owner) =>
                getTerritoryClaimColor(owner.playerId, owner.playerColor, players),
              )}
              title={territoryNames.get(tip.territoryId) ?? tip.territoryId}
              description={
                tipOwners.length === 0
                  ? t('territory.unvisited')
                  : tipOwners.map((owner) => (
                      <span key={owner.playerId} className="block">
                        {`${owner.playerName} · ${formatVisitDate(
                          tipVisits?.get(owner.playerId) ?? claims[tip.territoryId]?.claimedAtClientIso,
                        )}`}
                      </span>
                    ))
              }
            >
              <span
                key={`${tip.territoryId}-${tip.x}-${tip.y}`}
                aria-hidden="true"
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2"
                style={{ left: tip.x, top: tip.y }}
              />
            </Tooltip>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
