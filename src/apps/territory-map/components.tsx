import {
  CirclePlus,
  Trash2,
} from 'lucide-react'
import {
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react'

import { territoryOptionsByMap } from '@/apps/territory-map/data/territories'
import { unclaimedValue } from '@/apps/territory-map/mapConfig'
import {
  getAdaptiveStripeWidth,
  getTerritoryClaimColor,
  getTerritoryClaimOwners,
} from '@/apps/territory-map/ownershipPattern'
import type {
  Territory,
  TerritoryClaim,
  TerritoryClaimOwner,
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
import { useI18n } from '@/lib/i18n'

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

export function AdaptiveTerritoryOwnerPattern({
  measurementKey,
  owners,
  pathRef,
  patternId,
  players,
}: {
  measurementKey?: number
  owners: TerritoryClaimOwner[]
  pathRef: RefObject<SVGPathElement | null>
  patternId: string
  players: TerritoryPlayer[]
}) {
  const [stripeWidth, setStripeWidth] = useState(1)

  useLayoutEffect(() => {
    const path = pathRef.current

    if (!path) {
      return
    }

    let frameId: number | null = null
    const measure = () => {
      frameId = null
      const screenBounds = path.getBoundingClientRect()
      const svgBounds = path.getBBox()
      const nextStripeWidth = getAdaptiveStripeWidth({
        ownerCount: owners.length,
        screenHeight: screenBounds.height,
        screenWidth: screenBounds.width,
        svgHeight: svgBounds.height,
        svgWidth: svgBounds.width,
      })

      setStripeWidth((current) =>
        Math.abs(current - nextStripeWidth) < 0.01
          ? current
          : nextStripeWidth,
      )
    }
    const scheduleMeasure = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(measure)
      }
    }
    const svg = path.ownerSVGElement
    const resizeObserver = new ResizeObserver(scheduleMeasure)

    if (svg) {
      resizeObserver.observe(svg)
    }
    scheduleMeasure()

    return () => {
      resizeObserver.disconnect()
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [measurementKey, owners.length, pathRef])

  return (
    <pattern
      data-owner-count={owners.length}
      data-stripe-width={stripeWidth}
      id={patternId}
      width={owners.length * stripeWidth}
      height={stripeWidth}
      patternUnits="userSpaceOnUse"
      patternTransform="rotate(45)"
    >
      {owners.map((owner, index) => (
        <rect
          key={owner.playerId}
          x={index * stripeWidth}
          width={stripeWidth}
          height={stripeWidth}
          fill={getTerritoryClaimColor(
            owner.playerId,
            owner.playerColor,
            players,
          )}
        />
      ))}
    </pattern>
  )
}

export const TerritoryShape = memo(function TerritoryShape({
  claim,
  isDisabled,
  isSelected,
  onSelect,
  players,
  territory,
  zoom,
}: {
  claim?: TerritoryClaim
  isDisabled: boolean
  isSelected: boolean
  onSelect: (territoryId: string) => void
  players: TerritoryPlayer[]
  territory: Territory
  zoom: number
}) {
  const { t } = useI18n()
  const pathRef = useRef<SVGPathElement>(null)
  const owners = getTerritoryClaimOwners(claim)
  const patternId = `territory-shared-${territory.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`
  const ownerColor =
    owners.length > 1
      ? `url(#${patternId})`
      : owners.length === 1
        ? getTerritoryClaimColor(
            owners[0].playerId,
            owners[0].playerColor,
            players,
          )
        : 'url(#territory-unclaimed)'
  const ownerLabel =
    owners.length > 0
      ? owners.map((owner) => owner.playerName).join(', ')
      : t('territory.unvisited')

  return (
    <>
      {owners.length > 1 && (
        <AdaptiveTerritoryOwnerPattern
          measurementKey={zoom}
          owners={owners}
          pathRef={pathRef}
          patternId={patternId}
          players={players}
        />
      )}
      <path
        ref={pathRef}
        d={territory.path}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-disabled={isDisabled}
        aria-label={`${territory.name}, ${ownerLabel}`}
        className={[
          'territory-shape transition-[opacity,stroke-width] focus:outline-none focus-visible:stroke-ring',
          isDisabled
            ? 'cursor-default'
            : 'cursor-pointer sm:hover:brightness-105',
        ].join(' ')}
        data-territory-id={territory.id}
        fill={ownerColor}
        opacity={claim ? 0.94 : 1}
        stroke={isSelected ? 'var(--foreground)' : 'var(--background)'}
        strokeWidth={isSelected ? 2.2 : 0.75}
        vectorEffect="non-scaling-stroke"
        onKeyDown={(event) => {
          if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
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
  isDisabled,
  onClaim,
  onOpenChange,
  players,
  territory,
}: {
  claim?: TerritoryClaim
  isDisabled: boolean
  onClaim: (playerId: string) => Promise<void>
  onOpenChange: (open: boolean) => void
  players: TerritoryPlayer[]
  territory: Territory | null
}) {
  const { t } = useI18n()
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
          <DialogTitle>
            {t('territory.claimDialogTitle', { territory: territory.name })}
          </DialogTitle>
          <DialogDescription>
            {claim
              ? t('territory.currentVisitedBy', { names: ownerNames ?? '-' })
              : t('territory.unclaimed')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 min-[34rem]:flex-row min-[34rem]:items-end">
          <div className="min-w-0 flex-1">
            <Select
              disabled={isDisabled}
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
              <IftaSelectTrigger
                id="claim-player"
                className="w-full"
                label={t('territory.tourist')}
              >
                <SelectValue placeholder={t('territory.selectTourist')} />
              </IftaSelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
                <SelectItem value={unclaimedValue}>
                  {t('territory.unvisited')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="h-9 w-full min-[34rem]:h-11 min-[34rem]:w-auto"
            disabled={isDisabled}
            size="ifta"
            onClick={() => onClaim(selectedPlayerId)}
          >
            {t('territory.claimAction')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AddEaterCard({
  disabled,
  onAdd,
}: {
  disabled: boolean
  onAdd: () => Promise<void>
}) {
  const { t } = useI18n()

  return (
    <div className="rounded-md border border-dashed bg-background p-3">
      <Button
        className="h-9 w-full"
        disabled={disabled}
        variant="outline"
        onClick={() => void onAdd()}
      >
        <CirclePlus className="size-4" />
        {t('territory.addTourist')}
      </Button>
    </div>
  )
}

export function TerritoryEventTable({
  dataset,
  disabled,
  onDeleteEvent,
  onUpdateEvent,
  players,
}: {
  dataset: TerritoryDataset
  disabled: boolean
  onDeleteEvent: (eventId: string) => void | Promise<void>
  onUpdateEvent: ReturnType<typeof useTerritoryMap>['updateEvent']
  players: TerritoryPlayer[]
}) {
  const { t } = useI18n()
  const events = getEventTable(dataset.events)

  if (events.length === 0) {
    return (
      <EmptyState>
        {t('territory.emptyEvents')}
      </EmptyState>
    )
  }

  const renderDateInput = (event: TerritoryVisitEvent) => (
    <Input
      key={event.createdAtClientIso}
      type="date"
      disabled={disabled}
      aria-label={t('territory.date')}
      className="h-9 px-2 md:px-3"
      defaultValue={toDateInputValue(event.createdAtClientIso)}
      onBlur={(inputEvent) => {
        const nextValue = inputEvent.currentTarget.value

        if (nextValue === toDateInputValue(event.createdAtClientIso)) {
          return
        }

        void onUpdateEvent(event.id, {
          createdAtClientIso: fromDateInputValue(
            nextValue,
            event.createdAtClientIso,
          ),
        })
      }}
      onKeyDown={(inputEvent) => {
        if (inputEvent.key === 'Enter') {
          inputEvent.currentTarget.blur()
        }

        if (inputEvent.key === 'Escape') {
          inputEvent.currentTarget.value = toDateInputValue(
            event.createdAtClientIso,
          )
          inputEvent.currentTarget.blur()
        }
      }}
    />
  )
  const renderPlayerSelect = (event: TerritoryVisitEvent) => (
    <Select
      disabled={disabled}
      value={event.playerId}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          playerId: value,
        })
      }
    >
      <SelectTrigger
        aria-label={t('territory.tourist')}
        className="w-full min-w-0 md:w-48"
      >
        <span className="min-w-0 truncate">
          <SelectValue />
        </span>
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
      disabled={disabled}
      value={event.territoryId}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          territoryId: value,
        })
      }
    >
      <SelectTrigger
        aria-label={t('territory.territory')}
        className="w-full min-w-0 md:w-64"
      >
        <span className="min-w-0 truncate">
          <SelectValue />
        </span>
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
      title={t('territory.claimDeleteTitle')}
      description={t('common.event.deleteDescription')}
      onConfirm={() => onDeleteEvent(event.id)}
      trigger={
        <Button
          disabled={disabled}
          variant="delete"
          size="icon"
          aria-label={t('territory.claimDeleteTitle')}
        >
          <Trash2 className="size-4" />
        </Button>
      }
    />
  )

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {events.map((event) => (
          <div key={event.id} className="type-ui rounded-md border bg-card p-3">
            <div className="grid grid-cols-1 gap-3 min-[23rem]:grid-cols-2">
              <div className="min-w-0">
                <div className="type-caption mb-1.5 text-muted-foreground">
                  {t('territory.date')}
                </div>
                {renderDateInput(event)}
              </div>
              <div className="min-w-0">
                <div className="type-caption mb-1.5 text-muted-foreground">
                  {t('territory.player')}
                </div>
                {renderPlayerSelect(event)}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_2.25rem] items-end gap-3 min-[23rem]:col-span-2">
                <div className="min-w-0">
                  <div className="type-caption mb-1.5 text-muted-foreground">
                    {t('territory.territory')}
                  </div>
                  {renderTerritorySelect(event)}
                </div>
                {renderDeleteButton(event)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Table className="min-w-[780px]" containerClassName="hidden md:block">
        <TableHeader>
            <TableHead>{t('territory.date')}</TableHead>
            <TableHead>{t('territory.player')}</TableHead>
            <TableHead>{t('territory.territory')}</TableHead>
            <TableHead className="text-right">{t('decisionWheel.action')}</TableHead>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>{renderDateInput(event)}</TableCell>
              <TableCell>{renderPlayerSelect(event)}</TableCell>
              <TableCell>{renderTerritorySelect(event)}</TableCell>
              <TableCell className="text-right">
                {renderDeleteButton(event)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
