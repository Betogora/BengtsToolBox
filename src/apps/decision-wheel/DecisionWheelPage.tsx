import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CircleDot,
  History,
  ListChecks,
  Plus,
  RotateCcw,
  Shuffle,
  Trash2,
  Trophy,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  getEntryDisplayText,
  useDecisionWheel,
} from '@/apps/decision-wheel/hooks/useDecisionWheel'
import type {
  DecisionWheelEntry,
  DecisionWheelResult,
} from '@/apps/decision-wheel/types'
import { AppPageTitle } from '@/apps/shared/components/AppPageTitle'
import { AppPage } from '@/apps/shared/components/AppPage'
import { EmptyState } from '@/apps/shared/components/EmptyState'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { IftaInput } from '@/components/ui/ifta-field'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getReadableTextColor } from '@/lib/theme'
import { cn } from '@/lib/utils'

type WheelSegment = DecisionWheelEntry & {
  startAngle: number
  endAngle: number
  midAngle: number
}

const wheelSize = 260
const wheelCenter = wheelSize / 2
const wheelRadius = 118
const spinDurationMs = 4400
const spinSettleDelayMs = spinDurationMs + 150
const spinFullRotationDegrees = 1800

function normalizeRotation(value: number) {
  return ((value % 360) + 360) % 360
}

function polarToCartesian(angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: wheelCenter + wheelRadius * Math.cos(radians),
    y: wheelCenter + wheelRadius * Math.sin(radians),
  }
}

function createSegmentPath(startAngle: number, endAngle: number) {
  const start = polarToCartesian(startAngle)
  const end = polarToCartesian(endAngle)
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${wheelCenter} ${wheelCenter}`,
    `L ${start.x} ${start.y}`,
    `A ${wheelRadius} ${wheelRadius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
    'Z',
  ].join(' ')
}

function getSegments(entries: DecisionWheelEntry[]): WheelSegment[] {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let currentAngle = 0

  if (totalWeight <= 0) {
    return []
  }

  return entries.map((entry) => {
    const size = (entry.weight / totalWeight) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + size

    currentAngle = endAngle

    return {
      ...entry,
      startAngle,
      endAngle,
      midAngle: startAngle + size / 2,
    }
  })
}

function shortenWheelLabel(value: string) {
  return value.length > 16 ? `${value.slice(0, 15)}...` : value
}

function getColorWithAlpha(color: string, alphaHex: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color
}

function parseWeightDraft(value: string) {
  const numericWeight = Number(value)

  return Number.isFinite(numericWeight) && numericWeight >= 1
    ? Math.round(numericWeight)
    : null
}

function getRenderableWheelEntries(
  entries: DecisionWheelEntry[],
  weightDrafts: Record<string, string>,
) {
  return entries.flatMap((entry) => {
    const draftValue = weightDrafts[entry.id]

    if (draftValue === undefined) {
      return entry.weight >= 1 ? [entry] : []
    }

    const draftWeight = parseWeightDraft(draftValue)

    return draftWeight === null ? [] : [{ ...entry, weight: draftWeight }]
  })
}

type WheelGraphicProps = {
  entries: DecisionWheelEntry[]
  rotation: number
  isSpinning: boolean
}

