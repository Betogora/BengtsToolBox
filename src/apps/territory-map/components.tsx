import {
  CirclePlus,
  Trash2,
} from 'lucide-react'
import { memo, useRef, useState } from 'react'

import { territoryOptionsByMap } from '@/apps/territory-map/data/territories'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryClaim,
  TerritoryDataset,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'
import type { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { IftaSelectTrigger } from '@/components/ui/ifta-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function toDateInputValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function fromDateInputValue(value: string, fallback: string) {
  if (!value) {
    return fallback
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function getEventDateKey(event: TerritoryVisitEvent) {
  return toDateInputValue(event.createdAtClientIso)
}

function getEventTable(events: TerritoryVisitEvent[]) {
  return [...events].sort(
    (left, right) =>
      getEventDateKey(right).localeCompare(getEventDateKey(left)) ||
      right.position - left.position,
  )
}

function getClaimColor(
  claimPlayerId: string,
  claimColor: string,
  players: TerritoryPlayer[],
) {
  return players.find((player) => player.id === claimPlayerId)?.color ?? claimColor
}

export const TerritoryShape = memo(function TerritoryShape({
  claim,
  isSelected,
  onSelect,
  players,
  territory,
}: {
  claim?: TerritoryClaim
  isSelected: boolean
  onSelect: (territoryId: string) => void
  players: TerritoryPlayer[]
  territory: Territory
}) {
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
  const patternId = `territory-shared-${territory.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const ownerColor =
    owners.length > 1
      ? `url(#${patternId})`
      : owners.length === 1
        ? getClaimColor(owners[0].playerId, owners[0].playerColor, players)
        : 'url(#territory-unclaimed)'
  const ownerLabel =
    owners.length > 0
      ? owners.map((owner) => owner.playerName).join(', ')
      : 'Unbereist'

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
              fill={getClaimColor(owner.playerId, owner.playerColor, players)}
            />
          ))}
        </pattern>
      )}
      <path
        d={territory.path}
        role="button"
        tabIndex={0}
        aria-label={`${territory.name}, ${ownerLabel}`}
        className="territory-shape cursor-pointer transition-[opacity,stroke-width] focus:outline-none focus-visible:stroke-ring sm:hover:brightness-105"
        data-territory-id={territory.id}
        fill={ownerColor}
        opacity={claim ? 0.94 : 1}
        stroke={isSelected ? 'var(--foreground)' : 'var(--background)'}
        strokeWidth={isSelected ? 2.2 : 0.75}
        vectorEffect="non-scaling-stroke"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(territory.id)
          }
        }}
      >
        <title>{`${territory.name}: ${ownerLabel}`}</title>
      </path>
    </>
  )
})

