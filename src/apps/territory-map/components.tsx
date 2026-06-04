import {
  CirclePlus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { memo, useState, type ReactNode } from 'react'

import { territoriesByMap } from '@/apps/territory-map/data/territories'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryClaim,
  TerritoryDataset,
  TerritoryPlayer,
  TerritoryVisitEvent,
} from '@/apps/territory-map/types'
import type { useTerritoryMap } from '@/apps/territory-map/hooks/useTerritoryMap'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

export function ConfirmButton({
  children,
  description,
  onConfirm,
  title,
  trigger,
}: {
  children?: ReactNode
  description: string
  onConfirm: () => void | Promise<void>
  title: string
  trigger: ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Abbrechen</Button>
          </DialogClose>
          <Button
            variant="destructive"
            onClick={async () => {
              await onConfirm()
              setOpen(false)
            }}
          >
            Bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  onSelect: () => void
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
      : 'nicht bereist'

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
        className="cursor-pointer transition-[opacity,stroke-width] focus:outline-none focus-visible:stroke-ring sm:hover:brightness-105"
        data-territory-id={territory.id}
        fill={ownerColor}
        opacity={claim ? 0.94 : 1}
        stroke={isSelected ? 'var(--foreground)' : 'var(--background)'}
        strokeWidth={isSelected ? 2.2 : 0.75}
        vectorEffect="non-scaling-stroke"
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect()
          }
        }}
      >
        <title>{`${territory.name}: ${ownerLabel}`}</title>
      </path>
    </>
  )
})

export function InlineTextEdit({
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
        className="size-11 sm:size-8"
        aria-label={`${ariaLabel} bearbeiten`}
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="size-4" />
      </Button>
    </div>
  )
}

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
                <SelectItem value={unclaimedValue}>Nicht bereist</SelectItem>
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
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Noch keine Bereisungen im aktuellen Datensatz.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[780px] text-sm">
        <thead className="bg-secondary/70 text-left">
          <tr>
            <th className="px-3 py-2 font-semibold">Datum</th>
            <th className="px-3 py-2 font-semibold">Spieler</th>
            <th className="px-3 py-2 font-semibold">Territorium</th>
            <th className="px-3 py-2 text-right font-semibold">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} className="border-t">
              <td className="px-3 py-2">
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
              </td>
              <td className="px-3 py-2">
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
              </td>
              <td className="px-3 py-2">
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
                    {territoriesByMap[event.mapId].map((territory) => (
                      <SelectItem key={territory.id} value={territory.id}>
                        {territory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </td>
              <td className="px-3 py-2 text-right">
                <ConfirmButton
                  title="Bereisung löschen?"
                  description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
                  onConfirm={() => onDeleteEvent(event.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Bereisung löschen"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
