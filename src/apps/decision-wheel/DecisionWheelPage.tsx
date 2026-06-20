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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { IftaInput } from '@/components/ui/ifta-field'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
    <div className="rounded-lg border bg-secondary p-4">
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
  const spinTimeoutRef = useRef<number | null>(null)
  const isSpinLockedRef = useRef(false)
  const visibleEntries = spinEntries ?? data.entries
  const canSpin = data.entries.length > 0 && !isSpinning

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

    const entriesBeforeSpin = data.entries
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

  return (
    <AppPage>
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <AppPageTitle Icon={CircleDot} title="Glücksrad" />
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{data.entries.length} Optionen</Badge>
        </div>
      </section>

      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle>Firebase-Fehler</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error.message}</p>
          </CardContent>
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
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Keine Optionen vorhanden. Füge eine Option hinzu oder setze die
                  Liste zurück.
                </div>
              ) : (
                data.entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_4.5rem_2.5rem_2.5rem] sm:items-end"
                  >
                    <div>
                      <IftaInput
                        id={`entry-text-${entry.id}`}
                        label="Text"
                        value={entry.text}
                        onChange={(event) =>
                          updateEntry(entry.id, { text: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <IftaInput
                        id={`entry-weight-${entry.id}`}
                        label="Gewicht"
                        min={1}
                        type="number"
                        value={entry.weight}
                        onChange={(event) =>
                          updateEntry(entry.id, {
                            weight: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`entry-color-${entry.id}`}>Farbe</Label>
                      <Input
                        id={`entry-color-${entry.id}`}
                        type="color"
                        aria-label={`${getEntryDisplayText(entry, index)} Farbe waehlen`}
                        className="h-9 cursor-pointer rounded-md border p-1 sm:h-11"
                        value={entry.color}
                        onChange={(event) =>
                          updateEntry(entry.id, {
                            color: event.currentTarget.value,
                          })
                        }
                      />
                    </div>
                    <Button
                      aria-label={`${getEntryDisplayText(entry, index)} löschen`}
                      className="self-end sm:h-11"
                      size="icon"
                      variant="delete"
                      onClick={() => removeEntry(entry.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              )}

              <div className="flex min-h-[5.125rem] items-center justify-center rounded-lg border border-dashed p-3">
                <Button
                  className="h-9 w-full"
                  variant="outline"
                  onClick={addEntry}
                >
                  <Plus className="size-4" />
                  Spieler hinzufügen
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
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Noch keine Drehungen vorhanden.
                </div>
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