function WheelGraphic({ entries, rotation, isSpinning }: WheelGraphicProps) {
  const segments = useMemo(() => getSegments(entries), [entries])

  if (entries.length === 0) {
    return (
      <div className="flex aspect-square w-full max-w-[30rem] items-center justify-center rounded-full border border-dashed bg-secondary text-center text-sm text-muted-foreground">
        Keine Optionen im Rad.
      </div>
    )
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[30rem]">
      <div
        className="absolute left-1/2 top-0 z-10 h-0 w-0 -translate-x-1/2 border-x-[13px] border-t-[26px] border-x-transparent border-t-foreground"
        aria-hidden="true"
      />
      <svg
        viewBox={`0 0 ${wheelSize} ${wheelSize}`}
        className="size-full drop-shadow-sm"
        role="img"
        aria-label="Glücksrad"
        style={
          {
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning
              ? `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.72, 0.18, 1)`
              : 'none',
          } as CSSProperties
        }
      >
        <circle cx={wheelCenter} cy={wheelCenter} r={wheelRadius + 5} fill="#ffffff" />
        {segments.map((segment, index) => {
          const segmentSize = segment.endAngle - segment.startAngle
          const labelPosition = {
            x:
              wheelCenter +
              wheelRadius * 0.58 * Math.cos(((segment.midAngle - 90) * Math.PI) / 180),
            y:
              wheelCenter +
              wheelRadius * 0.58 * Math.sin(((segment.midAngle - 90) * Math.PI) / 180),
          }

          return (
            <g key={segment.id}>
              {segmentSize >= 359.99 ? (
                <circle
                  cx={wheelCenter}
                  cy={wheelCenter}
                  r={wheelRadius}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              ) : (
                <path
                  d={createSegmentPath(segment.startAngle, segment.endAngle)}
                  fill={segment.color}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
              {segmentSize > 16 && (
                <text
                  x={labelPosition.x}
                  y={labelPosition.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={getReadableTextColor(segment.color)}
                  fontSize={entries.length > 8 ? 8 : 10}
                  fontWeight="700"
                  paintOrder="stroke"
                  stroke="rgba(54, 50, 55, 0.38)"
                  strokeWidth="2"
                  transform={`rotate(${segment.midAngle}, ${labelPosition.x}, ${labelPosition.y})`}
                >
                  {shortenWheelLabel(getEntryDisplayText(segment, index))}
                </text>
              )}
            </g>
          )
        })}
        <circle cx={wheelCenter} cy={wheelCenter} r="24" fill="#ffffff" />
        <circle cx={wheelCenter} cy={wheelCenter} r="13" fill="var(--primary)" />
      </svg>
    </div>
  )
}

type ResultPanelProps = {
  result: DecisionWheelResult | null
}

function ResultPanel({ result }: ResultPanelProps) {
  return (
    <div
      className="rounded-lg border bg-secondary p-4"
      style={
        result
          ? { backgroundColor: getColorWithAlpha(result.color, '80') }
          : undefined
      }
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="size-4" />
        Gewinner
      </div>
      <div className="mt-2 flex min-h-10 items-center justify-between gap-3">
        <div className="min-w-0 truncate text-2xl font-semibold">
          {result?.text ?? 'Noch nicht gedreht'}
        </div>
        {result && (
          <span
            className="size-5 shrink-0 rounded-full border"
            style={{ backgroundColor: result.color }}
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  )
}

export function DecisionWheelPage() {
  const {
    addEntry,
    clearHistory,
    data,
    error,
    commitSpinResult,
    prepareSpinResult,
    removeEntry,
    resetToExamples,
    updateEntry,
  } = useDecisionWheel()
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [spinEntries, setSpinEntries] = useState<DecisionWheelEntry[] | null>(null)
  const [weightDrafts, setWeightDrafts] = useState<Record<string, string>>({})
  const spinTimeoutRef = useRef<number | null>(null)
  const isSpinLockedRef = useRef(false)
  const wheelEntries = useMemo(
    () => getRenderableWheelEntries(data.entries, weightDrafts),
    [data.entries, weightDrafts],
  )
  const visibleEntries = spinEntries ?? wheelEntries
  const canSpin = wheelEntries.length > 0 && !isSpinning

  useEffect(
    () => () => {
      if (spinTimeoutRef.current) {
        window.clearTimeout(spinTimeoutRef.current)
      }
    },
    [],
  )

  const handleSpin = () => {
    if (isSpinLockedRef.current) {
      return
    }

    const entriesBeforeSpin = wheelEntries
    const result = prepareSpinResult(entriesBeforeSpin)

    if (!result) {
      toast.error('Lege zuerst mindestens eine Option an.')
      return
    }

    const selectedSegment = getSegments(entriesBeforeSpin).find(
      (segment) => segment.id === result.entryId,
    )

    if (!selectedSegment) {
      return
    }

    const selectedSegmentSize = selectedSegment.endAngle - selectedSegment.startAngle
    const targetAngle =
      selectedSegment.startAngle + Math.random() * selectedSegmentSize
    const currentRotation = normalizeRotation(rotation)
    const correction =
      (360 - normalizeRotation(currentRotation + targetAngle)) % 360

    isSpinLockedRef.current = true
    setSpinEntries(entriesBeforeSpin)
    setIsSpinning(true)
    setRotation(rotation + spinFullRotationDegrees + correction)
    spinTimeoutRef.current = window.setTimeout(() => {
      commitSpinResult(result)
        .then(() => {
          toast.success(`${result.text} wurde gezogen.`)
        })
        .catch(() => {
          toast.error('Das Ergebnis konnte nicht gespeichert werden.')
        })
        .finally(() => {
          spinTimeoutRef.current = null
          isSpinLockedRef.current = false
          setIsSpinning(false)
          setSpinEntries(null)
        })
    }, spinSettleDelayMs)
  }

  const clearWeightDraft = (entryId: string) =>
    setWeightDrafts((currentDrafts) => {
      if (!(entryId in currentDrafts)) {
        return currentDrafts
      }

      const nextDrafts = { ...currentDrafts }
      delete nextDrafts[entryId]

      return nextDrafts
    })

  const handleWeightChange = (entryId: string, nextValue: string) => {
    setWeightDrafts((currentDrafts) => ({
      ...currentDrafts,
      [entryId]: nextValue,
    }))

    const nextWeight = parseWeightDraft(nextValue)

    if (nextWeight !== null) {
      updateEntry(entryId, { weight: nextWeight })
    }
  }

  return (
    <AppPage>
      <section>
        <AppPageTitle Icon={CircleDot} title="Glücksrad" />
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="size-5 text-primary" />
              Rad
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5">
            <WheelGraphic
              entries={visibleEntries}
              rotation={rotation}
              isSpinning={isSpinning}
            />

            <Button size="lg" disabled={!canSpin} onClick={handleSpin}>
              <Shuffle className="size-4" />
              {isSpinning ? 'Dreht...' : 'Drehen'}
            </Button>

            <ResultPanel result={data.lastResult} />
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks className="size-5 text-primary" />
                    Optionen
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={resetToExamples}>
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.entries.length === 0 ? (
                <EmptyState>
                  Keine Optionen vorhanden. Füge eine Option hinzu oder setze die
                  Liste zurück.
                </EmptyState>
              ) : (
                <>
                  <div className="grid gap-2 md:hidden">
                    {data.entries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="grid gap-3 rounded-md border bg-card p-2.5 text-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex h-6 min-w-7 items-center justify-center rounded-md border bg-secondary px-2 text-xs font-semibold leading-none tabular-nums">
                            #{index + 1}
                          </span>
                          <Button
                            aria-label={`${getEntryDisplayText(entry, index)} löschen`}
                            className="h-9 w-9 px-0"
                            size="ifta"
                            variant="delete"
                            onClick={() => removeEntry(entry.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-[minmax(0,1fr)_5rem] gap-2">
                          <IftaInput
                            id={`entry-text-${entry.id}`}
                            label="Text"
                            value={entry.text}
                            onChange={(event) =>
                              updateEntry(entry.id, { text: event.target.value })
                            }
                          />
                          <IftaInput
                            id={`entry-weight-${entry.id}`}
                            label="Gewicht"
                            min={1}
                            type="number"
                            className="text-center tabular-nums"
                            value={weightDrafts[entry.id] ?? String(entry.weight)}
                            onBlur={() => clearWeightDraft(entry.id)}
                            onChange={(event) =>
                              handleWeightChange(
                                entry.id,
                                event.currentTarget.value,
                              )
                            }
                          />
                        </div>

                        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
                          <Label
                            className="text-xs font-semibold text-muted-foreground"
                            htmlFor={`entry-color-${entry.id}`}
                          >
                            Farbe
                          </Label>
                          <Input
                            id={`entry-color-${entry.id}`}
                            type="color"
                            aria-label={`${getEntryDisplayText(entry, index)} Farbe waehlen`}
                            className="h-11 cursor-pointer rounded-md border p-1"
                            value={entry.color}
                            onChange={(event) =>
                              updateEntry(entry.id, {
                                color: event.currentTarget.value,
                              })
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Table className="min-w-[38rem]" containerClassName="hidden md:block">
                    <TableHeader>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Text</TableHead>
                      <TableHead className="w-28">Gewicht</TableHead>
                      <TableHead className="w-24">Farbe</TableHead>
                      <TableHead className="w-20">Aktion</TableHead>
                    </TableHeader>
                    <TableBody>
                      {data.entries.map((entry, index) => (
                        <TableRow key={entry.id}>
                          <TableCell className="tabular-nums">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Input
                              id={`entry-text-table-${entry.id}`}
                              aria-label={`Text von Option ${index + 1}`}
                              value={entry.text}
                              onChange={(event) =>
                                updateEntry(entry.id, {
                                  text: event.currentTarget.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              id={`entry-weight-table-${entry.id}`}
                              aria-label={`Gewicht von ${getEntryDisplayText(entry, index)}`}
                              min={1}
                              type="number"
                              className="w-20 text-center tabular-nums"
                              value={weightDrafts[entry.id] ?? String(entry.weight)}
                              onBlur={() => clearWeightDraft(entry.id)}
                              onChange={(event) =>
                                handleWeightChange(
                                  entry.id,
                                  event.currentTarget.value,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              id={`entry-color-table-${entry.id}`}
                              type="color"
                              aria-label={`${getEntryDisplayText(entry, index)} Farbe waehlen`}
                              className="h-9 w-12 cursor-pointer rounded-md border p-1"
                              value={entry.color}
                              onChange={(event) =>
                                updateEntry(entry.id, {
                                  color: event.currentTarget.value,
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              aria-label={`${getEntryDisplayText(entry, index)} löschen`}
                              className="h-9 w-9 px-0"
                              size="icon"
                              variant="delete"
                              onClick={() => removeEntry(entry.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}

              <div className="rounded-md border border-dashed bg-background p-3">
                <Button
                  className="h-9 w-full"
                  variant="outline"
                  onClick={addEntry}
                >
                  <Plus className="size-4" />
                  Option hinzufügen
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="size-5 text-primary" />
                    Verlauf
                  </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={clearHistory}>
                  <RotateCcw className="size-4" />
                  Leeren
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.history.length === 0 ? (
                <EmptyState>
                  Noch keine Drehungen vorhanden.
                </EmptyState>
              ) : (
                <div className="grid gap-3">
                  {data.history.map((result, index) => (
                    <div key={result.id}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{result.text}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(result.createdAt).toLocaleString()}
                          </div>
                        </div>
                        <span
                          className={cn('size-4 shrink-0 rounded-full border')}
                          style={{ backgroundColor: result.color }}
                          aria-hidden="true"
                        />
                      </div>
                      {index < data.history.length - 1 && (
                        <Separator className="mt-3" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </AppPage>
  )
}
