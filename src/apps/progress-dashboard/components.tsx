import {
  Beer,
  ChevronDown,
  ChevronRight,
  Funnel,
  Martini,
  Minus,
  Plus,
  Trash2,
  Wine,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'

import type {
  PlayerScore,
  ProgressDataset,
  ProgressEvent,
  ProgressEventDelta,
  ProgressEventIcon,
  ProgressPlayer,
} from '@/apps/progress-dashboard/types'
import type { useProgressDashboard } from '@/apps/progress-dashboard/hooks/useProgressDashboard'
import { formatNumber } from '@/apps/progress-dashboard/format'
import { ConfirmButton } from '@/apps/shared/components/ConfirmButton'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { InlineTextEdit } from '@/apps/shared/components/InlineTextEdit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { getReadableTextColor } from '@/lib/theme'

const chartWidth = 1040
const chartHeight = 420
const chartPadding = {
  top: 38,
  right: 36,
  bottom: 58,
  left: 70,
}

const drinkValueOptions = [
  0, 0.25, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8, 9, 10,
]

const eventIconComponents: Record<ProgressEventIcon, LucideIcon> = {
  plus: Plus,
  minus: Minus,
  wine: Wine,
  beer: Beer,
  schnaps: Martini,
  funnel: Funnel,
}

function formatSignedNumber(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''

  return `${sign}${formatNumber(Math.abs(value))}`
}

function getDrinkValueSelectValue(value: number) {
  const absoluteValue = Math.abs(value)
  const matchingValue = drinkValueOptions.find(
    (option) => Math.abs(option - absoluteValue) < 0.001,
  )

  return String(matchingValue ?? 1)
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

function getSortedEvents(events: ProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(left.createdAtClientIso) - Date.parse(right.createdAtClientIso) ||
      left.position - right.position,
  )
}

function getEventTable(events: ProgressEvent[]) {
  return [...events].sort(
    (left, right) =>
      Date.parse(right.createdAtClientIso) - Date.parse(left.createdAtClientIso) ||
      right.position - left.position,
  )
}

export function ProgressChart({
  dataset,
  players,
}: {
  dataset: ProgressDataset
  players: ProgressPlayer[]
}) {
  const sortedEvents = useMemo(() => getSortedEvents(dataset.events), [dataset.events])
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null)
  const [pinnedPlayerId, setPinnedPlayerId] = useState<string | null>(null)
  const playerIds = useMemo(
    () => new Set(players.map((player) => player.id)),
    [players],
  )
  const activePlayerId =
    (hoveredPlayerId && playerIds.has(hoveredPlayerId) ? hoveredPlayerId : null) ??
    (pinnedPlayerId && playerIds.has(pinnedPlayerId) ? pinnedPlayerId : null)
  const validEventTimes = sortedEvents
    .map((event) => Date.parse(event.createdAtClientIso))
    .filter(Number.isFinite)

  if (sortedEvents.length === 0 || validEventTimes.length === 0) {
    return (
      <EmptyState className="flex aspect-[2.45/1] min-h-0 items-center justify-center bg-card p-4">
        Noch keine Ereignisse im aktuellen Datensatz.
      </EmptyState>
    )
  }

  const minTime = Math.min(...validEventTimes)
  const maxTime = Math.max(...validEventTimes)
  const xDomainMin = minTime === maxTime ? minTime - 60_000 : minTime
  const xDomainMax = minTime === maxTime ? maxTime + 60_000 : maxTime
  const valuesByPlayer = new Map(players.map((player) => [player.id, 0]))
  const eventPoints: {
    event: ProgressEvent
    x: number
    y: number
  }[] = []
  const series = players.map((player) => {
    const playerEvents = sortedEvents.filter((event) => event.playerId === player.id)
    let score = 0
    const segments: { time: number; value: number }[] = [
      { time: xDomainMin, value: 0 },
    ]

    playerEvents.forEach((event) => {
      const time = Date.parse(event.createdAtClientIso)

      if (!Number.isFinite(time)) {
        return
      }

      segments.push({ time, value: score })
      score = Math.max(0, score + event.valueDelta)
      segments.push({ time, value: score })
      valuesByPlayer.set(player.id, score)
    })

    segments.push({ time: xDomainMax, value: score })

    return {
      player,
      segments,
    }
  })
  const maxValue = Math.max(1, ...Array.from(valuesByPlayer.values()))
  const yDomainMax = Math.max(1, Math.ceil(maxValue * 1.12))
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const xScale = (time: number) =>
    chartPadding.left +
    ((time - xDomainMin) / (xDomainMax - xDomainMin || 1)) * plotWidth
  const yScale = (value: number) =>
    chartPadding.top + plotHeight - (value / yDomainMax) * plotHeight
  const yTicks = Array.from({ length: 5 }, (_, index) => (yDomainMax / 4) * index)
  const xTicks = Array.from({ length: 5 }, (_, index) => {
    const time = xDomainMin + ((xDomainMax - xDomainMin) / 4) * index

    return {
      time,
      label: new Date(time).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }
  })

  sortedEvents.forEach((event) => {
    const player = players.find((candidate) => candidate.id === event.playerId)

    if (!player) {
      return
    }

    const playerEventsUntilNow = sortedEvents.filter(
      (candidate) =>
        candidate.playerId === event.playerId &&
        (Date.parse(candidate.createdAtClientIso) < Date.parse(event.createdAtClientIso) ||
          candidate.position <= event.position),
    )
    const score = playerEventsUntilNow.reduce(
      (current, candidate) => Math.max(0, current + candidate.valueDelta),
      0,
    )
    const time = Date.parse(event.createdAtClientIso)

    if (Number.isFinite(time)) {
      eventPoints.push({
        event,
        x: xScale(time),
        y: yScale(score),
      })
    }
  })

  const chartSeries = series.flatMap(({ player, segments }) => {
    if (segments.length < 2) {
      return []
    }

    const path = segments
      .map((point, index) => {
        const command = index === 0 ? 'M' : 'L'

        return `${command} ${xScale(point.time).toFixed(1)} ${yScale(point.value).toFixed(1)}`
      })
      .join(' ')

    return [{ player, path }]
  })
  const orderedChartSeries = activePlayerId
    ? [
        ...chartSeries.filter(({ player }) => player.id !== activePlayerId),
        ...chartSeries.filter(({ player }) => player.id === activePlayerId),
      ]
    : chartSeries
  const orderedEventPoints = activePlayerId
    ? [
        ...eventPoints.filter((point) => point.event.playerId !== activePlayerId),
        ...eventPoints.filter((point) => point.event.playerId === activePlayerId),
      ]
    : eventPoints
  const showHoveredPlayer = (playerId: string) => {
    setHoveredPlayerId(playerId)
  }
  const hideHoveredPlayer = (playerId: string) => {
    setHoveredPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : currentPlayerId,
    )
  }
  const togglePinnedPlayer = (playerId: string) => {
    setPinnedPlayerId((currentPlayerId) =>
      currentPlayerId === playerId ? null : playerId,
    )
  }
  const clearHighlightedPlayer = () => {
    setHoveredPlayerId(null)
    setPinnedPlayerId(null)
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white p-3">
      <svg
        role="group"
        aria-label={dataset.chartTitle}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="block h-auto w-full"
        onClick={clearHighlightedPlayer}
        onPointerLeave={() => setHoveredPlayerId(null)}
      >
        <rect width={chartWidth} height={chartHeight} fill="#ffffff" rx="8" />
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={chartPadding.left}
              x2={chartWidth - chartPadding.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="var(--border)"
            />
            <text
              x={chartPadding.left - 14}
              y={yScale(tick) + 4}
              textAnchor="end"
              fontSize="12"
              fill="var(--muted-foreground)"
            >
              {formatNumber(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick.time}`}>
            <line
              x1={xScale(tick.time)}
              x2={xScale(tick.time)}
              y1={chartPadding.top}
              y2={chartHeight - chartPadding.bottom}
              stroke="var(--muted)"
            />
            <text
              x={xScale(tick.time)}
              y={chartHeight - 24}
              textAnchor="middle"
              fontSize="12"
              fill="var(--muted-foreground)"
            >
              {tick.label}
            </text>
          </g>
        ))}
        <line
          x1={chartPadding.left}
          x2={chartPadding.left}
          y1={chartPadding.top}
          y2={chartHeight - chartPadding.bottom}
          stroke="var(--brand-surface)"
        />
        <line
          x1={chartPadding.left}
          x2={chartWidth - chartPadding.right}
          y1={chartHeight - chartPadding.bottom}
          y2={chartHeight - chartPadding.bottom}
          stroke="var(--brand-surface)"
        />
        <text
          x={20}
          y={chartHeight / 2}
          textAnchor="middle"
          transform={`rotate(-90 20 ${chartHeight / 2})`}
          fontSize="13"
          fontWeight="600"
          fill="var(--foreground)"
        >
          {dataset.unit}
        </text>
        <text
          x={chartWidth / 2}
          y={chartHeight - 6}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="var(--foreground)"
        >
          Zeit
        </text>
        {orderedChartSeries.map(({ player, path }) => {
          const isActive = activePlayerId === player.id
          const isDimmed = activePlayerId !== null && !isActive

          return (
            <g key={player.id}>
              {isActive && (
                <path
                  d={path}
                  fill="none"
                  opacity="0.95"
                  pointerEvents="none"
                  stroke="#ffffff"
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  strokeWidth="12"
                />
              )}
              <path
                d={path}
                fill="none"
                opacity={isDimmed ? '0.22' : '1'}
                pointerEvents="none"
                stroke={player.color}
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth={isActive ? '6' : '4'}
                style={{
                  filter: isActive
                    ? 'drop-shadow(0 3px 5px rgb(15 23 42 / 0.24))'
                    : undefined,
                  transition:
                    'opacity 150ms ease, stroke-width 150ms ease, filter 150ms ease',
                }}
              />
            </g>
          )
        })}
        {orderedChartSeries.map(({ player, path }) => (
          <path
            key={`${player.id}-hit-area`}
            d={path}
            role="button"
            aria-label={`${player.name} Zeitreihe hervorheben`}
            aria-pressed={pinnedPlayerId === player.id}
            className="cursor-pointer outline-none"
            fill="none"
            focusable="true"
            opacity="0"
            pointerEvents="stroke"
            stroke="transparent"
            strokeLinecap="square"
            strokeLinejoin="miter"
            strokeWidth="18"
            tabIndex={0}
            onBlur={() => hideHoveredPlayer(player.id)}
            onClick={(event) => {
              event.stopPropagation()
              togglePinnedPlayer(player.id)
            }}
            onFocus={() => showHoveredPlayer(player.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                togglePinnedPlayer(player.id)
              }
            }}
            onPointerEnter={() => showHoveredPlayer(player.id)}
            onPointerLeave={() => hideHoveredPlayer(player.id)}
          />
        ))}
        {orderedEventPoints.map((point) => {
          const Icon = eventIconComponents[point.event.icon]
          const isActive = activePlayerId === point.event.playerId
          const isDimmed = activePlayerId !== null && !isActive
          const markerIconColor = getReadableTextColor(point.event.playerColor)

          return (
            <g
              key={point.event.id}
              className="cursor-pointer"
              opacity={isDimmed ? '0.28' : '1'}
              style={{
                filter: isActive
                  ? 'drop-shadow(0 3px 5px rgb(15 23 42 / 0.2))'
                  : undefined,
                transition: 'opacity 150ms ease, filter 150ms ease',
              }}
              onClick={(event) => {
                event.stopPropagation()
                togglePinnedPlayer(point.event.playerId)
              }}
              onPointerEnter={() => showHoveredPlayer(point.event.playerId)}
              onPointerLeave={() => hideHoveredPlayer(point.event.playerId)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? '13' : '11'}
                fill={point.event.playerColor}
              />
              <Icon
                x={point.x - 6.5}
                y={point.y - 6.5}
                width="13"
                height="13"
                color={markerIconColor}
                strokeWidth="2.4"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function PlayerCard({
  onAddEvent,
  onColorChange,
  onNameChange,
  onRemove,
  playerScore,
  unit,
}: {
  onAddEvent: (player: ProgressPlayer, valueDelta: ProgressEventDelta) => void
  onColorChange: (playerId: string, color: string) => void
  onNameChange: (playerId: string, name: string) => void
  onRemove: (playerId: string) => void
  playerScore: PlayerScore
  unit: string
}) {
  const { player, score } = playerScore

  return (
    <Card className="overflow-hidden">
      <div className="h-1.5 w-full" style={{ backgroundColor: player.color }} />
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <InlineTextEdit
              ariaLabel={`Name für ${player.name}`}
              className="py-1 text-2xl font-semibold tracking-normal"
              fallback={`Person ${player.position}`}
              inputClassName="h-11 text-xl font-semibold"
              value={player.name}
              onSave={(value) => onNameChange(player.id, value)}
            />
          </div>
          <ConfirmButton
            title="Spieler löschen?"
            description={`${player.name} wird entfernt. Bestehende Ereignisse bleiben im Datensatz erhalten.`}
            onConfirm={() => onRemove(player.id)}
            trigger={
              <Button
                variant="delete"
                size="icon"
                aria-label={`${player.name} entfernen`}
              >
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Input
          type="color"
          aria-label={`${player.name} Farbe waehlen`}
          className="size-9 cursor-pointer rounded-md border p-1"
          value={player.color}
          onChange={(event) =>
            onColorChange(player.id, event.currentTarget.value)
          }
        />

        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-4xl font-semibold tabular-nums">
              {formatNumber(score)}
            </div>
            <div className="text-xs text-muted-foreground">{unit}</div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={`${player.name} verringern`}
              disabled={score <= 0}
              onClick={() => onAddEvent(player, -1)}
            >
              <Minus className="size-4" />
            </Button>
            <Button
              size="icon"
              aria-label={`${player.name} erhöhen`}
              onClick={() => onAddEvent(player, 1)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function EventTable({
  dataset,
  icons,
  onDeleteEvent,
  onUpdateEvent,
}: {
  dataset: ProgressDataset
  icons: ReturnType<typeof useProgressDashboard>['progressEventIcons']
  onDeleteEvent: (eventId: string) => void
  onUpdateEvent: (
    eventId: string,
    partialValue: Partial<
      Pick<ProgressEvent, 'createdAtClientIso' | 'icon' | 'valueDelta'>
    >,
  ) => void
}) {
  const events = getEventTable(dataset.events)

  if (events.length === 0) {
    return (
      <EmptyState>
        Noch keine Ereignisse im aktuellen Datensatz.
      </EmptyState>
    )
  }

  const renderDateInput = (event: ProgressEvent) => (
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
  )
  const renderPlayerLabel = (event: ProgressEvent) => (
    <div className="flex min-w-0 items-center gap-2 font-medium">
      <span
        className="size-3 shrink-0 rounded-full"
        style={{ backgroundColor: event.playerColor }}
      />
      <span className="min-w-0 break-words">{event.playerName}</span>
    </div>
  )
  const renderValueControls = (event: ProgressEvent) => (
    <div className="flex gap-2">
      <Select
        value={event.valueDelta < 0 ? '-' : '+'}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (value === '-' ? -1 : 1) * Math.abs(event.valueDelta || 1),
          })
        }
      >
        <SelectTrigger className="w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="+">+</SelectItem>
          <SelectItem value="-">-</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={getDrinkValueSelectValue(event.valueDelta)}
        onValueChange={(value) =>
          onUpdateEvent(event.id, {
            valueDelta:
              (event.valueDelta < 0 ? -1 : 1) * Number(value),
          })
        }
      >
        <SelectTrigger className="w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {drinkValueOptions.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {formatNumber(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
  const renderIconSelect = (event: ProgressEvent) => (
    <Select
      value={event.icon}
      onValueChange={(value) =>
        onUpdateEvent(event.id, {
          icon: value as ProgressEventIcon,
        })
      }
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {icons.map((icon) => (
          <SelectItem key={icon.id} value={icon.id}>
            <span className="flex items-center gap-2">
              {(() => {
                const Icon = eventIconComponents[icon.id]

                return <Icon className="size-4" />
              })()}
              {icon.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
  const renderDeleteButton = (event: ProgressEvent) => (
    <ConfirmButton
      title="Ereignis löschen?"
      description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
      onConfirm={() => onDeleteEvent(event.id)}
      trigger={
        <Button variant="delete" size="icon" aria-label="Ereignis löschen">
          <Trash2 className="size-4" />
        </Button>
      }
    />
  )

  return (
    <>
      <div className="grid gap-2 md:hidden">
        {events.map((event) => (
          <div key={event.id} className="rounded-md border bg-card p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              {renderPlayerLabel(event)}
              {renderDeleteButton(event)}
            </div>
            <div className="mt-3 grid gap-3">
              <div>
                <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Zeitpunkt
                </div>
                {renderDateInput(event)}
              </div>
              <div className="grid gap-3 min-[26rem]:grid-cols-2">
                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Wert
                  </div>
                  {renderValueControls(event)}
                </div>
                <div>
                  <div className="mb-1.5 text-xs font-medium text-muted-foreground">
                    Icon
                  </div>
                  {renderIconSelect(event)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Table className="min-w-[760px]" containerClassName="hidden md:block">
        <TableHeader>
            <TableHead>Zeitpunkt</TableHead>
            <TableHead>Spieler</TableHead>
            <TableHead>Wert</TableHead>
            <TableHead>Icon</TableHead>
            <TableHead className="text-right">Aktion</TableHead>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
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
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: event.playerColor }}
                  />
                  {event.playerName}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Select
                    value={event.valueDelta < 0 ? '-' : '+'}
                    onValueChange={(value) =>
                      onUpdateEvent(event.id, {
                        valueDelta:
                          (value === '-' ? -1 : 1) * Math.abs(event.valueDelta || 1),
                      })
                    }
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+">+</SelectItem>
                      <SelectItem value="-">-</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={getDrinkValueSelectValue(event.valueDelta)}
                    onValueChange={(value) =>
                      onUpdateEvent(event.id, {
                        valueDelta:
                          (event.valueDelta < 0 ? -1 : 1) * Number(value),
                      })
                    }
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {drinkValueOptions.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {formatNumber(value)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TableCell>
              <TableCell>
                <Select
                  value={event.icon}
                  onValueChange={(value) =>
                    onUpdateEvent(event.id, {
                      icon: value as ProgressEventIcon,
                    })
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {icons.map((icon) => (
                      <SelectItem key={icon.id} value={icon.id}>
                        <span className="flex items-center gap-2">
                          {(() => {
                            const Icon = eventIconComponents[icon.id]

                            return <Icon className="size-4" />
                          })()}
                          {icon.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="text-right">
                <ConfirmButton
                  title="Ereignis löschen?"
                  description="Diese Zeile wird aus dem aktuellen Datensatz entfernt."
                  onConfirm={() => onDeleteEvent(event.id)}
                  trigger={
                    <Button variant="delete" size="icon" aria-label="Ereignis löschen">
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

export function ArchiveDatasetCard({
  dataset,
  onDelete,
  onRename,
}: {
  dataset: ProgressDataset
  onDelete: (datasetId: string) => void
  onRename: (datasetId: string, name: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const events = getEventTable(dataset.events)

  return (
    <div className="rounded-lg border">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => setIsOpen((current) => !current)}
        >
          {isOpen ? (
            <ChevronDown className="size-4 shrink-0" />
          ) : (
            <ChevronRight className="size-4 shrink-0" />
          )}
          <div className="min-w-0">
            <InlineTextEdit
              ariaLabel="Archivname"
              className="font-semibold"
              fallback="Archivierter Datensatz"
              value={dataset.name}
              onSave={(value) => onRename(dataset.id, value)}
            />
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(dataset.archivedAtClientIso)} - {events.length}{' '}
              Ereignisse
            </div>
          </div>
        </button>
        <ConfirmButton
          title="Datensatz löschen?"
          description="Der archivierte Datensatz wird dauerhaft entfernt."
          onConfirm={() => onDelete(dataset.id)}
          trigger={
            <Button variant="delete" size="icon" aria-label="Archiv löschen">
              <Trash2 className="size-4" />
            </Button>
          }
        />
      </div>
      {isOpen && (
        <div className="border-t p-4">
          {events.length === 0 ? (
            <EmptyState className="p-4">
              Dieser Datensatz hat keine Ereignisse.
            </EmptyState>
          ) : (
            <div className="grid gap-2">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-3 rounded-full"
                      style={{ backgroundColor: event.playerColor }}
                    />
                    <span className="font-medium">{event.playerName}</span>
                    <Badge variant={event.valueDelta > 0 ? 'default' : 'outline'}>
                      {formatSignedNumber(event.valueDelta)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(event.createdAtClientIso)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
