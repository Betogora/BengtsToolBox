import {
  CirclePlus,
  Pencil,
  Trash2,
} from 'lucide-react'
import { memo, useState, type ReactNode } from 'react'

import { territoriesByMap } from '@/apps/territory-map/data/territories'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import type {
  TerritoryDataset,
  Territory,
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

function toDateTimeLocalValue(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const offsetMs = date.getTimezoneOffset() * 60_000

  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16)
}

function fromDateTimeLocalValue(value: string, fallback: string) {
  if (!value) {
    return fallback
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString()
}

function getEventTable(events: TerritoryVisitEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.createdAtClientIso) - Date.parse(left.createdAtClientIso) ||
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
            Bestaetigen
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
          <DialogTitle>{territory.name} Sushi-bereisen?</DialogTitle>
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
            <th className="px-3 py-2 font-semibold">Zeitpunkt</th>
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
                  type="datetime-local"
                  className="h-9"
                  value={toDateTimeLocalValue(event.createdAtClientIso)}
                  onChange={(inputEvent) =>
                    onUpdateEvent(event.id, {
                      createdAtClientIso: fromDateTimeLocalValue(
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
                  title="Bereisung loeschen?"
                  description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
                  onConfirm={() => onDeleteEvent(event.id)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Bereisung loeschen"
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

export function ArchivedTerritoryDatasetCard({
  dataset,
  onDelete,
  onRename,
}: {
  dataset: TerritoryDataset
  onDelete: (datasetId: string) => void | Promise<void>
  onRename: (datasetId: string, name: string) => void | Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const events = getEventTable(dataset.events)

  return (
    <div className="rounded-lg border">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="min-w-0 flex-1 text-left"
          onClick={() => setIsOpen((current) => !current)}
        >
          <div className="font-semibold">{dataset.name || 'Archivierter Datensatz'}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(dataset.archivedAtClientIso)} - {events.length}{' '}
            Bereisungen
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Input
            aria-label="Archivname"
            className="h-9 w-56"
            defaultValue={dataset.name}
            onBlur={(event) => onRename(dataset.id, event.currentTarget.value)}
          />
          <ConfirmButton
            title="Datensatz loeschen?"
            description="Der archivierte Datensatz wird dauerhaft entfernt."
            onConfirm={() => onDelete(dataset.id)}
            trigger={
              <Button variant="ghost" size="icon" aria-label="Archiv loeschen">
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
      {isOpen && (
        <div className="grid gap-2 border-t p-4">
          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              Dieser Datensatz hat keine Bereisungen.
            </div>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: event.playerColor }}
                  />
                  <span className="min-w-0 truncate font-medium">
                    {event.playerName}
                  </span>
                  <span className="min-w-0 truncate text-sm text-muted-foreground">
                    {event.territoryName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(event.createdAtClientIso)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
