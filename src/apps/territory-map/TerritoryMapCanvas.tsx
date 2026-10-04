import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { TerritoryShape } from '@/apps/territory-map/components'
import { mapViewBoxes } from '@/apps/territory-map/data/territories'
import { mapZoomLevels, tapMoveThreshold } from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryClaim,
  TerritoryMapId,
  TerritoryPlayer,
} from '@/apps/territory-map/types'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'

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

type PendingDragMove = {
  clientX: number
  clientY: number
  pointerId: number
}

const defaultZoomLevelIndex = 0
const defaultMapView: MapView = {
  offset: { x: 0, y: 0 },
  zoom: mapZoomLevels[defaultZoomLevelIndex],
}

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

export function TerritoryMapCanvas({
  claims,
  isDisabled,
  mapId,
  onMapChange,
  onSelect,
  players,
  selectedTerritoryId,
  territories,
}: {
  claims: Record<string, TerritoryClaim>
  isDisabled: boolean
  mapId: TerritoryMapId
  onMapChange: (mapId: TerritoryMapId) => void
  onSelect: (territoryId: string) => void
  players: TerritoryPlayer[]
  selectedTerritoryId: string | null
  territories: Territory[]
}) {
  const { t } = useI18n()
  const isMapLoading = territories.length === 0
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
  const svgRef = useRef<SVGSVGElement | null>(null)
  const tapCandidateRef = useRef<{
    pointerId: number
    territoryId: string | null
    x: number
    y: number
  } | null>(null)
  const applyView = (nextView: MapView, shouldCommit = false) => {
    liveViewRef.current = nextView
    if (mapLayerRef.current) {
      mapLayerRef.current.style.transform = getMapTransform(nextView)
    }

    if (shouldCommit) {
      setView(nextView)
    }
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
    setView(liveViewRef.current)
  }

  useEffect(
    () => () => {
      if (panRafRef.current !== null) {
        window.cancelAnimationFrame(panRafRef.current)
      }
    },
    [],
  )

  const handleMapChange = (nextMap: TerritoryMapId) => {
    resetView()
    onMapChange(nextMap)
  }

  return (
    <Card className="overflow-hidden bg-secondary">
      <CardHeader className="p-3 sm:p-4">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <SegmentedControl
            aria-label={t('territory.map')}
            className="h-10 min-w-0 flex-1 sm:h-9"
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
            mapId === 'germany'
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
            viewBox={mapViewBoxes[mapId]}
            className="block size-full"
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
            <rect width="100%" height="100%" fill="var(--secondary)" />
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
                  claim={claims[territory.id]}
                  isDisabled={isDisabled}
                  isSelected={selectedTerritoryId === territory.id}
                  onSelect={onSelect}
                  players={players}
                  territory={territory}
                  zoom={view.zoom}
                />
              ))}
            </g>
          </svg>
        </div>
      </CardContent>
    </Card>
  )
}
