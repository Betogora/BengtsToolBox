import {
  Map,
  MousePointer2,
  RotateCcw,
  Undo2,
  Users,
} from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'

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
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

const mapDescriptions: Record<TerritoryMapId, string> = {
  world: 'Laender als freie Territorien',
  germany: 'Bundeslaender als Territorien',
}

const newPlayerValue = '__new-player'

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
      className="cursor-pointer stroke-background stroke-[2] transition-[filter,opacity,stroke-width] hover:brightness-105 focus:outline-none focus-visible:stroke-ring"
      fill={ownerColor}
      opacity={claim ? 0.94 : 1}
      stroke={isSelected ? '#062433' : '#f6fbfb'}
      strokeWidth={isSelected ? 5 : 2}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onPointerDown={(event) => {
        event.stopPropagation()
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

function ClaimDialog({
  claim,
  onClaim,
  onOpenChange,
  players,
  territory,
}: {
  claim?: {
    playerName: string
  }
  onClaim: (playerId: string, name: string, color: string) => Promise<void>
  onOpenChange: (open: boolean) => void
  players: TerritoryPlayer[]
  territory: Territory | null
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    players[0]?.id ?? newPlayerValue,
  )
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerColor, setNewPlayerColor] = useState('#027a9f')
  const isNewPlayer = selectedPlayerId === newPlayerValue

  if (!territory) {
    return null
  }

  return (
    <Dialog open={Boolean(territory)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{territory.name} claimen</DialogTitle>
          <DialogDescription>
            {claim
              ? `Aktuell geclaimed von ${claim.playerName}.`
              : 'Dieses Territorium ist noch frei.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="claim-player">Spieler</Label>
            <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
              <SelectTrigger id="claim-player">
                <SelectValue placeholder="Spieler waehlen" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
                <SelectItem value={newPlayerValue}>Neuen Spieler anlegen</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isNewPlayer && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="new-player-name">Name</Label>
                <Input
                  id="new-player-name"
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="new-player-color">Farbe</Label>
                <Input
                  id="new-player-color"
                  type="color"
                  value={newPlayerColor}
                  onChange={(event) => setNewPlayerColor(event.target.value)}
                  className="h-9 w-20 p-1"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() =>
              onClaim(selectedPlayerId, newPlayerName, newPlayerColor)
            }
          >
            Claim speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    isRealtime,
    players,
    resetCurrentMap,
    setActiveMap,
    state,
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

  const handleMapChange = (nextMap: string) => {
    setSelectedTerritoryId(null)
    resetView()
    void setActiveMap(nextMap as TerritoryMapId)
  }

  const handleClaim = async (playerId: string, name: string, color: string) => {
    if (!selectedTerritory) {
      return
    }

    const newPlayer =
      playerId === newPlayerValue ? await addPlayer(name, color) : null
    const nextPlayerId = newPlayer?.id ?? playerId

    await claimTerritory(
      state.activeMap,
      selectedTerritory.id,
      nextPlayerId,
      newPlayer ?? undefined,
    )
    setSelectedTerritoryId(null)
  }

  const handleResetCurrentMap = () => {
    if (claimedCount === 0) {
      return
    }

    if (window.confirm(`${mapLabels[state.activeMap]} wirklich zuruecksetzen?`)) {
      void resetCurrentMap()
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Map className="size-5" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-normal">
                Territory Claim Map
              </h1>
              <p className="text-sm text-muted-foreground">
                {claimedCount} Claims auf der aktuellen Karte
                {isRealtime ? ' · Live-Sync aktiv' : ' · lokaler Modus'}
              </p>
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
                <CardDescription>{mapDescriptions[state.activeMap]}</CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Ansicht zuruecksetzen"
                  title="Ansicht zuruecksetzen"
                  onClick={resetView}
                >
                  <MousePointer2 className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Letzten Claim rueckgaengig machen"
                  title="Letzten Claim rueckgaengig machen"
                  disabled={!state.lastClaimAction}
                  onClick={() => void undoLastClaim()}
                >
                  <Undo2 className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Aktuelle Karte zuruecksetzen"
                  title="Aktuelle Karte zuruecksetzen"
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
              className="h-[62svh] min-h-[420px] touch-none overflow-hidden bg-[#dceff0]"
              onWheel={(event) => {
                event.preventDefault()
                const nextZoom = Math.min(
                  3.5,
                  Math.max(0.7, zoom + (event.deltaY < 0 ? 0.14 : -0.14)),
                )
                setZoom(nextZoom)
              }}
              onPointerDown={(event) => {
                if (event.button !== 0) {
                  return
                }

                event.currentTarget.setPointerCapture(event.pointerId)
                setDragStart({
                  pointerId: event.pointerId,
                  x: event.clientX,
                  y: event.clientY,
                  offsetX: offset.x,
                  offsetY: offset.y,
                })
              }}
              onPointerMove={(event) => {
                if (!dragStart || dragStart.pointerId !== event.pointerId) {
                  return
                }

                setOffset({
                  x: dragStart.offsetX + (event.clientX - dragStart.x) / zoom,
                  y: dragStart.offsetY + (event.clientY - dragStart.y) / zoom,
                })
              }}
              onPointerUp={() => setDragStart(null)}
              onPointerCancel={() => setDragStart(null)}
            >
              <svg
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
                <CardTitle>Spieler</CardTitle>
                <CardDescription>
                  Farben wirken direkt auf geclaimte Gebiete.
                </CardDescription>
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
                    <Input
                      aria-label={`${player.name} umbenennen`}
                      defaultValue={player.name}
                      onBlur={(event) =>
                        void updatePlayerName(player.id, event.target.value)
                      }
                    />
                    <Input
                      aria-label={`${player.name} Farbe aendern`}
                      type="color"
                      value={player.color}
                      onChange={(event) =>
                        void updatePlayerColor(player.id, event.target.value)
                      }
                      className="h-9 w-12 p-1"
                    />
                  </div>
                </div>
              ))}
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
