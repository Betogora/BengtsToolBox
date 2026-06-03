import {
  CirclePlus,
  MousePointer2,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
  UtensilsCrossed,
  Users,
} from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'

import { mapViewBoxes, territoriesByMap } from '@/apps/territory-map/data/territories'
import { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import type {
  Territory,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const mapLabels: Record<TerritoryMapId, string> = {
  world: 'Weltkarte',
  germany: 'Deutschland',
}

const maxZoom = 8
const minZoom = 0.7
const unclaimedValue = '__unclaimed'

function clampZoom(value: number) {
  return Math.min(maxZoom, Math.max(minZoom, value))
}

function getClaimColor(
  claimPlayerId: string,
  claimColor: string,
  players: TerritoryPlayer[],
) {
  return players.find((player) => player.id === claimPlayerId)?.color ?? claimColor
}

function TerritoryShape({
  claim,
  isSelected,
  onSelect,
  players,
  territory,
}: {
  claim?: {
    playerId: string
    playerName: string
    playerColor: string
  }
  isSelected: boolean
  onSelect: () => void
  players: TerritoryPlayer[]
  territory: Territory
}) {
  const ownerColor = claim
    ? getClaimColor(claim.playerId, claim.playerColor, players)
    : 'url(#territory-unclaimed)'
  const ownerLabel = claim ? claim.playerName : 'ungeclaimed'

  return (
    <path
      d={territory.path}
      role="button"
      tabIndex={0}
      aria-label={`${territory.name}, ${ownerLabel}`}
      className="cursor-pointer transition-[filter,opacity,stroke-width] hover:brightness-105 focus:outline-none focus-visible:stroke-ring"
      fill={ownerColor}
      opacity={claim ? 0.94 : 1}
      stroke={isSelected ? '#062433' : '#f6fbfb'}
      strokeWidth={isSelected ? 2.2 : 0.75}
      vectorEffect="non-scaling-stroke"
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <title>{`${territory.name}: ${ownerLabel}`}</title>
    </path>
  )
}

function InlineTextEdit({
  ariaLabel,
  fallback,
  onSave,
  value,
}: {
  ariaLabel: string
  fallback: string
  onSave: (value: string) => void | Promise<void>
  value: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const displayValue = value.trim() || fallback

  if (isEditing) {
    return (
      <Input
        aria-label={ariaLabel}
        autoFocus
        className="h-9 font-medium"
        defaultValue={displayValue}
        onBlur={async (event) => {
          await onSave(event.currentTarget.value)
          setIsEditing(false)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }

          if (event.key === 'Escape') {
            setIsEditing(false)
          }
        }}
      />
    )
  }

  return (
    <div className="group flex min-w-0 items-center gap-1">
      <span className="min-w-0 truncate rounded-sm px-1 py-1 text-sm font-medium transition-colors group-hover:bg-accent/35">
        {displayValue}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label={`${ariaLabel} bearbeiten`}
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
}

function ClaimDialog({
  claim,
  onClaim,
  onOpenChange,
  players,
  territory,
}: {
  claim?: {
    playerId: string
    playerName: string
  }
  onClaim: (playerId: string) => Promise<void>
  onOpenChange: (open: boolean) => void
  players: TerritoryPlayer[]
  territory: Territory | null
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    claim?.playerId ?? players[0]?.id ?? unclaimedValue,
  )

  if (!territory) {
    return null
  }

  return (
    <Dialog open={Boolean(territory)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{territory.name} Sushi-bereisen</DialogTitle>
          <DialogDescription>
            {claim
              ? `Aktuell bereist von ${claim.playerName}.`
              : 'Dieses Territorium ist noch frei.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="claim-player">Sushi-Tourist</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger id="claim-player">
                <SelectValue placeholder="Sushi-Tourist wählen" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
                <SelectItem value={unclaimedValue}>Unclaimed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="sm:mb-0" onClick={() => onClaim(selectedPlayerId)}>
            Nigiri gegessen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function AddEaterCard({
  onAdd,
}: {
  onAdd: () => Promise<void>
}) {
  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <Button
        className="h-9 w-full"
        variant="outline"
        onClick={() => void onAdd()}
      >
        <CirclePlus className="size-4" />
        Sushi-Tourist hinzufügen
      </Button>
    </div>
  )
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
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{
    pointerId: number
    x: number
    y: number
    offsetX: number
    offsetY: number
  } | null>(null)
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>())
  const dragDistanceRef = useRef(0)
  const lastPinchDistanceRef = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
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

  const transform = `translate(${offset.x} ${offset.y}) scale(${zoom})`

  const resetView = () => {
    setZoom(1)
    setOffset({ x: 0, y: 0 })
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

  const applyZoomAt = (clientX: number, clientY: number, nextZoom: number) => {
    const nextClampedZoom = clampZoom(nextZoom)
    const point = getSvgPoint(clientX, clientY)

    if (!point) {
      setZoom(nextClampedZoom)
      return
    }

    const mapX = (point.x - offset.x) / zoom
    const mapY = (point.y - offset.y) / zoom

    setZoom(nextClampedZoom)
    setOffset({
      x: point.x - mapX * nextClampedZoom,
      y: point.y - mapY * nextClampedZoom,
    })
  }

  const stopMapGesture = (pointerId?: number) => {
    if (typeof pointerId === 'number') {
      activePointersRef.current.delete(pointerId)
    } else {
      activePointersRef.current.clear()
    }

    lastPinchDistanceRef.current = null
    setDragStart(null)
  }

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

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="icon"
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
              className="h-[56svh] min-h-[320px] touch-none overflow-hidden bg-[#dceff0] cursor-grab active:cursor-grabbing sm:h-[62svh] sm:min-h-[420px]"
              onWheel={(event) => {
                event.preventDefault()
                applyZoomAt(
                  event.clientX,
                  event.clientY,
                  zoom + (event.deltaY < 0 ? 0.28 : -0.28),
                )
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return
                }

                activePointersRef.current.set(event.pointerId, {
                  x: event.clientX,
                  y: event.clientY,
                })
                dragDistanceRef.current = 0
                setDragStart({
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  offsetX: offset.x,
                  offsetY: offset.y,
                })

                if (activePointersRef.current.size === 2) {
                  const pointers = [...activePointersRef.current.values()]
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

                  if (previousDistance && nextDistance > 0) {
                    applyZoomAt(
                      (pointers[0].x + pointers[1].x) / 2,
                      (pointers[0].y + pointers[1].y) / 2,
                      zoom * (nextDistance / previousDistance),
                    )
                  }

                  lastPinchDistanceRef.current = nextDistance
                  return
                }

                if (!dragStart || dragStart.pointerId !== event.pointerId) {
                  return
                }

                const deltaX = event.clientX - dragStart.x
                const deltaY = event.clientY - dragStart.y
                dragDistanceRef.current = Math.hypot(deltaX, deltaY)
                setOffset({
                  x: dragStart.offsetX + (deltaX / zoom) * 1.25,
                  y: dragStart.offsetY + (deltaY / zoom) * 1.25,
                })
              }}
              onPointerUp={(event) => {
                stopMapGesture(event.pointerId)
              }}
              onPointerCancel={(event) => {
                stopMapGesture(event.pointerId)
              }}
              onPointerLeave={() => stopMapGesture()}
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
                    <rect width="10" height="10" fill="#d8e1e2" />
                    <rect width="3" height="10" fill="#aebec1" opacity="0.75" />
                  </pattern>
                  <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow
                      dx="0"
                      dy="10"
                      stdDeviation="14"
                      floodColor="#062433"
                      floodOpacity="0.16"
                    />
                  </filter>
                </defs>
                <rect width="100%" height="100%" fill="#dceff0" />
                <g transform={transform} filter="url(#map-shadow)">
                  {territories.map((territory) => (
                    <TerritoryShape
                      key={territory.id}
                      claim={currentClaims[territory.id]}
                      isSelected={selectedTerritoryId === territory.id}
                      onSelect={() => {
                        if (dragDistanceRef.current < 6) {
                          setSelectedTerritoryId(territory.id)
                        }
                      }}
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
                      aria-label={`${player.name} Farbe ändern`}
                      type="color"
                      value={player.color}
                      onChange={(event) =>
                        void updatePlayerColor(player.id, event.target.value)
                      }
                      className="h-9 w-12 p-1"
                    />
                    {player.position > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${player.name} entfernen`}
                        onClick={() => void removePlayer(player.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
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