export function ClaimDialog({
  claim,
  onClaim,
  onOpenChange,
  players,
  territory,
}: {
  claim?: TerritoryClaim
  onClaim: (playerId: string) => Promise<void>
  onOpenChange: (open: boolean) => void
  players: TerritoryPlayer[]
  territory: Territory | null
}) {
  const [selectedPlayerId, setSelectedPlayerId] = useState(
    claim?.playerId ?? players[0]?.id ?? unclaimedValue,
  )
  const [isPlayerSelectOpen, setIsPlayerSelectOpen] = useState(false)
  const ignoreImmediateSelectReopenRef = useRef(false)

  if (!territory) {
    return null
  }

  const ownerNames = claim?.owners?.length
    ? claim.owners.map((owner) => owner.playerName).join(', ')
    : claim?.playerName

  return (
    <Dialog open={Boolean(territory)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{territory.name} Sushi-bereisen?</DialogTitle>
          <DialogDescription>
            {claim
              ? `Aktuell bereist von ${ownerNames}.`
              : 'Dieses Territorium ist noch frei.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 min-[34rem]:flex-row min-[34rem]:items-end">
          <div className="min-w-0 flex-1">
            <Select
              open={isPlayerSelectOpen}
              value={selectedPlayerId}
              onOpenChange={(open) => {
                if (open && ignoreImmediateSelectReopenRef.current) {
                  return
                }

                setIsPlayerSelectOpen(open)
              }}
              onValueChange={(value) => {
                setSelectedPlayerId(value)
                setIsPlayerSelectOpen(false)
                ignoreImmediateSelectReopenRef.current = true
                window.setTimeout(() => {
                  ignoreImmediateSelectReopenRef.current = false
                }, 250)
              }}
            >
              <IftaSelectTrigger id="claim-player" className="w-full" label="Sushi-Tourist">
                <SelectValue placeholder="Sushi-Tourist wählen" />
              </IftaSelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
                <SelectItem value={unclaimedValue}>Unbereist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-9 w-full min-[34rem]:h-11 min-[34rem]:w-auto"
            size="ifta"
            onClick={() => onClaim(selectedPlayerId)}
          >
            Nigiri gegessen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AddEaterCard({
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

export function TerritoryEventTable({
  dataset,
  onDeleteEvent,
  onUpdateEvent,
  players,
}: {
  dataset: TerritoryDataset
  onDeleteEvent: (eventId: string) => void | Promise<void>
  onUpdateEvent: ReturnType<typeof useTerritoryMap>['updateEvent']
  players: TerritoryPlayer[]
}) {
  const events = getEventTable(dataset.events)

  if (events.length === 0) {
    return (
      <EmptyState>
        Noch keine Bereisungen im aktuellen Datensatz.
      </EmptyState>
    )
  }

  const renderDateInput = (event: TerritoryVisitEvent) => (
    <Input
      type="date"
      className="h-9"
      value={toDateInputValue(event.createdAtClientIso)}
      onChange={(inputEvent) =>
        onUpdateEvent(event.id, {
          createdAtClientIso: fromDateInputValue(
            inputEvent.currentTarget.value,
            event.createdAtClientIso,
          ),
        })
      }
    />
  )
  const renderPlayerSelect = (event: TerritoryVisitEvent) => (
    <Select
      value={event.playerId}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          playerId: value,
        })
      }
    >
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {players.map((player) => (
          <SelectItem key={player.id} value={player.id}>
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: player.color }}
              />
              {player.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const renderTerritorySelect = (event: TerritoryVisitEvent) => (
    <Select
      value={event.territoryId}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          territoryId: value,
        })
      }
    >
      <SelectTrigger className="w-64">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {territoryOptionsByMap[event.mapId].map((territory) => (
          <SelectItem key={territory.id} value={territory.id}>
            {territory.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const renderDeleteButton = (event: TerritoryVisitEvent) => (
    <ConfirmButton
      title="Bereisung löschen?"
      description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
      onConfirm={() => onDeleteEvent(event.id)}
      trigger={
        <Button
          variant="delete"
          size="icon"
          aria-label="Bereisung löschen"
        >
          <Trash2 className="size-4" />
        </Button>
      }
    />
  )

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {events.map((event) => {
          const player = players.find((candidate) => candidate.id === event.playerId)
          const territory = territoryOptionsByMap[event.mapId].find(
            (candidate) => candidate.id === event.territoryId,
          )

          return (
            <div key={event.id} className="type-ui rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="type-label flex min-w-0 items-center gap-2">
                    {player && (
                      <span
                        className="size-3 shrink-0 rounded-full"
                        style={{ backgroundColor: player.color }}
                      />
                    )}
                    <span className="min-w-0 break-words">
                      {player?.name ?? 'Sushi-Tourist'}
                    </span>
                  </div>
                  <div className="type-caption mt-1 text-muted-foreground">
                    {territory?.name ?? 'Territorium'}
                  </div>
                </div>
                {renderDeleteButton(event)}
              </div>
              <div className="mt-3 grid gap-3">
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    Datum
                  </div>
                  {renderDateInput(event)}
                </div>
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    Spieler
                  </div>
                  {renderPlayerSelect(event)}
                </div>
                <div>
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    Territorium
                  </div>
                  {renderTerritorySelect(event)}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Table className="min-w-[780px]" containerClassName="hidden md:block">
        <TableHeader>
            <TableHead>Datum</TableHead>
            <TableHead>Spieler</TableHead>
            <TableHead>Territorium</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <Input
                  type="date"
                  className="h-9"
                  value={toDateInputValue(event.createdAtClientIso)}
                  onChange={(inputEvent) =>
                    onUpdateEvent(event.id, {
                      createdAtClientIso: fromDateInputValue(
                        inputEvent.currentTarget.value,
                        event.createdAtClientIso,
                      ),
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <Select
                  value={event.playerId}
                  onValueChange={(value) =>
                    onUpdateEvent(event.id, {
                      playerId: value,
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: player.color }}
                          />
                          {player.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={event.territoryId}
                  onValueChange={(value) =>
                    onUpdateEvent(event.id, {
                      territoryId: value,
                    })
                  }
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {territoryOptionsByMap[event.mapId].map((territory) => (
                      <SelectItem key={territory.id} value={territory.id}>
                        {territory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <ConfirmButton
                  title="Bereisung löschen?"
                  description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
                  onConfirm={() => onDeleteEvent(event.id)}
                  trigger={
                    <Button
                      variant="delete"
                      size="icon"
                      aria-label="Bereisung löschen"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
