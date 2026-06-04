import {
  CirclePlus,
  Pencil,
} from 'lucide-react'
import { memo, useState } from 'react'

import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import type {
  Territory,
  TerritoryPlayer,
} from '@/apps/territory-map/types'
import { Button } from '@/components/ui/button'
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
                <SelectValue placeholder="Sushi-Tourist wÃ¤hlen" />
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
        Sushi-Tourist hinzufÃ¼gen
      </Button>
    </div>
  )
}
